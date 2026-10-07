import { usePlayerStore } from '@/store/playerStore'
import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capacitor-community/native-audio'
import { App } from '@capacitor/app'

class SoundService {
  constructor() {
    // Web Audio API için temel bileşenler
    this.audioContext = null
    this.sounds = {} // Ses efektleri için AudioBuffer'ları saklar
    this.music = {} // Müzikler için AudioBuffer'ları saklar

    // Müzik kontrolü için değişkenler
    this.currentMusicId = null
    this.lastPlayedMusicId = null
    this.musicSource = null // O an çalan müziğin kaynağı (BufferSourceNode)
    this.musicGainNode = null // Müzik ses seviyesi kontrolü
    this.isInitialized = false

    // Native audio durumu
    this.isNativeAudioReady = false
    this.nativeAudioAssets = new Set()

    // Satın alma işlemi sırasında arkaplan geçişlerini engelleme
    this.isPurchaseInProgress = false
  }

  /**
   * Tarayıcı etkileşimi sonrası AudioContext'i başlatır.
   * Autoplay politikaları gereği bu genellikle bir kullanıcı eylemiyle tetiklenmelidir.
   */
  async init() {
    if (this.isInitialized || this.audioContext)
      return
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      // Cihazın medya kontrollerini göstermesini engelle
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
      }
      this.isInitialized = true
    }
    catch {
    }
  }

  /**
   * Native Audio preload işlemi
   */
  async preloadNative(soundList = [], musicList = []) {
    if (!Capacitor.isNativePlatform()) return

    const allAssets = [...soundList, ...musicList]

    for (const asset of allAssets) {
      try {
        const assetPath = asset.path.startsWith('/') ? asset.path.substring(1) : asset.path

        await NativeAudio.preload({
          assetId: asset.id,
          assetPath,
          audioChannelNum: asset.isMusic ? 2 : 1,
          isUrl: false,
        })

        this.nativeAudioAssets.add(asset.id)
      }
      catch {
        // console.error(`❌ Native ses yükleme hatası (${asset.id}):`, assetError)
      }
    }

    this.isNativeAudioReady = true
  }

  /**
   * Ses ve müzik dosyalarını önceden yükler ve AudioBuffer'a dönüştürür.
   */
  async preload(soundList = [], musicList = []) {
    // Native platform için native audio yükle
    if (Capacitor.isNativePlatform()) {
      await this.preloadNative(soundList, musicList)
    }

    // Web Audio API için yükleme (fallback veya web için)
    await this.init() // AudioContext'i başlat
    if (!this.audioContext) {
      return
    }

    // Helper function to fetch and decode audio
    const loadAudio = async (asset) => {
      try {
        const response = await fetch(asset.path)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
        return audioBuffer
      }
      catch {
        return null
      }
    }

    // Ses efektlerini yükle
    for (const sound of soundList) {
      this.sounds[sound.id] = await loadAudio(sound)
    }

    // Müzikleri yükle
    for (const music of musicList) {
      this.music[music.id] = await loadAudio(music)
    }
  }

  /**
   * Ayarları kontrol ederek bir ses efekti çalar.
   */
  playEffect(id) {
    const playerStore = usePlayerStore()

    if (!playerStore.settings.soundEnabled) {
      return
    }

    // Native platform için
    if (Capacitor.isNativePlatform() && this.isNativeAudioReady && this.nativeAudioAssets.has(id)) {
      try {
        NativeAudio.play({ assetId: id, time: 0 })
        return
      }
      catch {
      }
    }

    // Web Audio fallback veya web platform
    if (!this.audioContext) {
      return
    }

    const soundBuffer = this.sounds[id]

    if (soundBuffer) {
      try {
        const source = this.audioContext.createBufferSource()
        source.buffer = soundBuffer
        source.connect(this.audioContext.destination)
        source.start(0)
      }
      catch {
      }
    }
    else {
      // Efekt buffer bulunamadı
    }
  }

  /**
   * Ayarları kontrol ederek bir müziği çalar.
   */
  playMusic(id) {
    const playerStore = usePlayerStore()
    this.lastPlayedMusicId = id // Ne çalınması gerektiğini her zaman hatırla

    if (!playerStore.settings.soundEnabled || !playerStore.settings.musicEnabled) {
      this.stopMusic()
      return
    }

    if (this.currentMusicId === id) {
      return // Zaten aynı müzik çalıyorsa tekrar başlatma
    }

    this.stopMusic() // Önceki müziği durdur

    // Native platform için
    if (Capacitor.isNativePlatform() && this.isNativeAudioReady && this.nativeAudioAssets.has(id)) {
      try {
        NativeAudio.loop({ assetId: id })
        this.currentMusicId = id
        return
      }
      catch {
        // Fallback to web audio
      }
    }

    // Web Audio fallback veya web platform
    if (!this.audioContext) {
      return
    }

    const musicBuffer = this.music[id]

    if (musicBuffer) {
      try {
        this.musicSource = this.audioContext.createBufferSource()
        this.musicSource.buffer = musicBuffer
        this.musicSource.loop = true

        this.musicGainNode = this.audioContext.createGain()
        this.musicGainNode.gain.value = 0.7 // Ses seviyesi

        this.musicSource.connect(this.musicGainNode)
        this.musicGainNode.connect(this.audioContext.destination)

        this.musicSource.start(0)
        this.currentMusicId = id
      }
      catch {
      }
    }
    else {
      // Müzik buffer bulunamadı
    }
  }

  /**
   * Çalan müziği tamamen durdurur.
   */
  stopMusic() {
    // Native müzik durdur
    if (Capacitor.isNativePlatform() && this.currentMusicId && this.nativeAudioAssets.has(this.currentMusicId)) {
      try {
        NativeAudio.stop({ assetId: this.currentMusicId })
      }
      catch {
        // Native müzik durdurma hatası
      }
    }

    // Web Audio müzik durdur
    if (this.musicSource) {
      try {
        this.musicSource.stop(0)
        this.musicSource.disconnect()
      }
      catch {
        // Hata oluşursa görmezden gel, kaynak zaten durmuş olabilir
      }
      this.musicSource = null
      this.musicGainNode = null
    }

    this.currentMusicId = null
  }

  /**
   * Ana ses ayarı (soundEnabled) değiştiğinde müziği yönetir.
   */
  toggleMasterSound(enabled) {
    const playerStore = usePlayerStore()
    if (enabled && playerStore.settings.musicEnabled) {
      if (this.lastPlayedMusicId && !this.currentMusicId) {
        this.playMusic(this.lastPlayedMusicId)
      }
    }
    else {
      this.stopMusic()
    }
  }

  /**
   * Müzik ayarı (musicEnabled) değiştiğinde müziği yönetir.
   */
  toggleMusicSetting(enabled) {
    const playerStore = usePlayerStore()
    if (playerStore.settings.soundEnabled) {
      if (enabled) {
        if (this.lastPlayedMusicId && !this.currentMusicId) {
          this.playMusic(this.lastPlayedMusicId)
        }
      }
      else {
        this.stopMusic()
      }
    }
  }

  /**
   * Bu metod sadece web için gereklidir, native'de otomatik ses çalma sorunu yoktur.
   */
  async handleFirstUserInteraction() {
    if (!Capacitor.isNativePlatform()) {
      await this.init()
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
    }
  }

  /**
   * Ayar değişikliklerini yönetir - basit yaklaşım
   */
  handleSettingsChange(settings) {
    // Eğer herhangi bir ses ayarı kapalıysa, müziği durdur
    if (!settings.soundEnabled || !settings.musicEnabled) {
      this.stopMusic()
      return
    }

    // Her iki ayar da açıksa ve müzik çalmıyorsa, son müziği çal
    if (settings.soundEnabled && settings.musicEnabled && !this.currentMusicId && this.lastPlayedMusicId) {
      // Küçük gecikme ile müziği başlat
      setTimeout(() => {
        this.playMusic(this.lastPlayedMusicId)
      }, 300)
    }
    else {
      // Müzik başlatılmayacak - zaten çalıyor veya ayarlar uygun değil
    }
  }

  /**
   * İlk müziği başlat - güçlendirilmiş yaklaşım
   */
  startInitialMusic() {
    const playerStore = usePlayerStore()

    // Son çalınan müziği hatırla
    this.lastPlayedMusicId = 'lofi_music'

    // Ayarlar açıksa müziği çal
    if (playerStore.settings.soundEnabled && playerStore.settings.musicEnabled) {
      // Biraz daha uzun gecikme ile müziği başlat
      setTimeout(() => {
        this.playMusic('lofi_music')
      }, 1000)
    }
    else {
      // Müzik ayarları kapalı
    }
  }

  /**
   * Satın alma işlemi durumunu ayarla
   */
  setPurchaseInProgress(inProgress) {
    this.isPurchaseInProgress = inProgress
  }

  /**
   * App lifecycle events - arkaplana geçip açıldığında uygulamayı yeniden başlat
   * ANCAK satın alma işlemi sırasında restart'ı engelle
   */
  setupAppLifecycleListeners() {
    if (!Capacitor.isNativePlatform()) return

    let wasInBackground = false

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && wasInBackground) {
        // Satın alma işlemi devam ediyorsa restart yapma
        if (this.isPurchaseInProgress) {
          wasInBackground = false
          return
        }
        // Arkaplandan geri döndüğünde uygulamayı yeniden başlat
        window.location.reload()
      }
      else if (!isActive) {
        // Arkaplana geçtiğinde flag'i işaretle
        wasInBackground = true
        if (this.isPurchaseInProgress) {
          console.log('App went to background during purchase - this is expected')
        }
      }
    })
  }

  /**
   * Reklam sonrası müziği tekrar başlat
   */
  resumeAfterAd() {
    const playerStore = usePlayerStore()

    if (playerStore.settings.soundEnabled
      && playerStore.settings.musicEnabled
      && this.lastPlayedMusicId) {
      // Reklam sonrası biraz daha uzun gecikme
      setTimeout(() => {
        this.playMusic(this.lastPlayedMusicId)
      }, 1000)
    }
    else {
      // Reklam sonrası müzik başlatılmayacak (ayarlar kapalı)
    }
  }

  /**
   * Modal context'inde ses efektlerini güçlendir
   */
  playEffectForced(id) {
    // Native platform için
    if (Capacitor.isNativePlatform() && this.isNativeAudioReady && this.nativeAudioAssets.has(id)) {
      try {
        NativeAudio.play({ assetId: id, time: 0 })
        return
      }
      catch {
        // console.error(`❌ Native forced efekt '${id}' çalma hatası:`, e)
        // Fallback to web audio
      }
    }

    // Web Audio fallback veya web platform - ayar kontrolü yapmadan çal
    if (!this.audioContext) {
      return
    }

    const soundBuffer = this.sounds[id]
    if (soundBuffer) {
      try {
        const source = this.audioContext.createBufferSource()
        source.buffer = soundBuffer
        source.connect(this.audioContext.destination)
        source.start(0)
      }
      catch {
        // console.error(`❌ '${id}' forced ses efekti oynatılırken hata:`, e)
      }
    }
  }
}

export const soundService = new SoundService()
