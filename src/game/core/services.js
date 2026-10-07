import Phaser from 'phaser'
import i18n from '@/i18n'
import { soundService } from '@/core/services/soundService'
import vibrationService from '@/core/services/VibrationService'
import { usePlayerStore } from '@/store/playerStore'
import { useShopStore } from '@/store/shopStore'

// Phaser sahneleri ile mevcut Pinia store'ları / servisler arasındaki köprü.
// Sahneler store'lara doğrudan değil bu yardımcılar üzerinden erişir.

export const bus = new Phaser.Events.EventEmitter()

export const player = () => usePlayerStore()
export const shop = () => useShopStore()

/** i18n çevirisi; anahtar yoksa `fallback` (verilmişse) döner. */
export function t(key, params, fallback) {
  const { t: translate, te } = i18n.global
  if (fallback !== undefined && !te(key) && !te(key, 'en'))
    return fallback
  return params ? translate(key, params) : translate(key)
}

export function locale() {
  return i18n.global.locale.value
}

export function isRTL() {
  return locale() === 'ar'
}

export function sfx(id) {
  try {
    soundService.playEffect(id)
  }
  catch {
    // ses dosyası yoksa sessizce geç
  }
}

export function haptic(type = 'click') {
  try {
    vibrationService.vibrate(type)
  }
  catch {
    // haptics desteklenmiyor
  }
}

/** Kısa sayı formatı: 1250 → 1.2K, 3400000 → 3.4M */
export function formatNumber(value) {
  const n = Math.floor(Number(value) || 0)
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (n >= 10_000)
    return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`
  return String(n)
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0)
    return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}:${String(s).padStart(2, '0')}`
}
