import Phaser from 'phaser'
import { BTN } from '../config'
import { haptic, sfx } from '../core/services'
import { drawButtonShape } from './draw'
import { drawGlyph } from './glyphs'
import { fitText, makeText } from './text'

/**
 * Kenney renk paletli, derinlikli, basılma animasyonlu oyun butonu.
 *
 * new Button(scene, x, y, {
 *   w, h, color: 'green'|'yellow'|'red'|'blue'|'grey'|'purple'|'wood',
 *   shape: 'rect'|'round', label, labelSize, icon, iconFrame, iconSize,
 *   onClick, sound, pulse, disabled
 * })
 */
export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y)
    this.opts = {
      w: 160,
      h: 58,
      color: 'green',
      shape: 'rect',
      sound: 'click_effect',
      labelSize: null,
      ...opts,
    }
    const o = this.opts
    if (o.shape === 'round')
      o.h = o.h ?? o.w
    this.depthPx = o.depth ?? Math.max(4, Math.round(o.h * 0.09))
    this.disabled = !!o.disabled
    this.pressed = false

    this.g = scene.add.graphics()
    this.content = scene.add.container(0, 0)
    this.add([this.g, this.content])

    const faceH = o.h - this.depthPx
    const pal = BTN[o.color] || BTN.green

    if (o.icon) {
      const size = o.iconSize ?? faceH * 0.72
      this.icon = o.iconFrame
        ? scene.add.image(0, 0, o.icon, o.iconFrame)
        : scene.add.image(0, 0, o.icon)
      const k = size / Math.max(this.icon.width, this.icon.height)
      this.icon.setScale(k)
      this.iconBaseScale = k
      this.content.add(this.icon)
    }
    if (o.glyph) {
      const size = o.glyphSize ?? faceH * 0.62
      const glyph = scene.add.graphics()
      drawGlyph(glyph, o.glyph, size, { color: o.glyphColor })
      // ikon gibi davranır (label ile yan yana yerleşim için)
      this.icon = glyph
      this.iconW = size
      this.content.add(glyph)
    }
    if (o.label !== undefined && o.label !== null) {
      const size = o.labelSize ?? Math.round(faceH * 0.46)
      this.label = makeText(scene, 0, 0, o.label, { size, stroke: pal.stroke, color: o.labelColor ?? '#ffffff' })
      this.content.add(this.label)
    }
    this.layoutContent()
    this.redraw()

    this.setSize(o.w, o.h)
    this.setInteractive({ useHandCursor: true })
    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)
    this.on('pointerout', this.onOut, this)
    this.on('pointerover', this.onOver, this)

    if (o.pulse)
      this.startPulse()

    scene.add.existing(this)
  }

  get palette() {
    return this.disabled ? BTN.disabled : (BTN[this.opts.color] || BTN.green)
  }

  layoutContent() {
    const o = this.opts
    const faceH = o.h - this.depthPx
    const pad = o.shape === 'round' ? 0 : Math.max(10, o.h * 0.24)
    const maxW = o.w - pad * 2
    if (this.icon && this.label) {
      const gap = 6
      const iconW = this.iconW ?? this.icon.displayWidth
      fitText(this.label, maxW - iconW - gap, faceH * 0.8)
      const total = iconW + gap + this.label.displayWidth
      const left = -total / 2
      if (o.iconRight) {
        this.label.x = left + this.label.displayWidth / 2
        this.icon.x = left + this.label.displayWidth + gap + iconW / 2
      }
      else {
        this.icon.x = left + iconW / 2
        this.label.x = left + iconW + gap + this.label.displayWidth / 2
      }
    }
    else if (this.label) {
      fitText(this.label, maxW, faceH * 0.82)
      this.label.x = 0
    }
    if (this.icon && !this.label)
      this.icon.x = o.iconOffsetX ?? 0
  }

  redraw() {
    const o = this.opts
    const { faceCenterY } = drawButtonShape(this.g, o.w, o.h, this.palette, {
      shape: o.shape,
      depth: this.depthPx,
      radius: o.radius,
      pressed: this.pressed,
      flat: o.flat,
    })
    this.content.y = faceCenterY + (o.contentOffsetY ?? 0)
    if (this.label)
      this.label.setStroke(this.palette.stroke, this.label.style.strokeThickness)
  }

  setLabel(str) {
    if (!this.label)
      return this
    this.label.setText(str)
    this.layoutContent()
    return this
  }

  setColor(color) {
    this.opts.color = color
    this.redraw()
    return this
  }

  setDisabled(value) {
    this.disabled = !!value
    this.content.setAlpha(this.disabled ? 0.75 : 1)
    this.redraw()
    return this
  }

  /** Sağ üst köşede sayaç/uyarı rozeti. */
  setBadge(value, o = {}) {
    if (this.badge) {
      this.badge.destroy()
      this.badge = null
    }
    if (value === null || value === undefined || value === false)
      return this
    const scene = this.scene
    const size = o.size ?? Math.max(20, this.opts.h * 0.38)
    const c = scene.add.container(this.opts.w / 2 - size * 0.32, -this.opts.h / 2 + size * 0.3)
    const g = scene.add.graphics()
    g.fillStyle(0x000000, 0.25).fillCircle(0, 2, size / 2)
    g.fillStyle(0xFFFFFF).fillCircle(0, 0, size / 2)
    g.fillStyle(o.color ?? 0xEE2747).fillCircle(0, 0, size / 2 - 2)
    c.add(g)
    if (value !== '') {
      const label = makeText(scene, 0, 0, String(value), { size: size * 0.62, stroke: o.stroke ?? '#6b0a1a', strokeW: 2.5, shadowY: 1 })
      fitText(label, size * 0.82)
      c.add(label)
    }
    this.add(c)
    this.badge = c
    return this
  }

  startPulse(amount = 0.05, duration = 700) {
    this.stopPulse()
    this.pulseTween = this.scene.tweens.add({
      targets: this.content,
      scale: 1 + amount,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    return this
  }

  stopPulse() {
    this.pulseTween?.stop()
    this.pulseTween = null
    this.content.setScale(1)
  }

  setPressed(value) {
    if (this.pressed === value)
      return
    this.pressed = value
    this.redraw()
  }

  onDown(pointer) {
    if (this.disabled && !this.opts.allowDisabledClick)
      return
    if (this.clipTest && !this.clipTest(pointer))
      return
    this.isDown = true
    this.setPressed(true)
  }

  onUp(pointer) {
    if (!this.isDown)
      return
    this.isDown = false
    this.setPressed(false)
    const dpr = this.scene.game.registry.get('dpr') || 1
    if (pointer.getDistance() > 14 * dpr)
      return
    if (this.opts.sound)
      sfx(this.opts.sound)
    haptic('click')
    this.scene.tweens.add({ targets: this, scale: { from: 0.94, to: 1 }, duration: 220, ease: 'Back.easeOut' })
    this.opts.onClick?.(this, pointer)
  }

  onOut() {
    if (this.isDown) {
      this.isDown = false
      this.setPressed(false)
    }
    if (this.hovered) {
      this.hovered = false
      this.scene.tweens.add({ targets: this, scale: 1, duration: 120 })
    }
  }

  onOver(pointer) {
    if (pointer.wasTouch || this.disabled)
      return
    this.hovered = true
    this.scene.tweens.add({ targets: this, scale: 1.04, duration: 120 })
  }
}
