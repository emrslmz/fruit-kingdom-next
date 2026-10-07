import { Capacitor } from '@capacitor/core'

/**
 * Platforma (Android/iOS) özel AdMob reklam birim ID'lerini döndürür.
 * DİKKAT: Bunlar Google'ın sağladığı test ID'leridir.
 * Uygulamanızı yayınlamadan önce kendi AdMob ID'lerinizle değiştirmelisiniz.
 */
export function getAdIds() {
  const isAndroid = Capacitor.getPlatform() === 'android'
  const isIos = Capacitor.getPlatform() === 'ios'

  const adIds = {
    // Geçiş Reklamı (Interstitial) için Test ID'leri
    fruitKingdomInterstitial: isAndroid
      ? 'ca-app-pub-3304037628561493/1724999146' // Android Test ID
      : isIos
        ? 'ca-app-pub-3304037628561493/5344679953' // iOS Test ID
        : '',

    fruitKingdomBanner: isAndroid
      ? 'ca-app-pub-3304037628561493/7096745328' // Android Test ID
      : isIos
        ? 'ca-app-pub-3304037628561493/4107619900' // iOS Test ID
        : '',

    // Ödüllü Reklam (Rewarded) için Test ID'leri
    fruitKingdomRewarded: isAndroid
      ? 'ca-app-pub-3304037628561493/2684901259' // Android Test ID
      : isIos
        ? 'ca-app-pub-3304037628561493/3279654435' // iOS Test ID
        : '',
  }

  return adIds
}
