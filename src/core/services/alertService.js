import { reactive } from 'vue'

class AlertService {
  alert = reactive({
    isVisible: false,
    title: null,
    message: null,
    confirmButtonText: null,
    cancelButtonText: null,
    onConfirm: () => {},
    onCancel: () => {},
    // For custom content
    customContent: null, // 'slot-content'
    // For slot components
    slotComponent: null,
    slotProps: {},
    size: null, // MODIFIED: To control modal width ('sm', 'lg', 'xl', '2xl')
    isPurchaseModal: false, // Satın alma modal'ı olup olmadığını belirtir
  })

  show(options) {
    return new Promise((resolve) => {
      this.reset()
      Object.assign(this.alert, {
        ...options,
        isVisible: true,
        onConfirm: () => {
          this.hide()
          resolve(true)
        },
        onCancel: () => {
          this.hide()
          resolve(false)
        },
      })
    })
  }

  showWithSlot(options) {
    return new Promise((resolve) => {
      this.reset()
      Object.assign(this.alert, {
        ...options,
        isVisible: true,
        customContent: 'slot-content',
        onConfirm: () => {
          this.hide()
          resolve(true)
        },
        onCancel: () => {
          this.hide()
          resolve(false)
        },
      })
    })
  }

  hide() {
    // Satın alma modal'ı ise ve satın alma devam ediyorsa kapatma
    if (this.alert.isPurchaseModal && this.isPurchaseInProgress()) {
      console.log('Purchase modal close prevented - purchase in progress')
      return
    }

    this.alert.isVisible = false
    // Delay reset to allow for closing animation
    setTimeout(() => this.reset(), 300)
  }

  // Satın alma durumunu kontrol eden yardımcı fonksiyon
  isPurchaseInProgress() {
    // soundService'den satın alma durumunu kontrol et
    try {
      const { soundService } = require('@/core/services/SoundService')
      return soundService.isPurchaseInProgress
    }
    catch {
      return false
    }
  }

  reset() {
    Object.assign(this.alert, {
      isVisible: false,
      title: null,
      message: null,
      confirmButtonText: null,
      cancelButtonText: null,
      customContent: null,
      slotComponent: null,
      slotProps: {},
      size: null,
      isPurchaseModal: false,
      onConfirm: () => {},
      onCancel: () => {},
    })
  }
}

export const alertService = new AlertService()
