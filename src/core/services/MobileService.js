import i18n from '@/i18n'
import { useCoreStore } from '@/store/coreStore'
import { usePlayerStore } from '@/store/playerStore'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { StatusBar } from '@capacitor/status-bar'
// YENİ: Capacitor Native Settings import edildi
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings'
import { ref } from 'vue'
import { alertService } from './AlertService'
import notificationService from './NotificationService'
import { soundService } from '@/core/services/SoundService'
import { musicList, soundList } from '@/core/services/assets'
// import { useI18n } from 'vue-i18n'

class MobileService {
  constructor() {
    this.isOnline = ref(true)
    this.initialPermissionsShown = false
  }

  get isNative() {
    return Capacitor.isNativePlatform()
  }

  get isWeb() {
    return !Capacitor.isNativePlatform()
  }

  get isIOS() {
    return this.isNative && Capacitor.getPlatform() === 'ios'
  }

  get isAndroid() {
    return this.isNative && Capacitor.getPlatform() === 'android'
  }

  async boot(pinia) {
    await soundService.preload(soundList, musicList)

    if (this.isWeb) {
      this.initNetworkListeners()
      return
    }

    try {
      await StatusBar.hide()
      await ScreenOrientation.lock({ orientation: 'portrait-primary' })

      this.initNetworkListeners()

      notificationService.setPinia(pinia)
      const playerStore = usePlayerStore(pinia)
      if (playerStore.settings.notifications)
        await notificationService.rescheduleAllRecurring()

      notificationService.listenToAppState()
      this.initAppListeners(pinia)
    }
    catch {
    }
  }

  initAppListeners(pinia) {
    const coreStore = useCoreStore(pinia)
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        soundService.resumeMusic()
      }
      else {
        soundService.pauseMusic()
        coreStore.goToHome()
      }
    })
  }

  // GÜNCELLENDİ: Kod, çalışan uygulamadaki versiyona benzetildi ve hata durumu için kullanıcı uyarısı eklendi.
  async openAppSettings() {
    const { t } = i18n.global

    if (!this.isNative) {
      alertService.show({
        title: t('platform_error'),
        message: t('platform_error_message'),
        confirmButtonText: t('ok'),
      })
      return
    }

    try {
      await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
      })
    }
    catch {
      alertService.show({
        title: t('operation_failed'),
        message: t('app_settings_not_opened'),
        confirmButtonText: t('ok'),
      })
    }
  }

  async showInitialPermissionModals(pinia) {
    if (this.initialPermissionsShown) return
    this.initialPermissionsShown = true

    const playerStore = usePlayerStore(pinia)
    if (!playerStore.settings.notifications && !playerStore.settings.notificationPermissionAsked)
      await this.showNotificationPermissionModal(playerStore)

    if (this.isIOS)
      await this.showNSTransparencyModal()
  }

  async showNotificationPermissionModal(playerStore) {
    const { t } = i18n.global
    const confirmed = await alertService.show({
      title: t('notifications'),
      message: t('notification_permission_request'),
      icon: '/images/icons/announcement.png',
      confirmButtonText: t('yes_allow'),
    })
    playerStore.updateSettings({ notificationPermissionAsked: true })
    if (confirmed) {
      const permissionGranted = await notificationService.requestPermission()
      if (permissionGranted)
        await notificationService.rescheduleAllRecurring()
    }
  }

  async showNSTransparencyModal() {
    const { t } = i18n.global
    await alertService.show({
      title: t('transparency_notice'),
      message: t('transparency_notice_text'),
      icon: '/images/icons/info.png',
      confirmButtonText: t('understood'),
    })
  }

  async initNetworkListeners() {
    try {
      if (this.isNative) {
        const status = await Network.getStatus()
        this.isOnline.value = status.connected
        Network.addListener('networkStatusChange', (status) => {
          this.isOnline.value = status.connected
        })
      }
      else {
        this.isOnline.value = navigator.onLine
        window.addEventListener('online', () => (this.isOnline.value = true))
        window.addEventListener('offline', () => (this.isOnline.value = false))
      }
    }
    catch {
      this.isOnline.value = true
    }
  }
}

export const mobileService = new MobileService()
