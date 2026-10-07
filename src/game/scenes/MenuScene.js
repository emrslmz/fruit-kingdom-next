import { App } from '@capacitor/app'
import Phaser from 'phaser'
import { mobileService } from '@/core/services/MobileService'
import { purchaseService } from '@/core/services/PurchaseService'
import { toastService } from '@/core/services/ToastService'
import { queueBackground } from '../assets'
import { COLORS, SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { player, sfx, t } from '../core/services'
import { FRUIT_IDS } from '../logic/fruits'
import Button from '../ui/Button'
import CurrencyBadge from '../ui/CurrencyBadge'
import { drawPlank, drawVerticalFade, fillStar } from '../ui/draw'
import { bob, breathe, sunburst } from '../ui/effects'
import { fitText, makeText } from '../ui/text'

/** Ana menü: para birimleri, seviye madalyonu, maskot, Oyna butonu, alt menü. */
export default class MenuScene extends BaseScene {
  constructor() {
    super(SCENES.Menu)
  }

  preload() {
    queueBackground(this, 'bg_home')
  }

  build() {
    const L = this.L
    const p = player()
    this.addBackground('bg_home', { topShade: 0.45, bottomShade: 0.55, drift: true })
    this.addAmbientFruits()

    // --- Üst çubuk: enerji | altın + elmas -----------------------------------
    const headerBottom = this.buildHeader()

    // --- İkinci satır: ayarlar | kasalar + reklam kaldır ---------------------
    const rowY = headerBottom + 36
    const left = L.colX + 14
    const right = L.colX + L.colW - 14
    const settings = new Button(this, left + 26, rowY, {
      w: 52,
      h: 52,
      color: 'blue',
      icon: 'ic_cog',
      iconSize: 34,
      onClick: () => this.go(SCENES.Settings),
    })
    const cases = new Button(this, right - 26, rowY, {
      w: 52,
      h: 52,
      color: 'yellow',
      icon: 'case_gear',
      iconSize: 40,
      onClick: () => this.go(SCENES.Cases),
    })
    if (p.canOpenFreeCase())
      cases.setBadge('!', { color: 0xEE2747 })
    this.root.add([settings, cases])
    const topButtons = [settings, cases]
    if (!p.settings.adsRemoved) {
      const ads = new Button(this, right - 26 - 62, rowY, {
        w: 52,
        h: 52,
        color: 'red',
        icon: 'ic_remove_ads',
        iconSize: 38,
        onClick: () => this.removeAds(ads),
      })
      this.root.add(ads)
      topButtons.push(ads)
    }
    this.popIn(topButtons, { delay: 150 })

    // --- Alt menü -------------------------------------------------------------
    const navTop = this.buildBottomNav()

    // --- Orta: seviye madalyonu + maskot + Oyna ------------------------------
    const areaTop = rowY + 34
    const areaBottom = navTop - 10
    const areaH = areaBottom - areaTop
    const playY = areaBottom - Math.min(70, areaH * 0.16)
    const medalY = areaTop + (playY - 60 - areaTop) * 0.5
    const medalR = Phaser.Math.Clamp(Math.min(areaH * 0.2, L.colW * 0.24), 56, 96)
    this.buildMedal(L.cx, medalY, medalR, p.profile.gameLevel)

    const play = new Button(this, L.cx, playY, {
      w: Math.min(260, L.colW - 80),
      h: 76,
      color: 'green',
      label: t('play'),
      labelSize: 36,
      glyph: 'play',
      glyphSize: 30,
      pulse: true,
      onClick: () => this.startGame(),
    })
    this.root.add(play)
    this.popIn(play, { delay: 380 })
    this.playButton = play

    // maskot, butonun yanında
    if (this.textures.exists('mascot_happy')) {
      const mh = Phaser.Math.Clamp(areaH * 0.34, 110, 190)
      const mascot = this.add.image(0, playY - 34, 'mascot_happy').setOrigin(0.5, 1)
      mascot.setScale(mh / mascot.height)
      mascot.x = Math.min(L.cx + medalR + 40, L.colX + L.colW - mascot.displayWidth * 0.36)
      if (L.colW < 360)
        mascot.setVisible(false)
      this.root.addAt(mascot, this.root.getIndex(play))
      breathe(this, mascot, 0.035, 1300)
      this.popIn(mascot, { delay: 500, dy: 40 })
    }
  }

  buildHeader() {
    const L = this.L
    const p = player()
    const barH = 60
    const plankH = L.top + barH
    const bar = this.add.container(0, 0)
    const tile = this.add.tileSprite(0, 0, L.dw / 0.5, plankH / 0.5, 'bg_wood').setOrigin(0).setScale(0.5)
    const edge = this.add.graphics()
    edge.fillStyle(0x000000, 0.15).fillRect(0, 0, L.dw, plankH)
    edge.fillStyle(0x3B230D).fillRect(0, plankH - 4, L.dw, 4)
    edge.fillStyle(0x000000, 0.22).fillRect(0, plankH, L.dw, 5)
    bar.add([tile, edge])

    const cy = L.top + barH / 2 - 2
    const avail = L.colW - 28
    const bw = Math.min(124, (avail - 44) / 3)
    const left = L.colX + 14 + bw / 2 + 10
    const right = L.colX + L.colW - 14 - bw / 2
    this.currencyBadges = {
      energy: new CurrencyBadge(this, left, cy, { w: bw, h: 32, icon: 'ic_energy', value: p.energy.current, max: p.energy.max, plus: true, onClick: () => this.openPurchase('energy') }),
      diamond: new CurrencyBadge(this, right, cy, { w: bw, h: 32, icon: 'ic_diamond', value: p.currencies.diamonds, plus: true, onClick: () => this.openPurchase('diamond') }),
      gold: new CurrencyBadge(this, right - bw - 22, cy, { w: bw, h: 32, icon: 'ic_gold', value: p.currencies.gold, plus: true, onClick: () => this.openPurchase('gold') }),
    }
    bar.add(Object.values(this.currencyBadges))
    this.root.add(bar)
    if (!this.sceneData.instant) {
      bar.y = -plankH - 10
      this.tweens.add({ targets: bar, y: 0, duration: 450, ease: 'Back.easeOut' })
    }
    return plankH
  }

  buildBottomNav() {
    const L = this.L
    const p = player()
    const btn = Math.min(84, (L.colW - 60) / 3 - 12)
    const navH = btn + 40
    const top = L.bottom - navH - 6
    const nav = this.add.container(0, 0)

    const plank = this.add.graphics()
    const pw = Math.min(L.colW - 16, 440)
    drawPlank(plank, pw, navH - 8, { radius: 24 })
    plank.setPosition(L.cx, top + navH / 2)
    nav.add(plank)

    const items = [
      { key: 'inventory', icon: 'ic_backpack', scene: SCENES.Inventory, color: 'grey' },
      { key: 'shop', icon: 'ic_shop', scene: SCENES.Shop, color: 'grey' },
      { key: 'orders', icon: 'ic_order', scene: SCENES.Orders, color: 'grey' },
    ]
    const spacing = Math.min(pw / 3, btn + 40)
    items.forEach((item, i) => {
      const x = L.cx + (i - 1) * spacing
      const y = top + navH / 2 - 10
      const b = new Button(this, x, y, {
        w: btn,
        h: btn,
        shape: 'round',
        color: item.color,
        icon: item.icon,
        iconSize: btn * 0.62,
        onClick: () => this.go(item.scene),
      })
      const label = makeText(this, x, y + btn / 2 + 4, t(item.key), { size: 15, stroke: '#3b230d', strokeW: 4, shadowY: 2 })
      fitText(label, spacing - 6)
      nav.add([b, label])
      if (item.key === 'orders') {
        const ready = (p.orders || []).filter(o => o && this.canFulfill(o)).length
        if (ready)
          b.setBadge(ready, { color: 0x16BB77, stroke: '#04502f' })
      }
      this.popIn(b, { delay: 260 + i * 70, dy: 40 })
    })
    this.root.add(nav)
    return top
  }

  canFulfill(order) {
    const p = player()
    if (!order?.requirements || p.energy.current < p.orderEnergyCost)
      return false
    return Object.entries(order.requirements).every(([id, n]) => (p.inventory.fruitInventory[id] || 0) >= n)
  }

  buildMedal(x, y, r, level) {
    const c = this.add.container(x, y)
    this.root.add(c)
    sunburst(this, c, 0, 0, r * 2.1, { color: 0xFFF1A8, alpha: 0.22, rays: 16 })
    const glow = this.add.image(0, 0, 'fx_glow').setScale((r * 3.2) / 64).setTint(0xFFE27A).setAlpha(0.55)
    c.add(glow)

    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.3).fillCircle(0, 8, r)
    g.fillStyle(0x8A5A00).fillCircle(0, 0, r)
    g.fillStyle(0xDEA312).fillCircle(0, -2, r - 4)
    g.fillStyle(0xFFCC00).fillCircle(0, -2, r - 12)
    g.fillStyle(0xFFEA9C, 0.7).fillEllipse(0, -r * 0.42, r * 1.3, r * 0.6)
    g.fillStyle(0xFFFFFF, 0.75).fillEllipse(-r * 0.45, -r * 0.55, r * 0.3, r * 0.16)
    // küçük yıldızlar halkası
    g.fillStyle(0xFFF6CF)
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12
      fillStar(g, Math.cos(a) * (r - 7.5), -2 + Math.sin(a) * (r - 7.5), 5, 3.2, 1.4)
    }
    c.add(g)

    const label = makeText(this, 0, -r * 0.4, t('level'), { size: r * 0.26, stroke: '#8a5a00', strokeW: 4, shadowY: 2 })
    fitText(label, r * 1.4)
    const num = makeText(this, 0, r * 0.12, String(level), { size: r * 0.78, stroke: '#7a4a00', strokeW: 8, shadowY: 5 })
    fitText(num, r * 1.5)
    c.add([label, num])

    // seviye madalyonu altında kurdele: sıradaki ödül/ilerleme yok, sadece süs
    const ribbon = this.add.graphics()
    ribbon.fillStyle(0xCD0B2A).fillTriangle(-r * 0.55, r * 0.7, -r * 0.2, r * 0.7, -r * 0.5, r * 1.25)
    ribbon.fillStyle(0xCD0B2A).fillTriangle(r * 0.55, r * 0.7, r * 0.2, r * 0.7, r * 0.5, r * 1.25)
    c.addAt(ribbon, 2)

    bob(this, c, 7, 1700)
    if (!this.sceneData.instant) {
      c.setScale(0.3).setAlpha(0)
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 650, delay: 200, ease: 'Back.easeOut' })
    }
    this.medal = c
  }

  /** Arka planda yavaşça yükselen yarı saydam meyveler. */
  addAmbientFruits() {
    const L = this.L
    const emitter = this.add.particles(0, 0, 'game-atlas', {
      frame: FRUIT_IDS.map(id => `${id}.png`),
      x: { min: 0, max: L.W },
      y: L.H + 40,
      speedY: { min: -40 * L.s, max: -80 * L.s },
      speedX: { min: -10 * L.s, max: 10 * L.s },
      rotate: { min: -40, max: 40 },
      scale: { min: 0.08 * L.s, max: 0.16 * L.s },
      alpha: { start: 0.55, end: 0 },
      lifespan: 14000,
      frequency: 900,
      quantity: 1,
    })
    emitter.fastForward(9000)
    this.bgLayer.add(emitter)
    const shade = this.add.graphics()
    drawVerticalFade(shade, 0, L.H * 0.55, L.W, L.H * 0.45, COLORS.woodDark, 0, 0.35)
    this.bgLayer.add(shade)
  }

  startGame() {
    sfx('start_effect')
    this.go(SCENES.Game, { level: player().profile.gameLevel })
  }

  async removeAds(button) {
    button.setDisabled(true)
    const result = await purchaseService.purchase('revenue.remove_ads')
    if (!this.sys.isActive())
      return
    if (result.success) {
      player().removeAds()
      toastService.show(t('ads_removed'), 'success')
      this.tweens.add({ targets: button, scale: 0, alpha: 0, duration: 300, ease: 'Back.easeIn', onComplete: () => button.destroy() })
    }
    else {
      button.setDisabled(false)
      if (!result.cancelled)
        toastService.show(t('purchase_failed'), 'warning')
    }
  }

  onBack() {
    // Ana menüde geri tuşu: Android'de uygulamayı arka plana al.
    if (mobileService.isAndroid)
      App.minimizeApp().catch(() => {})
  }
}
