import { soundService } from '@/core/services/soundService.js'
import { ref } from 'vue'

class ToastService {
  toast = ref({
    isVisible: false,
    message: null,
    type: 'info',
    position: 'center', // YENİ: Varsayılan pozisyon
  })

  /**
   * Ekranda bir toast mesajı gösterir.
   * @param {string} message - Gösterilecek mesaj.
   * @param {string} type - Toast tipi (info, success, warning, error).
   * @param {number} duration - Milisaniye cinsinden gösterim süresi.
   * @param {object} options - Ekstra seçenekler. Örn: { position: 'top' }.
   */
  show(message, type = 'info', duration = 3000, options = {}) {
    this.toast.value = {
      isVisible: true,
      message,
      type,
      // YENİ: Gelen pozisyonu ayarla, gelmezse varsayılan olarak 'center' kullan.
      position: options.position || 'center',
    }

    if (type === 'warning') {
      soundService.playEffect('alert')
    }
    else if (type === 'error') {
      soundService.playEffect('lose')
    } if (type === 'success') {
      soundService.playEffect('success')
    }

    setTimeout(() => {
      this.hide()
    }, duration)
  }

  hide() {
    this.toast.value.isVisible = false
  }
}

export const toastService = new ToastService()
