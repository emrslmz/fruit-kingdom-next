import { mobileService } from '@/core/services/MobileService'
import { usePlayerStore } from '@/store/playerStore' // playerStore'u import ediyoruz
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * VibrationService, cihazda dokunsal geri bildirim (titreşim) sağlamak için kullanılır.
 * Herhangi bir titreşim işlemi yapmadan önce playerStore'dan kullanıcının
 * titreşim ayarının açık olup olmadığını kontrol eder.
 */
class VibrationService {
  constructor() {
    // Bu servis içindeki dahili durumu yönetmek için kullanılabilir, şimdilik her zaman true.
    this.enabled = true
  }

  /**
   * Belirtilen türe göre belirli bir süre titreşim gönderir.
   * @param {'match' | 'powerup' | 'success' | 'error' | 'warning' | 'click'} type
   */
  async vibrate(type = 'click') {
    // console.log('vibrate', mobileService.isNative)
    if (!mobileService.isNative)
      return

    const playerStore = usePlayerStore()
    // Titreşim göndermeden önce store'daki ayarı kontrol et!
    if (!playerStore.settings.vibration || !this.enabled)
      return

    const durations = {
      match: 5,
      powerup: 15,
      success: 20,
      error: 25,
      warning: 20,
      click: 10,
    }

    try {
      await Haptics.vibrate({ duration: durations[type] || 10 })
    }
    catch (error) {
      // Tarayıcıda veya haptics desteklemeyen bir cihazda çalışıyorsa hata vermemesi için.
      console.warn('Haptics not available:', error)
    }
  }

  /**
   * Önceden tanımlanmış stillerde darbe etkisi yaratır.
   * @param {'light' | 'medium' | 'heavy'} style
   */
  async impact(style = 'light') {
    const playerStore = usePlayerStore()
    // Darbe göndermeden önce store'daki ayarı kontrol et!
    if (!playerStore.settings.vibration || !this.enabled)
      return

    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[style]

    try {
      await Haptics.impact({ style: impactStyle })
    }
    catch (error) {
      console.warn('Haptics not available:', error)
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled
  }

  isEnabled() {
    return this.enabled
  }
}

// Singleton instance oluşturup export ediyoruz.
// Bu sayede uygulama boyunca tek bir VibrationService örneği kullanılır.
const vibrationService = new VibrationService()
export default vibrationService
