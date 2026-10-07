// Süreli oyun ve yıldız kuralları.
//
// Yıldız: toplanan meyvelerin oranına göre
//   tamamı → 3 yıldız, %80 → 2 yıldız, %40 → 1 yıldız (seviyeyi geçmek için yeterli).
//
// Süre: seviyedeki iş miktarına göre artar ve seviye ilerledikçe dokunuş başına
// düşen süre yavaşça azalır (oyun zorlaşır), ama meyve türü arttıkça (daha çok
// düşünmek gerekir) bir miktar ek süre verilir.
//
//   süre = 10 sn + (meyve sayısı + buz kırma vuruşu) × dokunuş başına süre × tür çarpanı
//   dokunuş başına süre = 1.6 sn (1. seviye) → her seviye 0.011 sn azalır → en az 1.0 sn
//   tür çarpanı = 1 + (tür sayısı − 7) × 0.035
//
// Örnek: 1. seviye 0:55, 5. → 1:20, 10. → 1:50, 20. → 3:05, 30. → 4:05, 50. → 5:10.

export const STAR_THRESHOLDS = [0.4, 0.8, 1]
export const EXTRA_TIME_SECONDS = 20
export const CONTINUE_COST = 50

/** Toplanan oran (0..1) → yıldız sayısı (0..3). */
export function starsFor(fraction) {
  if (fraction >= STAR_THRESHOLDS[2])
    return 3
  if (fraction >= STAR_THRESHOLDS[1])
    return 2
  if (fraction >= STAR_THRESHOLDS[0])
    return 1
  return 0
}

export function secondsPerTap(level) {
  return Math.max(1.0, 1.6 - 0.011 * (level - 1))
}

/**
 * Seviyenin süre sınırı (saniye, 5'in katına yuvarlanmış).
 * @param {{ fruits: number, iceHits: number, types: number }} stats
 * @param {number} level
 */
export function levelTimeLimit(stats, level) {
  const typeFactor = 1 + Math.max(0, stats.types - 7) * 0.035
  const raw = 10 + (stats.fruits + stats.iceHits) * secondsPerTap(level) * typeFactor
  return Math.ceil(raw / 5) * 5
}

/** 75000 ms → "1:15" */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
