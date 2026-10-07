import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'
import { usePlayerStore } from '@/store/playerStore'
import { getAdIds, useTestAds } from './adIds'

/**
 * AdMob — sadece banner reklam.
 *
 *  - Açılışta bir kez: GDPR/UMP onay formu (gerekiyorsa) → iOS takip izni (ATT)
 *    → AdMob.initialize.
 *  - Banner ekranın altında, uyarlanabilir boyutta. Gerçek yüksekliği (CSS px)
 *    `onBannerHeight` ile oyuna bildirilir; ekranlar tam o kadar yer ayırır,
 *    hiçbir butonun üstüne binmez.
 *  - Banner bir kez yüklenir; banner'sız ekranlara geçince gizlenir, geri
 *    dönünce yeniden yüklenmeden gösterilir.
 */

const state = {
  initPromise: null,
  initialized: false,
  bannerCreated: false,
  bannerVisible: false,
  bannerHeight: 0,
  bannerStatus: 'idle', // idle | loading | loaded | failed | hidden
  consentStatus: AdmobConsentStatus.UNKNOWN,
  consentFormAvailable: false,
}

const bannerListeners = new Set()

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
  const next = height > 0 ? Math.ceil(height) : 0
  if (next === state.bannerHeight && status === state.bannerStatus)
    return
  state.bannerHeight = next
  state.bannerStatus = status
  bannerListeners.forEach(fn => fn(next, status))
}

function registerListeners() {
  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
    if (state.bannerVisible && size?.height > 0)
      setBanner(size.height, 'loaded')
  })
  AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
    if (state.bannerVisible)
      setBanner(0, 'failed')
  })
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

/** Banner'ı gösterir (ilk seferde yükler, sonra gizlendiği yerden devam ettirir). */
async function showBanner() {
  if (!isNative() || adsRemoved() || state.bannerVisible)
    return state.bannerVisible
  if (!await initialize())
    return false
  const { banner } = getAdIds()
  if (!banner)
    return false
  state.bannerVisible = true
  try {
    if (state.bannerCreated) {
      setBanner(state.bannerHeight, state.bannerHeight ? 'loaded' : 'loading')
      await AdMob.resumeBanner()
    }
    else {
      setBanner(0, 'loading')
      await AdMob.showBanner({
        adId: banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: useTestAds(),
      })
      state.bannerCreated = true
    }
    return true
  }
  catch {
    state.bannerVisible = false
    setBanner(0, 'failed')
    return false
  }
}

/** Banner'ı gizler (yüklü kalır, `showBanner` ile anında geri gelir). */
async function hideBanner() {
  if (!isNative() || !state.bannerVisible)
    return true
  state.bannerVisible = false
  state.bannerStatus = 'hidden'
  try {
    await AdMob.hideBanner()
    return true
  }
  catch {
    return false
  }
}

/** Reklamlar satın alınarak kaldırılınca: banner tamamen kaldırılır. */
async function onAdsRemoved() {
  if (!isNative())
    return
  state.bannerVisible = false
  state.bannerCreated = false
  setBanner(0, 'idle')
  try {
    await AdMob.removeBanner()
  }
  catch {
    // zaten yok
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

/** GDPR bölgesinde onay tercihini yeniden açmak (Ayarlar → Reklam Gizliliği). */
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

export const admobService = {
  initialize,
  showBanner,
  hideBanner,
  onAdsRemoved,
  onBannerHeight,
  get bannerHeight() {
    return state.bannerHeight
  },
  get bannerStatus() {
    return state.bannerStatus
  },
  privacyOptionsAvailable,
  showPrivacyOptions,
}
