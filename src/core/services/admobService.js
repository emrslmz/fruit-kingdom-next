import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob'
import { mobileService } from '@/core/services/MobileService'
import { getAdIds } from './adIds'
import { soundService } from '@/core/services/SoundService'

let initialized = false

/**
 * AdMob'u mobil platformlarda başlatır.
 * @returns {Promise<boolean>} Başlatma başarılı olursa true döner.
 */
async function initialize() {
  if (!mobileService.isNative) {
    return false
  }
  if (initialized) {
    return true
  }

  try {
    // GELİŞTİRME AŞAMASINDA TEST MODUNDA BAŞLATILMALI
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: false,
    })
    initialized = true
    return true
  }
  catch {
    return false
  }
}

/**
 * Bir ödüllü video reklamı hazırlar ve gösterir.
 * @returns {Promise<boolean>} Kullanıcı ödülü kazanırsa true, aksi takdirde false döner.
 */
async function showRewardedAd() {
  return new Promise((resolve) => {
    let resolved = false
    const safeResolve = (value) => {
      if (resolved) return
      resolved = true
      resolve(value)
    }

    const logic = async () => {
      if (mobileService.isWeb) {
        soundService.stopMusic()
        setTimeout(() => {
          soundService.resumeAfterAd()
          safeResolve(true)
        }, 2000)
        return
      }

      const timeoutId = setTimeout(() => {
        cleanup()
        safeResolve(false)
      }, 30000)

      const isInitialized = await initialize()
      if (!isInitialized) {
        clearTimeout(timeoutId)
        safeResolve(false)
        return
      }

      let rewardGiven = false
      let rewardListener = null
      let dismissListener = null

      const cleanup = async () => {
        clearTimeout(timeoutId)
        rewardListener?.remove()
        dismissListener?.remove()
      }

      try {
        const adId = getAdIds().fruitKingdomRewarded
        if (!adId) {
          await cleanup()
          safeResolve(false)
          return
        }

        // Test ID'leri kullanıldığı için 'isTesting' true olmalıdır.
        const adOptions = { adId, isTesting: false }

        rewardListener = await AdMob.addListener('rewardedVideoAdRewarded', (reward) => {
          rewardGiven = true
        })

        dismissListener = await AdMob.addListener('rewardedVideoAdDismissed', () => {
          cleanup()
          // Reklam bittikten sonra müziği tekrar başlat
          soundService.resumeAfterAd()
          safeResolve(rewardGiven)
        })

        await AdMob.prepareRewardVideoAd(adOptions)
        soundService.stopMusic()
        await AdMob.showRewardVideoAd()
      }
      catch {
        cleanup()
        safeResolve(false)
      }
    }

    logic().catch((error) => {
      console.error('❗ showRewardedAd mantık hatası:', error)
      safeResolve(false)
    })
  })
}

/**
 * Bir geçiş reklamı hazırlar ve gösterir.
 * @returns {Promise<boolean>} Reklam başarıyla gösterilirse true döner.
 */
async function showInterstitialAd() {
  if (mobileService.isWeb) {
    soundService.stopMusic()
    setTimeout(() => {
      soundService.resumeAfterAd()
    }, 1000)
    return true
  }

  if (!await initialize()) {
    return false
  }

  const adId = getAdIds().fruitKingdomInterstitial
  if (!adId) {
    return false
  }

  return new Promise((resolve) => {
    (async () => {
      try {
        const listener = await AdMob.addListener('interstitialAdDismissed', () => {
          listener.remove()
          // Interstitial reklam bittikten sonra müziği tekrar başlat
          soundService.resumeAfterAd()
          resolve(true)
        })

        await AdMob.prepareInterstitial({ adId, isTesting: false })
        // Interstitial reklamdan önce müziği durdur
        soundService.stopMusic()
        await AdMob.showInterstitial()
      }
      catch {
        resolve(false) // Hata durumunda bile devam et
      }
    })()
  })
}

/**
 * Bir banner reklamı gösterir.
 * @returns {Promise<boolean>} Banner başarıyla gösterilirse true döner.
 */
async function showBannerAd() {
  if (mobileService.isWeb) {
    return true
  }

  if (!await initialize()) {
    return false
  }

  const adId = getAdIds().fruitKingdomBanner
  if (!adId) {
    return false
  }

  try {
    await AdMob.showBanner({
      adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: false, // GELİŞTİRME İÇİN TRUE OLMALI
      margin: 10,
    })
    return true
  }
  catch {
    return false
  }
}

/**
 * Gösterilmekte olan banner reklamını gizler.
 * @returns {Promise<boolean>} Banner başarıyla gizlenirse true döner.
 */
async function hideBannerAd() {
  if (mobileService.isWeb) {
    return true
  }

  try {
    await AdMob.hideBanner()
    return true
  }
  catch (error) {
    console.warn('Could not hide banner ad:', error.message)
    return false
  }
}

/**
 * Banner reklamını kaldırır ve hafızadan temizler.
 * @returns {Promise<boolean>} Banner başarıyla kaldırılırsa true döner.
 */
async function removeBannerAd() {
  if (mobileService.isWeb) {
    return true
  }

  try {
    await AdMob.removeBanner()
    return true
  }
  catch {
    return false
  }
}

export const admobService = {
  initialize,
  showRewardedAd,
  showInterstitialAd,
  showBannerAd,
  hideBannerAd,
  removeBannerAd,
}
