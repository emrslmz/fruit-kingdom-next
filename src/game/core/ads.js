import { admobService } from '@/core/services/admobService'
import { toastService } from '@/core/services/ToastService'
import { SCENES } from '../config'
import { haptic, player, t } from './services'

/** Ödüllü reklam ödülleri. Elmas ödülü günlük `playerStore.ads.dailyAdLimit` ile sınırlı. */
export const AD_REWARDS = {
  diamonds: 10,
  energy: 20,
}

/** Bu cihazda ödüllü reklam butonları gösterilmeli mi. */
export function canWatchAds() {
  return admobService.rewardedAvailable()
}

/**
 * Ödüllü reklam izletir: yüklenirken "Reklam yükleniyor…" gösterir, izlenmezse
 * uyarı verir. Sonuna kadar izlendiyse `true` döner.
 * @param {Phaser.Scene} scene
 */
export async function watchRewardedAd(scene) {
  const overlay = scene.scene.get(SCENES.Overlay)
  let rewarded = false
  try {
    rewarded = await admobService.showRewarded({
      onLoading: loading => (loading ? overlay?.showLoading(t('ad_loading')) : overlay?.hideLoading()),
    })
  }
  finally {
    overlay?.hideLoading()
  }
  if (rewarded)
    haptic('success')
  else
    toastService.show(t('ads_watch_error'), 'warning')
  return rewarded
}

/** Seviye arası geçiş reklamı (sıklık kuralları admobService'te). */
export function levelEndInterstitial() {
  return admobService.maybeShowInterstitial()
}

/** "Bedava elmas": reklam izle → +10 elmas (günlük sınırlı). */
export async function claimFreeDiamonds(scene) {
  const p = player()
  if (p.adsLeftToday <= 0) {
    toastService.show(t('daily_ad_limit_reached'), 'warning')
    return false
  }
  if (!await watchRewardedAd(scene))
    return false
  p.recordAdWatch()
  p.addCurrency('diamonds', AD_REWARDS.diamonds)
  p.saveToStorage()
  toastService.show(t('earned_diamonds', { count: AD_REWARDS.diamonds }), 'success')
  return true
}

/** "Bedava enerji": reklam izle → +20 enerji. */
export async function claimFreeEnergy(scene) {
  const p = player()
  if (p.energy.current >= p.energy.max) {
    toastService.show(t('purchased_energy'), 'info')
    return false
  }
  if (!await watchRewardedAd(scene))
    return false
  p.addEnergy(AD_REWARDS.energy)
  toastService.show(`+${AD_REWARDS.energy} ${t('energy')}`, 'success')
  return true
}
