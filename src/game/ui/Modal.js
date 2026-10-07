import { BTN } from '../config'
import Button from './Button'
import { drawPanel } from './draw'
import { fitText, makeText } from './text'

export function drawRibbon(g, w, h, pal) {
  const tail = h * 0.75
  const drop = h * 0.22
  g.clear()
  for (const side of [-1, 1]) {
    const inner = side * (w / 2 - 12)
    const outer = side * (w / 2 + tail)
    const top = -h / 2 + drop
    const bottom = h / 2 + drop
    g.fillStyle(pal.depth)
    g.fillPoints([
      { x: inner, y: top },
      { x: outer, y: top },
      { x: outer - side * tail * 0.38, y: (top + bottom) / 2 },
      { x: outer, y: bottom },
      { x: inner, y: bottom },
    ], true)
    g.fillStyle(0x000000, 0.3)
    g.fillTriangle(side * (w / 2), h / 2, side * (w / 2 - 12), h / 2 + drop, side * (w / 2 - 12), h / 2)
  }
  g.fillStyle(0x000000, 0.22).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 10)
  g.fillStyle(pal.rim).fillRoundedRect(-w / 2, -h / 2, w, h, 10)
  g.fillStyle(pal.face).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 8)
  g.fillStyle(pal.light, 0.55).fillRoundedRect(-w / 2 + 7, -h / 2 + 5, w - 14, (h - 10) * 0.42, 6)
}

/**
 * Ortadan "pop" ile açılan parşömen modal. İçerik `modal.body` container'ına
 * panel merkezine göre (tasarım biriminde) eklenir.
 */
export default class Modal {
  constructor(scene, opts = {}) {
    const L = scene.L
    this.scene = scene
    this.opts = { w: 340, h: 400, color: 'wood', closable: true, backdropClose: true, ...opts }
    const o = this.opts
    const ribbonH = o.title ? 50 : 0
    this.w = Math.min(o.w, L.colW - 20)
    this.h = Math.min(o.h, L.bottom - L.top - 30 - ribbonH / 2)
    this.closed = false

    this.layer = scene.add.container(0, 0)
    scene.modalLayer.add(this.layer)

    this.dim = scene.add.rectangle(0, 0, L.dw, L.dh, 0x0B0602, 0.65).setOrigin(0, 0)
    this.dim.setInteractive()
    this.dim.on('pointerup', (pointer) => {
      if (!o.closable || !o.backdropClose || this.closing)
        return
      if (!this.contains(pointer))
        this.close(false)
    })
    this.layer.add(this.dim)

    const cy = Math.min(L.cy + ribbonH * 0.2, L.bottom - this.h / 2 - 10)
    this.panel = scene.add.container(L.cx, cy)
    this.layer.add(this.panel)

    const g = scene.add.graphics()
    drawPanel(g, this.w, this.h)
    this.panel.add(g)

    if (o.title) {
      const pal = BTN[o.color] || BTN.wood
      const title = makeText(scene, 0, -this.h / 2, o.title, { size: 28, stroke: pal.stroke, strokeW: 5, shadowY: 3 })
      fitText(title, this.w * 0.78 - 30)
      const rw = Math.min(this.w * 0.86, Math.max(170, title.displayWidth + 70))
      const rg = scene.add.graphics()
      drawRibbon(rg, rw, ribbonH, pal)
      rg.y = -this.h / 2
      this.panel.add([rg, title])
      this.ribbon = rg
      this.titleText = title
    }

    this.body = scene.add.container(0, ribbonH * 0.3)
    this.panel.add(this.body)

    if (o.closable && o.closeButton !== false) {
      this.closeBtn = new Button(scene, this.w / 2 - 10, -this.h / 2 + 10, {
        w: 46,
        h: 46,
        shape: 'round',
        color: 'red',
        glyph: 'x',
        onClick: () => this.close(false),
      })
      this.panel.add(this.closeBtn)
    }

    scene.modals = scene.modals || []
    scene.modals.push(this)
    this.open()
  }

  /** İçeriğin kullanabileceği alanın yarı yüksekliği (body koordinatlarında). */
  get innerTop() {
    return -this.h / 2 + 16 + (this.opts.title ? 22 : 0) - this.body.y
  }

  get innerBottom() {
    return this.h / 2 - 22 - this.body.y
  }

  contains(pointer) {
    const s = this.scene.L.s
    const x = pointer.x / s
    const y = pointer.y / s
    return Math.abs(x - this.panel.x) <= this.w / 2 + 10 && y >= this.panel.y - this.h / 2 - 30 && y <= this.panel.y + this.h / 2 + 10
  }

  open() {
    const scene = this.scene
    this.dim.setAlpha(0)
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 200 })
    this.panel.setScale(0.6).setAlpha(0)
    scene.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 360, ease: 'Back.easeOut' })
    if (this.ribbon) {
      this.ribbon.setScale(0.3, 1)
      scene.tweens.add({ targets: this.ribbon, scaleX: 1, duration: 420, delay: 120, ease: 'Back.easeOut' })
    }
  }

  close(result) {
    if (this.closing || this.closed)
      return
    this.closing = true
    const scene = this.scene
    scene.modals = (scene.modals || []).filter(m => m !== this)
    scene.tweens.add({ targets: this.dim, alpha: 0, duration: 180 })
    scene.tweens.add({
      targets: this.panel,
      scale: 0.7,
      alpha: 0,
      duration: 180,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.closed = true
        this.layer.destroy()
        this.opts.onClose?.(result)
      },
    })
  }
}
