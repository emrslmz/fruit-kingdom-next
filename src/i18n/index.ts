import { createI18n } from 'vue-i18n'
import ar from './locales/ar'
import de from './locales/de'
import en from './locales/en'
import es from './locales/es'
import hi from './locales/hi'
import it from './locales/it'
import ja from './locales/ja'
import ko from './locales/ko'
import pt from './locales/pt'
import ru from './locales/ru'
import tr from './locales/tr'
import uk from './locales/uk'
import zh from './locales/zh'

// Supported languages
export type Locale = 'en' | 'tr' | 'es' | 'zh' | 'pt' | 'ar' | 'ja' | 'ko' | 'it' | 'de' | 'hi' | 'ru' | 'uk'

// arapça, çince, almanca, endonezce, italyanca, japonca, korece, portekizce, rusça, ispanyolca, türkçe'ye çevirr misin?
// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: 'en', // default locale
  fallbackLocale: 'en',
  messages: {
    en,
    tr,
    es,
    zh,
    pt,
    ar,
    ja,
    ko,
    it,
    de,
    hi,
    ru,
    uk,
  },
})

// Set locale without localStorage
export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
}

export default i18n
