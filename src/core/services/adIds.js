import { Capacitor } from '@capacitor/core'

/**
 * AdMob reklam birimi ID'leri.
 *
 * PRODUCTION: senin AdMob hesabındaki gerçek birimler (ca-app-pub-3304037628561493).
 * TEST: Google'ın herkese açık örnek birimleri — geliştirirken gerçek reklam
 * göstermek / tıklamak AdMob hesabının "geçersiz trafik" gerekçesiyle
 * kısıtlanmasına yol açabileceği için `npm run dev` ve `VITE_ADMOB_TEST=true`
 * ile alınan build'lerde otomatik olarak test birimleri kullanılır.
 * Kaynak: https://developers.google.com/admob/android/test-ads
 *         https://developers.google.com/admob/ios/test-ads
 */
const PRODUCTION = {
  android: {
    banner: 'ca-app-pub-3304037628561493/7096745328',
    interstitial: 'ca-app-pub-3304037628561493/1724999146',
    rewarded: 'ca-app-pub-3304037628561493/2684901259',
  },
  ios: {
    banner: 'ca-app-pub-3304037628561493/4107619900',
    interstitial: 'ca-app-pub-3304037628561493/5344679953',
    rewarded: 'ca-app-pub-3304037628561493/3279654435',
  },
}

const GOOGLE_TEST = {
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741', // uyarlanabilir banner
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174', // uyarlanabilir banner
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
}

/** Test reklamları mı kullanılıyor (geliştirme build'i veya VITE_ADMOB_TEST=true). */
export function useTestAds() {
  return import.meta.env.DEV || import.meta.env.VITE_ADMOB_TEST === 'true'
}

/**
 * Platforma göre reklam birimi ID'leri.
 * @returns {{ banner: string, interstitial: string, rewarded: string }} web'de boş string'ler
 */
export function getAdIds() {
  const platform = Capacitor.getPlatform()
  const table = useTestAds() ? GOOGLE_TEST : PRODUCTION
  return table[platform] ?? { banner: '', interstitial: '', rewarded: '' }
}
