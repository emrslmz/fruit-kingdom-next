import Phaser from 'phaser'
import { ATLASES, BACKGROUNDS, FLAGS, IMAGES } from '../assets'
import { SCENES } from '../config'
import { computeLayout } from '../core/layout'
import { t } from '../core/services'
import { drawPill, drawVerticalFade } from '../ui/draw'
import { bob } from '../ui/effects'
import { makeText } from '../ui/text'

const EAGER_BACKGROUNDS = ['bg_home', 'bg_marble', 'bg_wood']

/** Yükleme ekranı: logo, ipucu, ahşap ilerleme çubuğu. */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Preload)
  }

  preload() {
    this.L = computeLayout(this)
    this.buildScreen()

    for (const [key, path] of Object.entries(IMAGES)) {
      if (!this.textures.exists(key))
        this.load.image(key, path)
    }
    for (const key of EAGER_BACKGROUNDS) {
      if (!this.textures.exists(key))
        this.load.image(key, BACKGROUNDS[key])
    }
    if (!this.textures.exists('game-atlas'))
      this.load.atlas('game-atlas', ATLASES.game.png, ATLASES.game.json)
    if (!this.textures.exists('chars'))
      this.load.atlas('chars', ATLASES.chars.png, ATLASES.chars.json)
    for (const code of FLAGS) {
      if (!this.textures.exists(`flag_${code}`))
        this.load.svg(`flag_${code}`, `assets/flags/${code}flag.svg`, { width: 96, height: 72 })
    }

    this.load.on('progress', v => this.setProgress(v))
    this.load.on('loaderror', file => console.warn('[Preload] yüklenemedi:', file?.src))
  }

  buildScreen() {
    const L = this.L
    const { W, H } = L
    const bg = this.add.image(W / 2, H / 2, 'bg_leaf')
    bg.setScale(Math.max(W / bg.width, H / bg.height))
    const shade = this.add.graphics()
    drawVerticalFade(shade, 0, 0, W, H, 0x0B2A10, 0.15, 0.6)

    this.root = this.add.container(0, 0).setScale(L.s)
    const logo = this.add.image(L.cx, L.top + Math.min(L.dh * 0.3, 230), 'logo')
    logo.setScale(Math.min(250, L.colW * 0.7) / logo.width)
    this.root.add(logo)
    bob(this, logo, 8, 1500)

    const tips = [1, 2, 3, 4, 5, 6, 7].map(i => `tips.tip${i}`)
    const tip = t(Phaser.Utils.Array.GetRandom(tips))
    const tipW = Math.min(L.colW - 50, 360)
    const tipText = makeText(this, L.cx, L.bottom - 170, tip, { size: 17, wrap: tipW - 40, stroke: '#1b3b12', strokeW: 3, shadowY: 2 })
    const tipBg = this.add.graphics()
    const tipH = Math.max(64, tipText.height + 22)
    drawPill(tipBg, L.cx, L.bottom - 170, tipW, tipH, { fill: 0x0F2A0C, alpha: 0.6, border: 0x0A1C08, borderAlpha: 0.5, gloss: false })
    this.root.add([tipBg, tipText])

    const barW = Math.min(L.colW - 80, 300)
    const barY = L.bottom - 92
    this.barW = barW
    this.barY = barY
    const frame = this.add.graphics()
    drawPill(frame, L.cx, barY, barW, 30, { fill: 0x2B180A })
    this.bar = this.add.graphics()
    this.loadingText = makeText(this, L.cx, barY + 36, t('loading'), { size: 18, stroke: '#2b180a', strokeW: 3 })
    this.root.add([frame, this.bar, this.loadingText])
    this.setProgress(0)
  }

  setProgress(v) {
    const L = this.L
    const w = (this.barW - 8) * Phaser.Math.Clamp(v, 0, 1)
    this.bar.clear()
    if (w < 4)
      return
    const x = L.cx - this.barW / 2 + 4
    this.bar.fillStyle(0x16BB77).fillRoundedRect(x, this.barY - 11, Math.max(22, w), 22, 11)
    this.bar.fillStyle(0x2FD792, 0.85).fillRoundedRect(x + 3, this.barY - 9, Math.max(16, w - 6), 8, 4)
  }

  async create() {
    this.setProgress(1)
    const ready = this.registry.get('appReady')
    try {
      await ready
    }
    catch {
      // uygulama başlatma hatası olsa da oyuna devam et
    }
    const params = new URLSearchParams(window.location.search)
    const start = import.meta.env.DEV && params.get('scene')
    const target = start && SCENES[start] ? SCENES[start] : SCENES.Menu
    const overlay = this.scene.get(SCENES.Overlay)
    overlay?.transition(() => this.scene.start(target, {}))
  }
}
