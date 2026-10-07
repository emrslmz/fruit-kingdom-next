import Phaser from 'phaser'
import { haptic, sfx } from '../core/services'

/** Açık/kapalı anahtarı (yeşil/gri, kayan topuz). */
export default class Toggle extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y)
    this.opts = { w: 66, h: 34, value: false, ...opts }
    this.value = !!this.opts.value
    this.track = scene.add.graphics()
    this.knob = scene.add.container(0, 0)
    const kg = scene.add.graphics()
    const r = this.opts.h / 2 - 4
    kg.fillStyle(0x000000, 0.25).fillCircle(0, 2, r)
    kg.fillStyle(0xFFFFFF).fillCircle(0, 0, r)
    kg.fillStyle(0xE8E8F0).fillCircle(0, r * 0.25, r * 0.75)
    kg.fillStyle(0xFFFFFF).fillCircle(0, -r * 0.1, r * 0.72)
    this.knob.add(kg)
    this.add([this.track, this.knob])
    this.draw()
    this.knob.x = this.knobX(this.value)

    this.setSize(this.opts.w + 8, this.opts.h + 10)
    this.setInteractive({ useHandCursor: true })
    this.on('pointerup', (pointer) => {
      if (pointer.getDistance() > 14 * (scene.game.registry.get('dpr') || 1))
        return
      if (this.clipTest && !this.clipTest(pointer))
        return
      this.set(!this.value, true)
    })
    scene.add.existing(this)
  }

  knobX(on) {
    const { w, h } = this.opts
    return on ? w / 2 - h / 2 : -w / 2 + h / 2
  }

  draw() {
    const { w, h } = this.opts
    const g = this.track
    g.clear()
    g.fillStyle(0x2B180A).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2)
    g.fillStyle(this.value ? 0x16BB77 : 0x8D8F9F).fillRoundedRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5, h / 2 - 2.5)
    g.fillStyle(0x000000, 0.15).fillRoundedRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, (h - 5) * 0.4, { tl: h / 2 - 2.5, tr: h / 2 - 2.5, bl: 0, br: 0 })
  }

  set(value, user = false) {
    if (this.value === value)
      return
    this.value = value
    this.draw()
    this.scene.tweens.add({ targets: this.knob, x: this.knobX(value), duration: 180, ease: 'Back.easeOut' })
    if (user) {
      sfx('click_effect')
      haptic('click')
      this.opts.onChange?.(value)
    }
  }
}
