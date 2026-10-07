import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'
import { soundService } from '@/core/services/soundService'
import { usePlayerStore } from '@/store/playerStore'
import { getAdIds, useTestAds } from './adIds'

/**
 * AdMob reklam servisi.
 *
 *  - Açılışta bir kez: GDPR/UMP onay formu (gerekiyorsa) → iOS ATT izni → initialize.
 *  - Geçiş (interstitial) ve ödüllü (rewarded) reklamlar önceden yüklenir, böylece
 *    istenince anında açılır; gösterildikten sonra bir sonraki hemen yüklenir.
 *  - Banner'ın gerçek yüksekliği (CSS px) `onBannerHeight` ile oyuna bildirilir,
 *    oyun alanı tam o kadar yer ayırır.
 *  - Geçiş reklamı sıklığı `maybeShowInterstitial` içindeki kurallarla sınırlanır.
 *  - Web'de reklam yoktur; geliştirme modunda (npm run dev) oyunun çizdiği
 *    sahte bir reklam ekranı gösterilir (`setWebPresenter`), akışlar tarayıcıda
 *    test edilebilsin diye.
 */

const BANNER_MARGIN = 0
const REWARDED_LOAD_TIMEOUT = 8000
const RETRY_DELAY = 30000

// Geçiş reklamı kuralları
const INTERSTITIAL_EVERY_N_LEVEL_ENDS = 3 // her 3 seviye sonunda bir
const INTERSTITIAL_MIN_GAP_MS = 90 * 1000 // iki geçiş reklamı arası en az 90 sn
const INTERSTITIAL_SESSION_GRACE_MS = 60 * 1000 // açılıştan sonraki ilk 1 dk reklam yok
const INTERSTITIAL_MIN_LEVEL = 4 // ilk 3 seviye reklamsız

const state = {
  initPromise: null,
  initialized: false,
  interstitialReady: false,
  interstitialLoading: false,
  rewardedReady: false,
  rewardedLoad: null,
  pendingInterstitial: null,
  pendingRewarded: null,
  bannerRequested: false,
  bannerHeight: 0,
  bannerStatus: 'idle', // idle | loading | loaded | failed
  lastInterstitialAt: 0,
  sessionStart: Date.now(),
  levelEndsSinceInterstitial: 0,
  consentStatus: AdmobConsentStatus.UNKNOWN,
  consentFormAvailable: false,
}

const bannerListeners = new Set()
let webPresenter = null

const isNative = () => Capacitor.isNativePlatform()

function adsRemoved() {
  try {
    return !!usePlayerStore().settings.adsRemoved
  }
  catch {
    return false
  }
}

function setBanner(height, status) {
  const next = height > 0 ? Math.ceil(height + BANNER_MARGIN) : 0
  if (next === state.bannerHeight && status === state.bannerStatus)
    return
  state.bannerHeight = next
  state.bannerStatus = status
  bannerListeners.forEach(fn => fn(next, status))
}

function registerListeners() {
  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
    if (state.bannerRequested && size?.height > 0)
      setBanner(size.height, 'loaded')
  })
  AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
    if (state.bannerRequested)
      setBanner(0, 'failed')
  })

  AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => finishInterstitial(true))
  AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => finishInterstitial(false))

  AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    if (state.pendingRewarded)
      state.pendingRewarded.rewarded = true
  })
  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finishRewarded())
  AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finishRewarded())
}

/** Onay formu + ATT + AdMob.initialize. Birden çok çağrılabilir, tek kez çalışır. */
async function initialize() {
  if (!isNative())
    return false
  if (state.initPromise)
    return state.initPromise

  state.initPromise = (async () => {
    try {
      try {
        const info = await AdMob.requestConsentInfo()
        state.consentStatus = info.status
        state.consentFormAvailable = !!info.isConsentFormAvailable
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          const after = await AdMob.showConsentForm()
          state.consentStatus = after.status
        }
      }
      catch {
        // onay bilgisi alınamadı (ağ yok vb.) — kişiselleştirilmemiş reklamla devam
      }

      if (Capacitor.getPlatform() === 'ios') {
        try {
          const { status } = await AdMob.trackingAuthorizationStatus()
          if (status === 'notDetermined')
            await AdMob.requestTrackingAuthorization()
        }
        catch {
          // ATT desteklenmiyor
        }
      }

      await AdMob.initialize({ initializeForTesting: useTestAds() })
      registerListeners()
      state.initialized = true
      if (!adsRemoved())
        preloadInterstitial()
      preloadRewarded()
      return true
    }
    catch (error) {
      console.warn('[AdMob] başlatılamadı:', error)
      state.initPromise = null
      return false
    }
  })()
  return state.initPromise
}

// -----------------------------------------------------------------------------
// Banner
// -----------------------------------------------------------------------------
async function showBanner() {
  if (!isNative() || adsRemoved())
    return false
  if (state.bannerRequested)
    return true
  if (!await initialize())
    return false
  const { banner } = getAdIds()
  if (!banner)
    return false
  try {
    state.bannerRequested = true
    setBanner(state.bannerHeight, state.bannerHeight ? 'loaded' : 'loading')
    await AdMob.showBanner({
      adId: banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: BANNER_MARGIN,
      isTesting: useTestAds(),
    })
    return true
  }
  catch {
    state.bannerRequested = false
    setBanner(0, 'failed')
    return false
  }
}

async function hideBanner() {
  if (!isNative() || !state.bannerRequested)
    return true
  state.bannerRequested = false
  setBanner(0, 'idle')
  try {
    await AdMob.removeBanner()
    return true
  }
  catch {
    return false
  }
}

/**
 * Banner yüksekliği (CSS px) veya durumu değiştiğinde `(height, status)` ile çağrılır.
 * Aboneliği iptal eden fonksiyon döner.
 */
function onBannerHeight(listener) {
  bannerListeners.add(listener)
  return () => bannerListeners.delete(listener)
}

// -----------------------------------------------------------------------------
// Geçiş reklamı
// -----------------------------------------------------------------------------
function preloadInterstitial() {
  if (!state.initialized || state.interstitialReady || state.interstitialLoading)
    return
  const { interstitial } = getAdIds()
  if (!interstitial)
    return
  state.interstitialLoading = true
  AdMob.prepareInterstitial({ adId: interstitial, isTesting: useTestAds() })
    .then(() => { state.interstitialReady = true })
    .catch(() => setTimeout(preloadInterstitial, RETRY_DELAY))
    .finally(() => { state.interstitialLoading = false })
}

function finishInterstitial(shown) {
  const resolve = state.pendingInterstitial
  state.pendingInterstitial = null
  state.interstitialReady = false
  soundService.resumeAfterAd()
  preloadInterstitial()
  resolve?.(shown)
}

async function showInterstitial() {
  if (adsRemoved())
    return false
  if (!isNative())
    return webPresenter ? webPresenter('interstitial') : false
  if (!state.interstitialReady) {
    preloadInterstitial()
    return false
  }
  soundService.stopMusic()
  return new Promise((resolve) => {
    state.pendingInterstitial = resolve
    setTimeout(() => state.pendingInterstitial === resolve && finishInterstitial(false), 120000)
    AdMob.showInterstitial().catch(() => finishInterstitial(false))
  })
}

/**
 * Seviye sonu gibi doğal bir arada çağrılır; sıklık kurallarına uyuyorsa
 * geçiş reklamını gösterir. Reklam kapanınca (veya gösterilmezse) resolve olur.
 */
async function maybeShowInterstitial() {
  if (adsRemoved())
    return false
  state.levelEndsSinceInterstitial++
  const now = Date.now()
  let level = 1
  try {
    level = usePlayerStore().profile.gameLevel
  }
  catch {}
  const allowed = level >= INTERSTITIAL_MIN_LEVEL
    && state.levelEndsSinceInterstitial >= INTERSTITIAL_EVERY_N_LEVEL_ENDS
    && now - state.lastInterstitialAt >= INTERSTITIAL_MIN_GAP_MS
    && now - state.sessionStart >= INTERSTITIAL_SESSION_GRACE_MS
  if (!allowed)
    return false
  const shown = await showInterstitial()
  if (shown) {
    state.levelEndsSinceInterstitial = 0
    state.lastInterstitialAt = Date.now()
  }
  return shown
}

// -----------------------------------------------------------------------------
// Ödüllü reklam
// -----------------------------------------------------------------------------
function preloadRewarded() {
  if (!state.initialized)
    return Promise.resolve(false)
  if (state.rewardedReady)
    return Promise.resolve(true)
  if (state.rewardedLoad)
    return state.rewardedLoad
  const { rewarded } = getAdIds()
  if (!rewarded)
    return Promise.resolve(false)
  state.rewardedLoad = AdMob.prepareRewardVideoAd({ adId: rewarded, isTesting: useTestAds() })
    .then(() => {
      state.rewardedReady = true
      return true
    })
    .catch(() => {
      setTimeout(preloadRewarded, RETRY_DELAY)
      return false
    })
    .finally(() => { state.rewardedLoad = null })
  return state.rewardedLoad
}

function finishRewarded() {
  const pending = state.pendingRewarded
  state.pendingRewarded = null
  state.rewardedReady = false
  soundService.resumeAfterAd()
  preloadRewarded()
  pending?.resolve(!!pending.rewarded)
}

/** Ödüllü reklam bu platformda gösterilebilir mi (butonları göstermek için). */
function rewardedAvailable() {
  return isNative() || !!webPresenter
}

/**
 * Ödüllü reklam gösterir. Kullanıcı reklamı sonuna kadar izlerse `true` döner.
 * @param {{ onLoading?: (loading: boolean) => void }} [o]
 */
async function showRewarded(o = {}) {
  if (!isNative())
    return webPresenter ? webPresenter('rewarded') : false
  if (!await initialize())
    return false
  if (!state.rewardedReady) {
    o.onLoading?.(true)
    const loaded = await Promise.race([
      preloadRewarded(),
      new Promise(resolve => setTimeout(() => resolve(false), REWARDED_LOAD_TIMEOUT)),
    ])
    o.onLoading?.(false)
    if (!loaded)
      return false
  }
  soundService.stopMusic()
  return new Promise((resolve) => {
    const pending = { resolve, rewarded: false }
    state.pendingRewarded = pending
    setTimeout(() => state.pendingRewarded === pending && finishRewarded(), 180000)
    // Not: showRewardVideoAd sadece ödül kazanılınca resolve olur; kapanışı
    // Dismissed olayından yakalıyoruz.
    AdMob.showRewardVideoAd().catch(() => finishRewarded())
  })
}

// -----------------------------------------------------------------------------
// Gizlilik (UMP) — Ayarlar'dan onay tercihini yeniden açmak için
// -----------------------------------------------------------------------------
function privacyOptionsAvailable() {
  return isNative() && state.consentFormAvailable && state.consentStatus !== AdmobConsentStatus.NOT_REQUIRED
}

async function showPrivacyOptions() {
  if (!privacyOptionsAvailable())
    return false
  try {
    const info = await AdMob.showConsentForm()
    state.consentStatus = info.status
    return true
  }
  catch {
    return false
  }
}

/** Reklamlar satın alınarak kaldırılınca çağrılır. */
async function onAdsRemoved() {
  await hideBanner()
}

/** Web/geliştirme için sahte reklam gösterici: (kind) => Promise<boolean>. */
function setWebPresenter(presenter) {
  webPresenter = presenter
}

export const admobService = {
  initialize,
  showBanner,
  hideBanner,
  onBannerHeight,
  get bannerHeight() {
    return state.bannerHeight
  },
  get bannerStatus() {
    return state.bannerStatus
  },
  maybeShowInterstitial,
  showInterstitial,
  showRewarded,
  rewardedAvailable,
  privacyOptionsAvailable,
  showPrivacyOptions,
  onAdsRemoved,
  setWebPresenter,
  // eski isimler (geriye dönük uyumluluk)
  showRewardedAd: showRewarded,
  showInterstitialAd: showInterstitial,
  showBannerAd: showBanner,
  hideBannerAd: hideBanner,
  removeBannerAd: hideBanner,
}
