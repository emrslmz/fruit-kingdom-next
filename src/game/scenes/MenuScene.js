import { App } from '@capacitor/app'
import Phaser from 'phaser'
import { admobService } from '@/core/services/admobService'
import { mobileService } from '@/core/services/MobileService'
import { purchaseService } from '@/core/services/PurchaseService'
import { toastService } from '@/core/services/ToastService'
import { queueBackground } from '../assets'
import { BTN, SCENES } from '../config'
import { setupBannerDock } from '../core/banner'
import BaseScene from '../core/BaseScene'
import { player, sfx, t } from '../core/services'
import Button from '../ui/Button'
import CurrencyBadge from '../ui/CurrencyBadge'
import { drawPill, drawVerticalFade, fillStar } from '../ui/draw'
import { breathe, burst, flyArc, shake, sunburst } from '../ui/effects'
import { fitText, makeText } from '../ui/text'

const ROAD_BEHIND = 2 // mevcut seviyenin altında gösterilen tamamlanmış seviye sayısı
const ROAD_AHEAD = 5 // üstünde gösterilen kilitli seviye sayısı

/**
 * Ana ekran: orman yolunda ilerleyen seviye haritası.
 * Tamamlanan seviyeler yeşil, mevcut seviye altın ve maskotlu, sonrakiler kilitli.
 * Bir seviye kazanılıp menüye dönülünce maskot yeni seviyeye zıplar.
 */
export default class MenuScene extends BaseScene {
  constructor() {
    super(SCENES.Menu)
  }

  preload() {
    queueBackground(this, 'bg_level')
  }

  build() {
    const p = player()
    this.addBackground('bg_level', { topShade: 0.4, bottomShade: 0.5 })
    this.addFallingLeaves()

    this.bannerH = setupBannerDock(this)
    const headerBottom = this.buildHeader()
    const playTop = this.buildPlayButton()
    this.buildRails(headerBottom)

    const levelUpFrom = this.registry.get('levelUpFrom')
    this.registry.remove('levelUpFrom')
    const hop = !this.sceneData.instant && levelUpFrom === p.profile.gameLevel - 1
    this.buildRoad(headerBottom + 8, playTop, p.profile.gameLevel, hop)
  }

  // ---------------------------------------------------------------------------
  // Üst çubuk: enerji | altın + elmas
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Yan butonlar
  //   sol: Ayarlar, toplam yıldız, Envanter, Market
  //   sağ: Reklamları Kaldır, Siparişler, Kasalar
  // ---------------------------------------------------------------------------
  buildRails(top) {
    const L = this.L
    const p = player()
    const size = 52
    const leftX = L.colX + 14 + size / 2
    const rightX = L.colX + L.colW - 14 - size / 2
    const y0 = top + 16 + size / 2
    const row = y => y0 + 140 + y * 84 // Envanter/Market ve Siparişler/Kasalar satırları
    const items = []

    items.push(this.railButton(leftX, y0, { color: 'blue', icon: 'ic_cog', label: t('settings'), onClick: () => this.go(SCENES.Settings) }))

    // toplam yıldız
    const stars = this.add.container(leftX + 8, y0 + size + 26)
    const sg = this.add.graphics()
    drawPill(sg, 0, 0, 74, 32, { fill: 0x1D1006, alpha: 0.75, border: 0x1D1006 })
    const icon = this.add.image(-26, -1, 'ic_star').setScale(40 / 256)
    const count = makeText(this, 10, 0, String(p.totalStars), { size: 18, color: '#ffd84a', stroke: '#1d1006', strokeW: 4 })
    fitText(count, 40)
    stars.add([sg, icon, count])
    this.root.add(stars)
    this.starCounter = count
    items.push(stars)

    if (!p.settings.adsRemoved) {
      const btn = this.railButton(rightX, y0, {
        color: 'red',
        icon: 'ic_remove_ads',
        label: t('remove_ads'),
        onClick: () => this.removeAds(btn),
      })
      items.push(btn)
    }

    const nav = [
      { key: 'inventory', icon: 'ic_backpack', scene: SCENES.Inventory, x: leftX, y: row(0) },
      { key: 'shop', icon: 'ic_shop', scene: SCENES.Shop, x: leftX, y: row(1) },
      { key: 'orders', icon: 'ic_order', scene: SCENES.Orders, x: rightX, y: row(0) },
      { key: 'cases', icon: 'case_gear', scene: SCENES.Cases, x: rightX, y: row(1) },
    ]
    nav.forEach((item) => {
      const b = this.railButton(item.x, item.y, { color: 'cream', icon: item.icon, label: t(item.key), onClick: () => this.go(item.scene) })
      if (item.key === 'orders') {
        const ready = (p.orders || []).filter(o => o && this.canFulfill(o)).length
        if (ready)
          b.setBadge(ready, { color: 0x16BB77, stroke: '#04502f', size: 22 })
      }
      if (item.key === 'cases' && p.canOpenFreeCase())
        b.setBadge('!', { color: 0xEE2747, size: 22 })
      items.push(b)
    })
    this.popIn(items, { delay: 200, stagger: 50 })
  }

  railButton(x, y, o) {
    const size = 52
    const b = new Button(this, x, y, { w: size, h: size, shape: 'round', color: o.color, icon: o.icon, iconSize: size * 0.66, onClick: o.onClick })
    const label = makeText(this, 0, size / 2 + 10, o.label, { size: 12, stroke: '#1d1006', strokeW: 3.5, shadowY: 1 })
    fitText(label, 74)
    const bg = this.add.graphics()
    drawPill(bg, 0, size / 2 + 10, Math.max(40, label.displayWidth + 14), 20, { fill: 0x1D1006, alpha: 0.7, border: 0x1D1006, borderAlpha: 0.4, gloss: false })
    b.add([bg, label])
    this.root.add(b)
    return b
  }

  // ---------------------------------------------------------------------------
  // Alt: tek, sade OYNA butonu
  // ---------------------------------------------------------------------------
  buildPlayButton() {
    const L = this.L
    const playH = 70
    const playW = Math.min(300, L.colW - 60)
    const playY = L.bottom - this.bannerH - 14 - playH / 2
    const play = new Button(this, L.cx, playY, {
      w: playW,
      h: playH,
      color: 'yellow',
      label: t('play'),
      labelSize: 32,
      glyph: 'play',
      glyphSize: 26,
      onClick: () => this.startGame(),
    })
    this.root.add(play)
    this.playButton = play

    if (!this.sceneData.instant) {
      const y = play.y
      play.y = y + playH + 40
      this.tweens.add({ targets: play, y, duration: 480, delay: 150, ease: 'Back.easeOut' })
    }
    return playY - playH / 2 - 8
  }

  canFulfill(order) {
    const p = player()
    if (!order?.requirements || p.energy.current < p.orderEnergyCost)
      return false
    return Object.entries(order.requirements).every(([id, n]) => (p.inventory.fruitInventory[id] || 0) >= n)
  }

  // ---------------------------------------------------------------------------
  // Seviye yolu
  // ---------------------------------------------------------------------------
  buildRoad(areaTop, areaBottom, current, hop) {
    const L = this.L
    const areaH = areaBottom - areaTop
    const dy = Phaser.Math.Clamp(areaH / 5.3, 78, 118)
    const curY = areaTop + areaH * 0.6
    const amp = Math.min(L.colW * 0.2, 86)
    const posOf = level => ({
      x: L.cx + Math.sin(level * 0.95) * amp,
      y: curY - (level - current) * dy,
    })

    const road = this.add.container(0, 0)
    this.root.addAt(road, 0)
    const maskG = this.make.graphics({ add: false })
    maskG.fillStyle(0xFFFFFF).fillRect(0, areaTop * L.s, L.W, (areaH + 12) * L.s)
    road.setMask(maskG.createGeometryMask())
    this.events.once('shutdown', () => maskG.destroy())

    // alt kenara sığmayan (yarım kesilecek) tamamlanmış düğümler çizilmez; patika
    // oraya doğru soluklaşarak devam eder
    const fits = lv => posOf(lv).y + 27 + 12 <= areaBottom + 12
    let first = Math.max(1, current - ROAD_BEHIND)
    while (first < current && !fits(first))
      first++
    const trailFirst = Math.max(1, first - 1)
    const last = current + ROAD_AHEAD
    const fadeFrom = areaBottom - 50

    // patika: düğümler arasından geçen noktalı iz
    const trail = this.add.graphics()
    road.add(trail)
    for (let lv = trailFirst; lv < last; lv++) {
      const a = posOf(lv)
      const b = posOf(lv + 1)
      const done = lv < current
      const curve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(a.x, a.y),
        new Phaser.Math.Vector2(a.x, a.y - dy * 0.45),
        new Phaser.Math.Vector2(b.x, b.y + dy * 0.45),
        new Phaser.Math.Vector2(b.x, b.y),
      )
      const pts = curve.getSpacedPoints(Math.max(4, Math.round(curve.getLength() / 13)))
      pts.forEach((pt, i) => {
        if (i === 0 || i === pts.length - 1)
          return
        const fade = Phaser.Math.Clamp(1 - (pt.y - fadeFrom) / 60, 0, 1)
        if (fade <= 0)
          return
        trail.fillStyle(0x3B230D, 0.35 * fade).fillCircle(pt.x, pt.y + 1.5, 4.2)
        trail.fillStyle(done ? 0xFFF3C4 : 0xD9C7A3, (done ? 0.95 : 0.7) * fade).fillCircle(pt.x, pt.y, 3.6)
      })
    }

    this.nodes = {}
    for (let lv = last; lv >= first; lv--) {
      const pos = posOf(lv)
      const state = lv < current ? 'done' : (lv === current && !hop ? 'current' : 'locked')
      const node = this.createNode(lv, state)
      node.setPosition(pos.x, pos.y)
      road.add(node)
      this.nodes[lv] = node
    }

    // maskot mevcut seviyenin yanında (yolun ortaya bakan tarafında)
    const sideOf = lv => (Math.sin(lv * 0.95) > 0 ? -1 : 1)
    const place = lv => ({ x: posOf(lv).x + sideOf(lv) * 68, y: posOf(lv).y + 32 })
    const mascot = this.add.image(0, 0, 'mascot_happy').setOrigin(0.5, 1)
    mascot.setScale(Phaser.Math.Clamp(dy * 1.15, 90, 130) / mascot.height)
    road.add(mascot)
    this.mascot = mascot
    const target = place(current)

    if (hop && current > 1) {
      const from = place(current - 1)
      mascot.setPosition(from.x, from.y)
      this.time.delayedCall(750, () => this.playLevelUp(current, target))
    }
    else {
      mascot.setPosition(target.x, target.y)
      breathe(this, mascot, 0.035, 1300)
    }

    if (!this.sceneData.instant) {
      const nodes = Object.values(this.nodes).sort((a, b) => b.y - a.y)
      nodes.forEach((n, i) => {
        const sc = n.scale
        n.setScale(0)
        this.tweens.add({ targets: n, scale: sc, delay: 150 + i * 55, duration: 380, ease: 'Back.easeOut' })
      })
      trail.setAlpha(0)
      this.tweens.add({ targets: trail, alpha: 1, duration: 500, delay: 100 })
      if (!hop) {
        const my = mascot.y
        mascot.y = my - 40
        mascot.setAlpha(0)
        this.tweens.add({ targets: mascot, y: my, alpha: 1, duration: 500, delay: 450, ease: 'Bounce.easeOut' })
      }
    }
  }

  createNode(level, state) {
    const c = this.add.container(0, 0)
    c.level = level
    c.state = state
    const big = state === 'current'
    const r = big ? 40 : 27
    const g = this.add.graphics()
    c.add(g)
    this.drawNode(g, state)

    if (big) {
      const rays = sunburst(this, null, 0, 0, r * 2.2, { color: 0xFFF1A8, alpha: 0.35, rays: 12 })
      const glow = this.add.image(0, 0, 'fx_glow').setScale((r * 3.4) / 64).setTint(0xFFE27A).setAlpha(0.7)
      c.addAt([rays, glow], 0)
      this.tweens.add({ targets: g, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      // üstte zıplayan ok
      const arrow = this.add.graphics()
      arrow.fillStyle(0x3B230D).fillTriangle(-13, -r - 30, 13, -r - 30, 0, -r - 12)
      arrow.fillStyle(0xFFFFFF).fillTriangle(-9, -r - 28, 9, -r - 28, 0, -r - 16)
      c.add(arrow)
      this.tweens.add({ targets: arrow, y: -8, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    const label = makeText(this, 0, big ? 2 : 0, String(level), {
      size: big ? 34 : 20,
      stroke: big ? '#7a4a00' : (state === 'done' ? '#04502f' : '#3f4152'),
      strokeW: big ? 7 : 4.5,
      shadowY: big ? 4 : 2,
    })
    fitText(label, r * 1.5)
    c.add(label)

    const earned = state === 'done' ? player().levelStars(level) : 0
    if (earned) {
      for (let i = 0; i < 3; i++) {
        const star = this.add.image((i - 1) * 15, r + 6 - (i === 1 ? 4 : 0), 'ic_star').setScale(19 / 256)
        if (i >= earned)
          star.setTint(0x555555).setAlpha(0.85)
        c.add(star)
      }
    }
    else if (state === 'done') {
      const check = this.add.graphics()
      const cx = r * 0.72
      const cy = -r * 0.72
      check.fillStyle(0xFFFFFF).fillCircle(cx, cy, 9)
      check.fillStyle(0x16BB77).fillCircle(cx, cy, 7.5)
      check.lineStyle(2.5, 0xFFFFFF).beginPath().moveTo(cx - 3.5, cy).lineTo(cx - 1, cy + 3).lineTo(cx + 4, cy - 3).strokePath()
      c.add(check)
    }
    if (state === 'locked') {
      const lock = this.add.image(r * 0.68, r * 0.62, 'ic_lock').setScale(24 / 256)
      c.add(lock)
      c.lock = lock
    }
    if (level % 10 === 0) {
      const crown = this.add.image(0, -r - 10, 'ic_crown').setScale((big ? 40 : 30) / 256)
      c.add(crown)
    }

    c.setSize(r * 2.2, r * 2.2)
    c.setInteractive({ useHandCursor: true })
    c.on('pointerup', (pointer) => {
      if (pointer.getDistance() > 14 * this.L.dpr)
        return
      if (c.state === 'current') {
        this.startGame()
      }
      else if (c.state === 'locked') {
        sfx('error_effect')
        shake(this, c, { amount: 5, repeat: 2 })
      }
      else {
        this.tweens.add({ targets: c, scale: { from: 0.85, to: 1 }, duration: 260, ease: 'Back.easeOut' })
      }
    })
    return c
  }

  drawNode(g, state) {
    const big = state === 'current'
    const r = big ? 40 : 27
    const pal = big ? BTN.yellow : (state === 'done' ? BTN.green : BTN.grey)
    g.clear()
    g.fillStyle(0x000000, 0.3).fillEllipse(0, r * 0.72, r * 2, r * 0.7)
    g.fillStyle(pal.depth).fillCircle(0, 4, r)
    g.fillStyle(pal.rim).fillCircle(0, 0, r)
    g.fillStyle(pal.face).fillCircle(0, 0, r - (big ? 5 : 3.5))
    g.fillStyle(pal.light, 0.65).fillEllipse(0, -r * 0.4, r * 1.3, r * 0.65)
    g.fillStyle(0xFFFFFF, 0.6).fillEllipse(-r * 0.42, -r * 0.5, r * 0.32, r * 0.18)
    if (big) {
      g.fillStyle(0xFFF6CF)
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10
        fillStar(g, Math.cos(a) * (r - 2.5), Math.sin(a) * (r - 2.5), 5, 2.6, 1.1)
      }
    }
  }

  /** Kazandıktan sonra: kilit kırılır, düğüm altına döner, maskot yeni seviyeye zıplar. */
  playLevelUp(level, to) {
    const node = this.nodes[level]
    if (!node)
      return
    sfx('success_effect')
    if (node.lock)
      this.tweens.add({ targets: node.lock, y: node.lock.y - 22, angle: 45, alpha: 0, duration: 420, ease: 'Back.easeIn' })
    this.time.delayedCall(380, () => {
      const parent = node.parentContainer
      burst(this, parent, node.x, node.y, { texture: 'fx_star', tint: [0xFFE066, 0xFFFFFF, 0x9BFF8A], count: 18, speed: { min: 120, max: 300 }, scale: { start: 0.55, end: 0 }, gravityY: 250 })
      const replacement = this.createNode(level, 'current')
      replacement.setPosition(node.x, node.y)
      parent.addAt(replacement, parent.getIndex(node))
      node.destroy()
      this.nodes[level] = replacement
      replacement.setScale(0.3)
      this.tweens.add({ targets: replacement, scale: 1, duration: 500, ease: 'Back.easeOut' })
    })
    this.time.delayedCall(260, () => {
      sfx('put_effect')
      flyArc(this, this.mascot, to.x, to.y, {
        duration: 650,
        lift: 70,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          burst(this, this.mascot.parentContainer, to.x, to.y, { texture: 'fx_dot', tint: 0xD9C7A3, count: 10, speed: { min: 40, max: 120 }, scale: { start: 0.35, end: 0 }, gravityY: 100, angle: { min: 200, max: 340 } })
          breathe(this, this.mascot, 0.035, 1300)
        },
      })
    })
  }

  /** Arka planda süzülen yapraklar. */
  addFallingLeaves() {
    const L = this.L
    const emitter = this.add.particles(0, 0, 'fx_leaf', {
      x: { min: -40, max: L.W },
      y: -30,
      speedY: { min: 30 * L.s, max: 70 * L.s },
      speedX: { min: 10 * L.s, max: 40 * L.s },
      rotate: { start: 0, end: 360 },
      scale: { min: 0.5 * L.s, max: 0.9 * L.s },
      alpha: { start: 0.85, end: 0.2 },
      tint: [0x7CB342, 0x9CCC65, 0xFFB74D, 0xF57C00],
      lifespan: 16000,
      frequency: 1400,
      quantity: 1,
    })
    emitter.fastForward(10000)
    this.bgLayer.add(emitter)
    const shade = this.add.graphics()
    drawVerticalFade(shade, 0, L.H * 0.6, L.W, L.H * 0.4, 0x1D1006, 0, 0.3)
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
      admobService.onAdsRemoved()
      toastService.show(t('ads_removed'), 'success')
      this.tweens.add({ targets: button, scale: 0, alpha: 0, duration: 300, ease: 'Back.easeIn', onComplete: () => this.scene.restart({ instant: true }) })
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
