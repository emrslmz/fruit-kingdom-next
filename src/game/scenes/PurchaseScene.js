import { admobService } from '@/core/services/admobService'
import { purchaseService } from '@/core/services/PurchaseService'
import { toastService } from '@/core/services/ToastService'
import { packageKey, powerUpKey, queueBackground } from '../assets'
import { SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { formatNumber, haptic, player, sfx, shop, t } from '../core/services'
import Button from '../ui/Button'
import { drawCard, drawPill } from '../ui/draw'
import { bob, burst } from '../ui/effects'
import ScrollView from '../ui/ScrollView'
import { fitText, inkText, makeText } from '../ui/text'

const REWARDED_AD_DIAMONDS = 10

const CURRENCY = {
  energy: { titleKey: 'purchase_energy_title', tint: 0x2F7DC2, badges: ['gold', 'energy'] },
  gold: { titleKey: 'purchase_gold_title', tint: 0xD9A02C, badges: ['diamond', 'gold'] },
  diamond: { titleKey: 'purchase_diamond_title', tint: 0x7C3AED, badges: ['diamond'] },
}

/** Enerji / altın / elmas satın alma ekranı (gerçek para + takas + ödüllü reklam). */
export default class PurchaseScene extends BaseScene {
  constructor() {
    super(SCENES.Purchase)
  }

  preload() {
    queueBackground(this, 'bg_market')
  }

  getState() {
    return { currency: this.currency, from: this.from, fromData: this.fromData }
  }

  build(data) {
    const L = this.L
    this.busy = false
    this.currency = CURRENCY[data.currency] ? data.currency : 'diamond'
    this.from = data.from && data.from !== SCENES.Purchase ? data.from : SCENES.Menu
    this.fromData = data.fromData ?? {}
    const cfg = CURRENCY[this.currency]
    this.addBackground('bg_market', { tint: cfg.tint, tintAlpha: 0.45 })
    const top = this.addTopBar({ title: t(cfg.titleKey), currencies: cfg.badges, plus: false })

    this.listW = Math.min(L.colW - 20, 460)
    const listTop = top + 10
    this.sv = new ScrollView(this, this.root, L.cx - this.listW / 2, listTop, this.listW, L.bottom - listTop - 6)
    this.y = 8
    this.cards = []
    if (this.currency === 'diamond')
      this.buildDiamonds()
    else if (this.currency === 'gold')
      this.buildGold()
    else
      this.buildEnergy()
    this.sv.setContentHeight(this.y + 10)
    this.popIn(this.cards, { delay: 100, stagger: 60, dy: 40 })
  }

  onBack() {
    this.go(this.from, { ...this.fromData, instant: false })
  }

  // ---------------------------------------------------------------------------
  // Bölümler
  // ---------------------------------------------------------------------------
  buildDiamonds() {
    const p = player()
    const s = shop()

    // ödüllü reklam
    const left = p.adsLeftToday
    this.addCard({
      icon: 'ic_diamonds',
      title: t('watch_ad_free_diamonds'),
      subtitle: t('watch_ad_free_diamonds_desc', { count: REWARDED_AD_DIAMONDS, left }),
      color: 'blue',
      button: { label: t('watch'), color: left > 0 ? 'blue' : 'grey', icon: 'ic_play' },
      onBuy: btn => this.watchAd(btn),
    })

    s.products.specialOffers.forEach((offer) => {
      const pu = offer.content?.powerUps?.[0]
      this.addCard({
        icon: packageKey(offer.image),
        title: t(offer.nameKey),
        subtitle: `${formatNumber(offer.content?.diamonds ?? 0)} ${t('diamonds')}${pu ? ` + ${pu.quantity}x ${t(pu.id)}` : ''}`,
        extraIcons: pu ? [powerUpKey(pu.id)] : [],
        ribbon: t('offer'),
        highlight: true,
        button: { label: offer.price, color: 'yellow' },
        onBuy: btn => this.runPurchase(btn, () => s.buyDiamondPackage(offer.id)),
      })
    })

    s.products.diamondPackages.forEach((pkg) => {
      this.addCard({
        icon: packageKey(pkg.image),
        title: `${formatNumber(pkg.diamonds)} ${t('diamonds')}`,
        subtitle: t(pkg.nameKey),
        ribbon: pkg.bonusPercentage ? `+${pkg.bonusPercentage}%` : null,
        button: { label: pkg.price, color: 'green' },
        onBuy: btn => this.runPurchase(btn, () => s.buyDiamondPackage(pkg.id)),
      })
    })

    if (!p.settings.adsRemoved) {
      const util = s.products.utilities.find(u => u.id === 'remove_ads')
      if (util) {
        this.addCard({
          icon: 'ic_remove_ads',
          title: t(util.nameKey),
          subtitle: t(util.descriptionKey),
          button: { label: util.price, color: 'red' },
          onBuy: btn => this.runPurchase(btn, async () => {
            const result = await purchaseService.purchase(util.revenueCatId)
            if (result.success) {
              player().removeAds()
              return { success: true, message: 'ads_removed' }
            }
            return { success: false, message: result.cancelled ? null : 'purchase_failed' }
          }),
        })
      }
    }
  }

  buildGold() {
    const s = shop()
    s.products.goldPackages.forEach((pkg) => {
      this.addCard({
        icon: packageKey(pkg.image),
        title: `${formatNumber(pkg.gold)} ${t('gold')}`,
        subtitle: t(pkg.nameKey),
        button: { label: pkg.price, color: 'green' },
        onBuy: btn => this.runPurchase(btn, () => s.buyGoldPackage(pkg.id)),
      })
    })
    this.addHeader(t('exchange_with_diamonds'))
    s.exchangeOffers.diamondToGold.forEach((offer, i) => {
      this.addCard({
        icon: `gold${Math.min(3, i + 1)}`,
        title: `${formatNumber(offer.gold)} ${t('gold')}`,
        button: { label: String(offer.diamonds), color: 'yellow', icon: 'ic_diamond' },
        onBuy: () => this.exchange(() => s.buyGoldWithDiamonds(offer.id)),
      })
    })
  }

  buildEnergy() {
    const s = shop()
    const p = player()
    this.addHeader(t('exchange_with_gold'))
    s.exchangeOffers.goldToEnergy.forEach((offer) => {
      const full = offer.energy >= p.energy.max
      this.addCard({
        icon: 'ic_energy',
        title: full ? t('full_refill') : `+${offer.energy} ${t('energy')}`,
        subtitle: full ? `+${offer.energy} ${t('energy')}` : null,
        ribbon: full ? t('max') : null,
        button: { label: formatNumber(offer.gold), color: 'yellow', icon: 'ic_gold' },
        onBuy: () => this.exchange(() => s.buyEnergyWithGold(offer.id)),
      })
    })
  }

  addHeader(text) {
    const label = makeText(this, this.listW / 2, this.y + 20, text, { size: 22, stroke: '#3b230d', strokeW: 5 })
    fitText(label, this.listW - 20)
    this.sv.content.add(label)
    this.cards.push(label)
    this.y += 44
  }

  addCard(o) {
    const w = this.listW - 8
    const h = o.subtitle ? 104 : 92
    const c = this.add.container(this.listW / 2, this.y + h / 2)
    const g = this.add.graphics()
    if (o.highlight) {
      g.fillStyle(0xFFD84A, 0.9).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 22)
      drawCard(g, 0, 0, w, h, { radius: 20, fill: 0xFFF4C9, border: 0xB88320, shade: 0x8A5A00 })
    }
    else {
      drawCard(g, 0, 0, w, h, { radius: 20, fill: 0xFFFAE8 })
    }
    c.add(g)

    const ix = -w / 2 + 52
    const glow = this.add.image(ix, 0, 'fx_glow').setScale(100 / 64).setTint(0xFFF0B0).setAlpha(0.8)
    const icon = this.add.image(ix, 0, o.icon)
    icon.setScale(74 / Math.max(icon.width, icon.height))
    bob(this, icon, 3, 1300 + Math.random() * 500)
    c.add([glow, icon])
    ;(o.extraIcons || []).forEach((key, i) => {
      const extra = this.add.image(ix + 30 + i * 10, 26, key).setScale(36 / 256)
      c.add(extra)
    })

    const btnW = Math.min(132, w * 0.34)
    const textX = -w / 2 + 100
    const textW = w - 100 - btnW - 26
    const title = makeText(this, textX, o.subtitle ? -16 : 0, o.title, { size: 21, originX: 0, stroke: '#3b230d', strokeW: 4.5 })
    fitText(title, textW)
    c.add(title)
    if (o.subtitle) {
      const sub = inkText(this, textX, 18, o.subtitle, { size: 14, originX: 0, wrap: textW, color: '#6b4724' })
      fitText(sub, textW, 40)
      c.add(sub)
    }
    if (o.ribbon) {
      const rb = this.add.container(-w / 2 + 50, -h / 2 + 4)
      const rg = this.add.graphics()
      drawPill(rg, 0, 0, 76, 24, { fill: 0xEE2747, border: 0x871023 })
      const rt = makeText(this, 0, 0, o.ribbon, { size: 13, stroke: '#6b0a1a', strokeW: 3 })
      fitText(rt, 66)
      rb.add([rg, rt])
      rb.setAngle(-8)
      c.add(rb)
    }

    const btn = new Button(this, w / 2 - btnW / 2 - 14, 0, {
      w: btnW,
      h: 52,
      color: o.button.color,
      label: o.button.label,
      labelSize: 18,
      icon: o.button.icon,
      iconSize: 26,
      iconRight: !!o.button.icon && o.button.icon !== 'ic_play',
      onClick: () => o.onBuy(btn, c),
    })
    btn.baseLabel = o.button.label
    this.sv.register(btn)
    c.add(btn)

    this.sv.content.add(c)
    this.cards.push(c)
    this.y += h + 14
    return c
  }

  // ---------------------------------------------------------------------------
  // İşlemler
  // ---------------------------------------------------------------------------
  async runPurchase(btn, action) {
    if (this.busy)
      return
    this.busy = true
    btn.setDisabled(true).setLabel(t('processing'))
    try {
      const result = await action()
      if (!this.sys.isActive())
        return
      if (result?.message)
        toastService.show(t(result.message), result.success ? 'success' : 'warning')
      if (result?.success)
        this.celebrate(btn)
    }
    finally {
      this.busy = false
      if (this.sys.isActive())
        btn.setDisabled(false).setLabel(btn.baseLabel)
    }
  }

  exchange(action) {
    const result = action()
    toastService.show(t(result.message), result.success ? 'success' : 'warning')
    if (result.success)
      this.refreshCurrencies()
  }

  async watchAd(btn) {
    const p = player()
    if (p.adsLeftToday <= 0) {
      toastService.show(t('daily_ad_limit_reached'), 'warning')
      return
    }
    let rewarded = false
    await this.runPurchase(btn, async () => {
      rewarded = await admobService.showRewardedAd()
      if (!rewarded)
        return { success: false, message: 'ads_watch_error' }
      p.recordAdWatch()
      p.addCurrency('diamonds', REWARDED_AD_DIAMONDS)
      p.saveToStorage()
      toastService.show(t('earned_diamonds', { count: REWARDED_AD_DIAMONDS }), 'success')
      return { success: true }
    })
    // kalan hak sayısını güncellemek için ekranı yeniden kur
    if (rewarded && this.sys.isActive())
      this.time.delayedCall(900, () => this.scene.restart({ ...this.getState(), instant: true }))
  }

  celebrate(btn) {
    sfx('success_effect')
    haptic('success')
    const s = this.L.s
    const m = btn.getWorldTransformMatrix()
    burst(this, this.root, m.tx / s, m.ty / s, { texture: 'fx_star', tint: [0xFFE066, 0xFFFFFF], count: 14, speed: { min: 100, max: 260 }, scale: { start: 0.55, end: 0 }, gravityY: 200 })
    this.refreshCurrencies()
  }
}
