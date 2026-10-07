import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LOG_LEVEL, Purchases } from '@revenuecat/purchases-capacitor'
import { mobileService } from './MobileService'

// Aynı RevenueCat projesi/anahtarları — daha önce PurchaseDiamondModal.vue'da
// kullanılıyordu (silinen ekranla birlikte kaldırıldı, bkz. IMPORTANT_SYSTEMS.md §1).
const REVENUECAT_API_KEYS = {
  ios: 'appl_GSFFATfjhFWZhcBWEloQOyQHWZP',
  android: 'goog_ySnpupcujSQgSWYZBjSKruGNUmw',
}

class PurchaseService {
  configured = false

  async configure() {
    if (this.configured || !mobileService.isNative)
      return

    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
    const apiKey = Capacitor.getPlatform() === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android
    const deviceInfo = await Device.getId()
    await Purchases.configure({ apiKey, appUserID: deviceInfo.identifier })
    this.configured = true
  }

  /**
   * Verilen RevenueCat offering ID'sindeki ilk paketi satın alır.
   * Web önizlemede (RevenueCat native plugin'i çalışmadığından) satın almayı
   * simüle eder — böylece akış tarayıcıda da test edilebilir.
   * @param {string} revenueCatId
   * @returns {Promise<{success: boolean, message?: string, cancelled?: boolean}>}
   */
  async purchase(revenueCatId) {
    if (mobileService.isWeb) {
      await new Promise(resolve => setTimeout(resolve, 800))
      return { success: true }
    }

    try {
      await this.configure()
      const offerings = await Purchases.getOfferings()
      const offering = offerings.all[revenueCatId]

      if (!offering || offering.availablePackages.length === 0)
        return { success: false, message: 'product_not_found' }

      await Purchases.purchasePackage({ aPackage: offering.availablePackages[0] })
      return { success: true }
    }
    catch (error) {
      if (error?.userCancelled)
        return { success: false, cancelled: true }

      console.error('[PurchaseService] Satın alma hatası:', error)
      return { success: false, message: 'purchase_failed' }
    }
  }
}

export const purchaseService = new PurchaseService()
