import Phaser from 'phaser'
import { formatNumber, haptic, sfx } from '../core/services'
import { drawPill } from './draw'
import { fitText, makeText } from './text'

/**
 * Para birimi rozeti: koyu hap + soldan taşan ikon + (isteğe bağlı) yeşil "+".
 * Değer değişince sayı yuvarlanarak sayar ve ikon zıplar.
 *
 * new CurrencyBadge(scene, x, y, { w, h, icon, value, max, plus, onClick })
 */
export default class CurrencyBadge extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y)
    this.opts = { w: 112, h: 34, ...opts }
    const { w, h } = this.opts
    this.value = Number(opts.value) || 0
    this.max = opts.max

    this.g = scene.add.graphics()
    this.fill = scene.add.graphics()
    this.add([this.g, this.fill])
    drawPill(this.g, 0, 0, w, h)

    const textLeft = -w / 2 + h * 0.55
    const textRight = w / 2 - (opts.plus ? h * 0.95 : h * 0.35)
    this.textCenter = (textLeft + textRight) / 2
    this.textMaxW = textRight - textLeft
    this.label = makeText(scene, this.textCenter, 0, '', { size: h * 0.5, stroke: '#2b180a', strokeW: 3, shadowY: 1.5 })
    this.add(this.label)

    const iconSize = h * 1.25
    this.icon = scene.add.image(-w / 2 + h * 0.08, 0, opts.icon)
    this.icon.setScale(iconSize / Math.max(this.icon.width, this.icon.height))
    this.iconScale = this.icon.scale
    this.add(this.icon)

    if (opts.plus) {
      const pg = scene.add.graphics()
      const r = h * 0.38
      const px = w / 2 - h * 0.5
      pg.fillStyle(0x046D41).fillCircle(px, 1.5, r)
      pg.fillStyle(0x16BB77).fillCircle(px, 0, r)
      pg.fillStyle(0x2FD792, 0.8).fillEllipse(px, -r * 0.35, r * 1.3, r * 0.7)
      pg.fillStyle(0xFFFFFF)
      pg.fillRoundedRect(px - r * 0.55, -r * 0.16, r * 1.1, r * 0.32, r * 0.12)
      pg.fillRoundedRect(px - r * 0.16, -r * 0.55, r * 0.32, r * 1.1, r * 0.12)
      this.add(pg)
    }

    this.render(this.value)

    if (opts.onClick) {
      this.setSize(w + h * 0.4, h + 8)
      this.setInteractive({ useHandCursor: true })
      this.on('pointerdown', () => {
        this.scene.tweens.add({ targets: this, scale: 0.94, duration: 80, yoyo: true })
      })
      this.on('pointerup', (pointer) => {
        if (pointer.getDistance() > 14 * (scene.game.registry.get('dpr') || 1))
          return
        sfx('click_effect')
        haptic('click')
        opts.onClick(this)
      })
    }
    scene.add.existing(this)
  }

  render(value) {
    const { w, h } = this.opts
    const v = Math.round(value)
    const str = this.max !== undefined ? `${formatNumber(v)}/${formatNumber(this.max)}` : formatNumber(v)
    this.label.setText(str)
    fitText(this.label, this.textMaxW, h * 0.9)
    if (this.max !== undefined) {
      this.fill.clear()
      const ratio = Phaser.Math.Clamp(v / (this.max || 1), 0, 1)
      if (ratio > 0) {
        const fw = Math.max(h - 6, (w - 6) * ratio)
        this.fill.fillStyle(0x1C9FD7).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, fw, h - 6, (h - 6) / 2)
        this.fill.fillStyle(0x36BDF7, 0.8).fillRoundedRect(-w / 2 + 5, -h / 2 + 4, fw - 4, (h - 6) * 0.42, (h - 6) * 0.2)
      }
    }
  }

  setValue(value, animate = true) {
    const target = Number(value) || 0
    if (target === this.value)
      return
    const from = this.value
    this.value = target
    this.counter?.stop()
    if (!animate) {
      this.render(target)
      return
    }
    const obj = { v: from }
    this.counter = this.scene.tweens.add({
      targets: obj,
      v: target,
      duration: Math.min(900, 250 + Math.abs(target - from) * 4),
      ease: 'Cubic.easeOut',
      onUpdate: () => this.render(obj.v),
    })
    this.scene.tweens.add({
      targets: this.icon,
      scale: { from: this.iconScale * 1.35, to: this.iconScale },
      duration: 420,
      ease: 'Back.easeOut',
    })
  }

  /** Bir ikonun uçacağı hedef noktanın dünya koordinatı. */
  getIconWorldPoint() {
    const m = this.icon.getWorldTransformMatrix()
    return { x: m.tx, y: m.ty }
  }
}
