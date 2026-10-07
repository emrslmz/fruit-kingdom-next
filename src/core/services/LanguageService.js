import { setLocale } from '@/i18n'

class LanguageService {
  constructor() {
    this.supportedLanguages = [
      { code: 'en', label: 'English', flag: '/assets/flags/enflag.svg' },
      { code: 'tr', label: 'Türkçe', flag: '/assets/flags/trflag.svg' },
      { code: 'de', label: 'Deutsch', flag: '/assets/flags/deflag.svg' },
      { code: 'es', label: 'Español', flag: '/assets/flags/esflag.svg' },
      { code: 'it', label: 'Italiano', flag: '/assets/flags/itflag.svg' },
      { code: 'pt', label: 'Português', flag: '/assets/flags/ptflag.svg' },
      { code: 'ru', label: 'Русский', flag: '/assets/flags/ruflag.svg' },
      { code: 'zh', label: '中文', flag: '/assets/flags/zhflag.svg' },
      { code: 'ja', label: '日本語', flag: '/assets/flags/jaflag.svg' },
      { code: 'ko', label: '한국어', flag: '/assets/flags/koflag.svg' },
      { code: 'ar', label: 'العربية', flag: '/assets/flags/arflag.svg' },
      { code: 'hi', label: 'हिन्दी', flag: '/assets/flags/hiflag.svg' },
      { code: 'uk', label: 'Українська', flag: '/assets/flags/ukflag.svg' },
    ]
    this.playerStore = null
  }

  /**
   * Initialize language service with playerStore
   */
  async initializeWithPlayerStore(playerStore) {
    this.playerStore = playerStore

    // Get current language from playerStore
    const playerLanguage = playerStore.settings.language || 'en'

    // Initialize i18n with playerStore language
    this.changeLanguage(playerLanguage)
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages
  }

  /**
   * Get language info by code
   */
  getLanguageInfo(code) {
    return this.supportedLanguages.find(lang => lang.code === code) || this.supportedLanguages[0]
  }

  /**
   * Change language and sync with playerStore
   */
  changeLanguage(languageCode) {
    const language = this.getLanguageInfo(languageCode)
    if (language) {
      // Update i18n
      setLocale(languageCode)

      // Update playerStore if available
      if (this.playerStore) {
        this.playerStore.updateSettings({ language: languageCode })
      }

      return true
    }
    return false
  }

  /**
   * Get current language from playerStore
   */
  getCurrentLanguage() {
    const currentLanguage = this.playerStore?.settings?.language || 'en'
    return this.getLanguageInfo(currentLanguage)
  }

  /**
   * Get next language in the list (for toggle)
   */
  getNextLanguage(currentCode) {
    const currentIndex = this.supportedLanguages.findIndex(lang => lang.code === currentCode)
    const nextIndex = (currentIndex + 1) % this.supportedLanguages.length
    return this.supportedLanguages[nextIndex]
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(code) {
    return this.supportedLanguages.some(lang => lang.code === code)
  }

  /**
   * Get language name by code
   */
  getLanguageName(code) {
    const lang = this.getLanguageInfo(code)
    return lang ? lang.label : 'Unknown'
  }
}

export const languageService = new LanguageService()
export default languageService
