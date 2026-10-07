import i18n from '@/i18n'
import { usePlayerStore } from '@/store/playerStore'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { ref, watch } from 'vue'

class NotificationService {
  constructor() {
    this.playerStore = null
    this.pinia = null // Pinia örneğini tutmak için
    this.storeWatcherSetup = false
    this.languageWatcherSetup = false // Dil izleyicisinin bir kez kurulmasını sağlamak için flag
    this.permissionDenied = ref(false)

    this.notificationIds = {
      COMEBACK: 1,
      TEST_NOTIFICATION: 999, // Test bildirimi için ID
      INACTIVITY_3H: 101,
      INACTIVITY_24H: 102,
      INACTIVITY_3D: 103,
      INACTIVITY_1W: 104,
      // YENİ: Görev bildirimleri için başlangıç ID'si
      NEW_TASKS_AVAILABLE_BASE_ID: 200,
      // YENİ: Gruplanmış bildirimler için başlangıç ID'si
      GROUPED_TASKS_AVAILABLE_BASE_ID: 300,
    }

    this.inactivityReminders = [
      { id: this.notificationIds.INACTIVITY_3H, hours: 3, body: 'Notifications.inactivity3h' },
      { id: this.notificationIds.INACTIVITY_24H, hours: 24, body: 'Notifications.inactivity24h' },
      { id: this.notificationIds.INACTIVITY_3D, hours: 72, body: 'Notifications.inactivity3d' },
      { id: this.notificationIds.INACTIVITY_1W, hours: 168, body: 'Notifications.inactivity1w' },
    ]
  }

  // Pinia örneğini servise enjekte etmek için metod
  setPinia(pinia) {
    this.pinia = pinia
    // YENİ: Dil değişikliğini dinlemeyi burada başlatıyoruz.
    if (!this.languageWatcherSetup) {
      this.listenForLanguageChange()
    }
  }

  // Pinia örneğini kullanarak store'a erişim
  getPlayerStore() {
    if (!this.playerStore) {
      if (!this.pinia) {
        return null
      }
      this.playerStore = usePlayerStore(this.pinia)
      if (!this.storeWatcherSetup) {
        this.setupSettingsWatcher()
      }
    }
    return this.playerStore
  }

  // YENİ: Dil değişikliğini dinlemek için metod
  listenForLanguageChange() {
    watch(
      () => i18n.global.locale.value, // i18n locale'indeki değişiklikleri izle
      (newLocale, oldLocale) => {
        if (newLocale !== oldLocale) {
          // Sadece bildirimler aktifse yeniden zamanla
          if (this.getPlayerStore()?.settings.notifications) {
            this.rescheduleAllRecurring()
          }
        }
      },
    )
    this.languageWatcherSetup = true // Flag'i ayarla
  }

  setupSettingsWatcher() {
    // getPlayerStore() null dönebileceği için ?. operatörü ekleniyor
    watch(
      () => this.getPlayerStore()?.settings.notifications,
      (isEnabled) => {
        if (Capacitor.isNativePlatform()) {
          if (isEnabled) {
            this.rescheduleAllRecurring()
          }
          else {
            this.cancelAllNotifications()
          }
        }
      },
    )
    this.storeWatcherSetup = true
  }

  // YENİ: İzin durumunu kullanıcıya sormadan kontrol eder.
  async checkPermissionStatus() {
    if (!Capacitor.isNativePlatform()) return 'granted' // Web için izin verilmiş varsay
    try {
      const result = await LocalNotifications.checkPermissions()
      return result.display // 'granted', 'denied', ya da 'prompt' döner
    }
    catch {
      // console.error('Bildirim izin durumu kontrol edilirken hata:', error)
      return 'denied' // Hata durumunda reddedilmiş varsay
    }
  }

  async requestPermission() {
    if (!Capacitor.isNativePlatform())
      return true

    try {
      const result = await LocalNotifications.requestPermissions()
      const granted = result.display === 'granted'
      this.getPlayerStore()?.updateSettings({ notifications: granted })
      this.permissionDenied.value = result.display === 'denied'
      return granted
    }
    catch {
      // console.error('Bildirim izni istenirken hata:', error)
      this.getPlayerStore()?.updateSettings({ notifications: false })
      return false
    }
  }

  /**
   * İlk açılışta notification izni iste
   */
  async requestInitialPermission() {
    // Sadece native platformlarda ve henüz izin durumu belirsizse iste
    if (!Capacitor.isNativePlatform()) return

    try {
      const status = await this.checkPermissionStatus()

      // Eğer daha önce hiç sorulmamışsa (prompt durumu) otomatik iste
      if (status === 'prompt') {
        const granted = await this.requestPermission()

        if (granted) {
          // İzin verildiyse playerStore'u güncelle ve listener'ı başlat
          this.getPlayerStore()?.updateSettings({ notifications: true })
          this.listenToAppState()
        }
      }
      else if (status === 'granted') {
        // Zaten izin varsa playerStore'u güncelle ve listener'ı başlat
        this.getPlayerStore()?.updateSettings({ notifications: true })
        this.listenToAppState()
      }
    }
    catch {
      // console.error('İlk açılış notification izni hatası:', error)
    }
  }

  async rescheduleAllRecurring() {
    if (!Capacitor.isNativePlatform() || !this.getPlayerStore()?.settings.notifications) {
      return
    }
    await this.cancelAllNotifications()
    await this.scheduleInactivityReminders()
  }

  async scheduleInactivityReminders() {
    if (!this.getPlayerStore()?.settings.notifications)
      return

    try {
      const notificationsToSchedule = this.inactivityReminders.map((reminder) => {
        const fireTime = new Date(Date.now() + reminder.hours * 60 * 60 * 1000)
        return {
          id: reminder.id,
          title: 'Fruit Orders',
          body: i18n.global.t(reminder.body), // Dil değişikliğinden sonra doğru çeviriyi alacak
          schedule: { at: fireTime },
          smallIcon: 'res://ic_stat_icon_sample',
          largeIcon: 'res://icon',
        }
      })
      await LocalNotifications.schedule({ notifications: notificationsToSchedule })
      // console.log('Hareketsizlik bildirimleri zamanlandı.')
    }
    catch {
      // console.error('Aktivite dışı kalma bildirimleri kurulurken hata:', error)
    }
  }

  async scheduleComebackNotification() {
    if (!this.getPlayerStore()?.settings.notifications)
      return
    try {
      const fireTime = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 saat sonra
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.notificationIds.COMEBACK,
            title: 'Fruit Orders',
            body: i18n.global.t('Notifications.comeback'),
            schedule: { at: fireTime },
            smallIcon: 'res://ic_stat_icon_sample',
            largeIcon: 'res://icon',
          },
        ],
      })
      // console.log('Geri dön bildirimi zamanlandı.')
    }
    catch {
      // console.error('Geri dön bildirimi kurulurken hata:', error)
    }
  }

  // YENİ: Belirli bir görev yuvası için bildirim zamanlar
  async scheduleNewTaskNotification(fireTime, slotIndex) {
    if (!this.getPlayerStore()?.settings.notifications || new Date(fireTime) < new Date()) {
      return
    }

    try {
      const notificationId = this.notificationIds.NEW_TASKS_AVAILABLE_BASE_ID + slotIndex
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Fruit Orders',
            body: i18n.global.t('Notifications.newTasksAvailable'),
            schedule: { at: new Date(fireTime) },
            smallIcon: 'res://ic_stat_icon_sample',
            largeIcon: 'res://icon',
          },
        ],
      })
      // console.log(`${slotIndex} nolu yuva için yeni görev bildirimi zamanlandı.`)
    }
    catch {
      // console.error('Yeni görev bildirimi zamanlanırken hata:', error)
    }
  }

  // YENİ: Gruplandırılmış görevler için bildirim zamanlar
  async scheduleGroupedTasksNotification(fireTime, count, groupIndex) {
    if (!this.getPlayerStore()?.settings.notifications || new Date(fireTime) < new Date()) {
      return
    }

    try {
      // Çakışmayı önlemek için grup index'ini kullanarak benzersiz bir ID oluşturun
      const notificationId = this.notificationIds.GROUPED_TASKS_AVAILABLE_BASE_ID + groupIndex
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Fruit Orders',
            // Not: 'Notifications.multipleNewTasksAvailable' için çeviri eklemeniz gerekecek.
            // Örnek: 'Yeni {count} siparişin hazır!'
            body: i18n.global.t('Notifications.multipleNewTasksAvailable', { count }),
            schedule: { at: new Date(fireTime) },
            smallIcon: 'res://ic_stat_icon_sample',
            largeIcon: 'res://icon',
          },
        ],
      })
      // console.log(`${count} görev için gruplanmış bildirim, ${new Date(fireTime)} zamanına ayarlandı.`)
    }
    catch {
      // console.error('Gruplanmış görev bildirimi zamanlanırken hata:', error)
    }
  }

  // GÜNCELLENDİ: Beklemedeki görev bildirimlerini gruplayarak zamanlar
  async scheduleAllPendingTaskNotifications() {
    const store = this.getPlayerStore()
    if (!store?.settings.notifications) return

    const now = Date.now()
    // 1. Bekleyen tüm görevleri al ve bitiş zamanına göre sırala
    const pendingOrders = store.orders
      .map((order, index) => ({ ...order, originalIndex: index })) // Orijinal index'i koru
      .filter(order => order && order.cooldownUntil && order.cooldownUntil > now)
      .sort((a, b) => a.cooldownUntil - b.cooldownUntil)

    if (pendingOrders.length === 0) {
      // console.log('Zamanlanacak bekleyen görev bildirimi yok.')
      return
    }

    // 2. Bildirimleri grupla
    // Bu değeri değiştirerek gruplama aralığını ayarlayabilirsiniz (milisaniye cinsinden).
    const GROUPING_WINDOW = 10 * 60 * 1000 // 10 dakika
    const notificationGroups = []
    let currentGroup = []

    for (const order of pendingOrders) {
      if (currentGroup.length === 0) {
        // Yeni bir grup başlat
        currentGroup.push(order)
      }
      else {
        const groupStartTime = currentGroup[0].cooldownUntil
        // Görevin bitiş zamanı, grubun ilk görevinin bitiş zamanından 10 dakika içindeyse, aynı gruba ekle
        if (order.cooldownUntil - groupStartTime <= GROUPING_WINDOW) {
          currentGroup.push(order)
        }
        else {
          // Mevcut grubu sonlandır ve yeni bir grup başlat
          notificationGroups.push(currentGroup)
          currentGroup = [order]
        }
      }
    }
    // Son kalan grubu da ekle
    if (currentGroup.length > 0) {
      notificationGroups.push(currentGroup)
    }

    // 3. Her grup için bildirimleri zamanla
    // Önce mevcut tüm görev bildirimlerini iptal et
    await this.cancelNewTaskNotifications()
    // console.log('Mevcut görev bildirimleri temizlendi, yenileri zamanlanıyor...')

    notificationGroups.forEach((group, index) => {
      const firstOrderInGroup = group[0]
      const fireTime = firstOrderInGroup.cooldownUntil

      if (group.length === 1) {
        // Grup tek bir görev içeriyorsa, tekli bildirim gönder
        // console.log(`Tekli bildirim zamanlanıyor: Slot ${firstOrderInGroup.originalIndex}, Zaman: ${new Date(fireTime)}`)
        this.scheduleNewTaskNotification(fireTime, firstOrderInGroup.originalIndex)
      }
      else {
        // Grup birden fazla görev içeriyorsa, gruplanmış bildirim gönder
        // console.log(`${group.length} görev için gruplanmış bildirim zamanlanıyor, Zaman: ${new Date(fireTime)}`)
        this.scheduleGroupedTasksNotification(fireTime, group.length, index)
      }
    })
  }

  async cancelComebackNotification() {
    try {
      await this.cancelNotificationById(this.notificationIds.COMEBACK)
    }
    catch {
      // console.error('Geri dön bildirimi iptal edilirken hata:', error)
    }
  }

  // YENİ: Beklemedeki tüm görev bildirimlerini iptal eder
  async cancelNewTaskNotifications() {
    try {
      const pending = await LocalNotifications.getPending()
      // ID'si 200 (NEW_TASKS_AVAILABLE_BASE_ID) ve üstü olan tüm bildirimleri iptal et
      const taskNotifications = pending.notifications.filter(
        n => n.id >= this.notificationIds.NEW_TASKS_AVAILABLE_BASE_ID,
      )

      if (taskNotifications.length > 0) {
        await LocalNotifications.cancel({ notifications: taskNotifications })
        // console.log('Tüm bekleyen görev bildirimleri iptal edildi.')
      }
    }
    catch {
      // console.error('Görev bildirimleri iptal edilirken hata:', error)
    }
  }

  async cancelAllNotifications() {
    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
        // console.log('Tüm bekleyen bildirimler iptal edildi.')
      }
    }
    catch {
      // console.error('Bildirimler iptal edilirken hata:', error)
    }
  }

  listenToAppState() {
    if (!Capacitor.isNativePlatform())
      return
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        // Oyuna geri dönüldüğünde
        await this.cancelComebackNotification()
        await this.cancelInactivityReminders()
        await this.cancelNewTaskNotifications()
      }
      else {
        // Oyundan çıkıldığında
        await this.scheduleComebackNotification()
        await this.scheduleInactivityReminders()
        await this.scheduleAllPendingTaskNotifications()
      }
    })
  }

  async cancelInactivityReminders() {
    const inactivityIds = this.inactivityReminders.map(r => ({ id: r.id }))
    try {
      await LocalNotifications.cancel({ notifications: inactivityIds })
    }
    catch {
      // console.error('Hareketsizlik bildirimleri iptal edilirken hata:', e)
    }
  }

  async cancelNotificationById(notificationId) {
    try {
      const pending = await LocalNotifications.getPending()
      const notification = pending.notifications.find(n => n.id === notificationId)
      if (notification) {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] })
      }
    }
    catch {
      // console.error(`${notificationId} ID'li bildirim iptal edilirken hata:`, e)
    }
  }

  // --- TEST FONKSİYONLARI ---

  async scheduleTestNotification() {
    if (!this.getPlayerStore()?.settings.notifications) {
      return
    }

    try {
      await this.cancelTestNotification()
      const fireTime = new Date(Date.now() + 10000) // 10 saniye sonra
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.notificationIds.TEST_NOTIFICATION,
            title: 'Fruit Orders - Test',
            body: i18n.global.t('Notifications.testNotification'),
            schedule: { at: fireTime },
            smallIcon: 'res://ic_stat_icon_sample',
            largeIcon: 'res://icon',
          },
        ],
      })
    }
    catch {
    }
  }

  async cancelTestNotification() {
    try {
      await this.cancelNotificationById(this.notificationIds.TEST_NOTIFICATION)
    }
    catch {
    }
  }
}

const notificationService = new NotificationService()
export default notificationService
