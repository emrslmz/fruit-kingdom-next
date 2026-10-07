import Phaser from 'phaser'
import { admobService } from '@/core/services/admobService'
import { mobileService } from '@/core/services/MobileService'
import { SCENES } from '../config'
import Button from '../ui/Button'
import CurrencyBadge from '../ui/CurrencyBadge'
import { drawVerticalFade } from '../ui/draw'
import { fitText, makeText } from '../ui/text'
import { computeLayout } from './layout'
import { bus, player } from './services'

/**
 * Tüm ekranların ortak tabanı.
 *
 *  - `this.L`         : o anki ekran düzeni (bkz. core/layout.js)
 *  - `this.bgLayer`   : tam ekran arka plan (cihaz pikseli)
 *  - `this.root`      : asıl UI, tasarım biriminde (L.s ile ölçekli)
 *  - `this.modalLayer`: modallar, root'un üstünde
 *
 * Alt sınıflar `build(data)` yazar. Ekran boyutu değişince (döndürme,
 * pencere boyutu) sahne `getState()` ile yeniden kurulur.
 */
export default class BaseScene extends Phaser.Scene {
  create(data = {}) {
    // Phaser aynı sahne nesnesini yeniden kullanır: örnek alanlarını sıfırla
    this.sceneData = data
    this.isTransitioning = false
    this.modals = []
    this.currencyBadges = {}
    this.L = computeLayout(this)
    this.bgLayer = this.add.container(0, 0)
    this.root = this.add.container(0, 0).setScale(this.L.s)
    this.modalLayer = this.add.container(0, 0).setScale(this.L.s).setDepth(1000)

    this.build(data)

    const onResize = () => {
      clearTimeout(this._resizeTimer)
      this._resizeTimer = setTimeout(() => {
        if (!this.sys.isActive())
          return
        const next = computeLayout(this)
        if (Math.abs(next.W - this.L.W) < 2 && Math.abs(next.H - this.L.H) < 2)
          return
        this.onResize()
      }, 140)
    }
    const onBack = () => {
      if (this.sys.isActive() && !this.isTransitioning)
        this.handleBack()
    }
    const onPause = () => this.sys.isActive() && this.onAppPause?.()
    this.scale.on('resize', onResize)
    bus.on('app:back', onBack)
    bus.on('app:pause', onPause)
    this.events.once('shutdown', () => {
      clearTimeout(this._resizeTimer)
      this.scale.off('resize', onResize)
      bus.off('app:back', onBack)
      bus.off('app:pause', onPause)
      this.tweens.killAll()
    })
  }

  /** Alt sınıflar override eder. */
  build() {}

  /** Yeniden kurulumda korunacak durum. */
  getState() {
    return this.sceneData
  }

  onResize() {
    this.scene.restart({ ...this.getState(), instant: true })
  }

  /** Geri tuşu / ESC: önce açık modalı kapatır, yoksa onBack. */
  handleBack() {
    const top = this.modals[this.modals.length - 1]
    if (top) {
      if (top.opts.closable)
        top.close(false)
      return
    }
    this.onBack()
  }

  onBack() {
    this.go(SCENES.Menu)
  }

  /** Perde geçişiyle başka sahneye git. */
  go(key, data = {}) {
    if (this.isTransitioning)
      return
    this.isTransitioning = true
    // Geçiş reklamı: her 10 ekran geçişinde bir (reklamlar kaldırılmadıysa).
    if (mobileService.isNative && player().handleNavigation())
      admobService.showInterstitialAd()
    const overlay = this.scene.get(SCENES.Overlay)
    if (overlay?.transition) {
      overlay.transition(() => this.scene.start(key, data))
    }
    else {
      this.scene.start(key, data)
    }
  }

  // ---------------------------------------------------------------------------
  // Ortak yapı taşları
  // ---------------------------------------------------------------------------

  /**
   * Ekranı tamamen kaplayan (cover) arka plan. Yatay görsel dikey ekranda
   * istenirse 90° döndürülür (üstten bakış görselleri için çerçeveyi korur).
   */
  addBackground(key, o = {}) {
    const { W, H } = this.L
    if (!this.textures.exists(key)) {
      const rect = this.add.rectangle(0, 0, W, H, o.fallbackColor ?? 0x3B230D).setOrigin(0)
      this.bgLayer.add(rect)
      return rect
    }
    const img = this.add.image(W / 2, H / 2, key)
    const tex = this.textures.get(key).getSourceImage()
    const landscapeImg = tex.width > tex.height
    const portraitScreen = H > W
    const rotate = o.rotate && landscapeImg && portraitScreen
    const iw = rotate ? tex.height : tex.width
    const ih = rotate ? tex.width : tex.height
    if (rotate)
      img.setAngle(90)
    const scale = Math.max(W / iw, H / ih) * (o.zoom ?? 1)
    img.setScale(scale)
    this.bgLayer.add(img)
    if (o.tint !== undefined) {
      const tint = this.add.rectangle(0, 0, W, H, o.tint, o.tintAlpha ?? 0.25).setOrigin(0)
      this.bgLayer.add(tint)
    }
    if (o.vignette !== false) {
      const g = this.add.graphics()
      drawVerticalFade(g, 0, 0, W, H * 0.22, 0x000000, o.topShade ?? 0.35, 0)
      drawVerticalFade(g, 0, H * 0.8, W, H * 0.2, 0x000000, 0, o.bottomShade ?? 0.35)
      this.bgLayer.add(g)
    }
    if (o.drift) {
      this.tweens.add({ targets: img, scale: scale * 1.06, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    return img
  }

  /**
   * Ahşap üst çubuk: geri butonu + başlık + para birimi rozetleri.
   * @returns {number} çubuğun alt kenarının y'si (tasarım birimi)
   */
  addTopBar(o = {}) {
    const L = this.L
    const barH = 62
    const top = L.top
    const bar = this.add.container(0, 0)
    this.root.add(bar)

    const plankH = top + barH
    const tile = this.textures.exists('bg_wood')
      ? this.add.tileSprite(0, 0, L.dw / 0.5, plankH / 0.5, 'bg_wood').setOrigin(0).setScale(0.5)
      : this.add.rectangle(0, 0, L.dw, plankH, 0x8A5A2B).setOrigin(0)
    const edge = this.add.graphics()
    edge.fillStyle(0x000000, 0.18).fillRect(0, 0, L.dw, plankH)
    edge.fillStyle(0x3B230D).fillRect(0, plankH - 4, L.dw, 4)
    edge.fillStyle(0x000000, 0.22).fillRect(0, plankH, L.dw, 5)
    edge.fillStyle(0xFFFFFF, 0.12).fillRect(0, plankH - 8, L.dw, 3)
    bar.add([tile, edge])

    const cy = top + barH / 2 - 2
    const left = L.colX + 12
    const right = L.colX + L.colW - 12
    let x = left
    if (o.back !== false) {
      const back = new Button(this, x + 24, cy, {
        w: 48,
        h: 48,
        color: 'grey',
        glyph: 'back',
        glyphColor: 0x55576B,
        onClick: () => this.handleBack(),
      })
      bar.add(back)
      this.backButton = back
      x += 56
    }

    this.currencyBadges = {}
    const badges = o.currencies ?? []
    let rx = right
    const badgeW = Math.min(108, (L.colW - (x - left) - 120) / Math.max(1, badges.length) - 10)
    for (let i = badges.length - 1; i >= 0; i--) {
      const kind = badges[i]
      const cfg = this.currencyConfig(kind)
      const badge = new CurrencyBadge(this, rx - badgeW / 2, cy, {
        w: badgeW,
        h: 32,
        icon: cfg.icon,
        value: cfg.value(),
        max: cfg.max?.(),
        plus: o.plus !== false,
        onClick: o.plus === false ? null : () => this.openPurchase(kind),
      })
      bar.add(badge)
      this.currencyBadges[kind] = badge
      rx -= badgeW + 18
    }

    if (o.title) {
      const titleRight = badges.length ? rx + 6 : right
      const title = makeText(this, x + 4, cy, o.title, { size: 26, originX: 0, stroke: '#3b230d', strokeW: 5, shadowY: 3 })
      fitText(title, Math.max(60, titleRight - x - 6), 40)
      bar.add(title)
      this.titleText = title
    }

    bar.y = -plankH - 10
    if (this.sceneData.instant)
      bar.y = 0
    else
      this.tweens.add({ targets: bar, y: 0, duration: 420, ease: 'Back.easeOut' })
    this.topBar = bar
    return plankH + 4
  }

  currencyConfig(kind) {
    const p = player()
    switch (kind) {
      case 'energy':
        return { icon: 'ic_energy', value: () => p.energy.current, max: () => p.energy.max }
      case 'gold':
        return { icon: 'ic_gold', value: () => p.currencies.gold }
      case 'diamond':
      default:
        return { icon: 'ic_diamond', value: () => p.currencies.diamonds }
    }
  }

  /** Rozetleri store'daki güncel değerlerle eşitler (animasyonlu). */
  refreshCurrencies() {
    for (const [kind, badge] of Object.entries(this.currencyBadges || {})) {
      const cfg = this.currencyConfig(kind)
      badge.max = cfg.max?.()
      badge.setValue(cfg.value())
    }
  }

  openPurchase(kind) {
    this.go(SCENES.Purchase, { currency: kind, from: this.scene.key, fromData: this.getState() })
  }

  /** Giriş animasyonu: aşağıdan yukarı kayarak beliren öğeler. */
  popIn(targets, o = {}) {
    const list = Array.isArray(targets) ? targets : [targets]
    if (this.sceneData.instant)
      return
    list.forEach((t, i) => {
      if (!t)
        return
      const y = t.y
      const sx = t.scaleX
      const sy = t.scaleY
      t.setAlpha(0)
      t.y = y + (o.dy ?? 30)
      t.setScale(sx * (o.scale ?? 0.9), sy * (o.scale ?? 0.9))
      this.tweens.add({
        targets: t,
        alpha: 1,
        y,
        scaleX: sx,
        scaleY: sy,
        delay: (o.delay ?? 80) + i * (o.stagger ?? 60),
        duration: o.duration ?? 420,
        ease: 'Back.easeOut',
      })
    })
  }

  get playerStore() {
    return player()
  }
}
