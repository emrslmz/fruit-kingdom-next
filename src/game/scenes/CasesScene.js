import Phaser from 'phaser'
import { toastService } from '@/core/services/ToastService'
import { caseKey, powerUpKey, queueBackground } from '../assets'
import { SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { formatDuration, haptic, player, sfx, shop, t } from '../core/services'
import Button from '../ui/Button'
import { drawPanel } from '../ui/draw'
import { bob, burst, confettiRain, flyArc, sunburst } from '../ui/effects'
import Modal from '../ui/Modal'
import { fitText, inkText, makeText } from '../ui/text'

const CASE_COLORS = [
  { fill: 0xF3DFBA, border: 0xA68864, shade: 0x8C6B4B, glow: 0xFFE2A8 },
  { fill: 0xF0D2B4, border: 0x9F6A39, shade: 0x7C4E25, glow: 0xFFC58A },
  { fill: 0xE6EDF0, border: 0x8C9BA1, shade: 0x6A7B82, glow: 0xD8F4FF },
  { fill: 0xFBE7A8, border: 0xB88320, shade: 0x9C6A15, glow: 0xFFF0A0 },
]

function rarityOf(drop) {
  if (drop.chance <= 2)
    return { color: 0xFFB000, dark: 0x9C5C00 }
  if (drop.chance <= 13)
    return { color: 0x9B5CFF, dark: 0x4C1D95 }
  if (drop.chance <= 25)
    return { color: 0x2F9BFF, dark: 0x0E4A8A }
  return { color: 0x7FBF6A, dark: 0x3E6B2F }
}

function dropIcon(drop) {
  if (drop.type === 'diamond')
    return 'ic_diamond'
  if (drop.type === 'powerup' && drop.id && drop.id !== 'random')
    return powerUpKey(drop.id)
  return 'ic_gift'
}

/** Kasalar: günlük ücretsiz + altınla açılan kasalar, kayan şeritli açılış. */
export default class CasesScene extends BaseScene {
  constructor() {
    super(SCENES.Cases)
  }

  preload() {
    queueBackground(this, 'bg_wood')
  }

  build() {
    const L = this.L
    this.opening = false
    this.openLayer = null
    this.addBackground('bg_wood', { tint: 0x1D1006, tintAlpha: 0.45 })
    const glow = this.add.image(L.W / 2, L.H * 0.45, 'fx_glow').setScale((L.W * 1.4) / 64).setTint(0xFFD27A).setAlpha(0.25)
    this.bgLayer.add(glow)
    const top = this.addTopBar({ title: t('cases'), currencies: ['gold', 'diamond'] })

    const boxes = shop().cases
    const areaW = Math.min(L.colW - 20, 460)
    const areaTop = top + 14
    const areaH = L.bottom - areaTop - 10
    const cols = 2
    const rows = Math.ceil(boxes.length / cols)
    const gap = 14
    const cardW = (areaW - gap) / cols
    const cardH = Math.min(270, (areaH - gap * (rows - 1)) / rows)
    this.cards = []
    boxes.forEach((box, i) => {
      const x = L.cx - areaW / 2 + (i % cols) * (cardW + gap) + cardW / 2
      const y = areaTop + Math.floor(i / cols) * (cardH + gap) + cardH / 2
      const card = this.buildCaseCard(box, i, cardW, cardH)
      card.setPosition(x, y)
      this.root.add(card)
      this.cards.push(card)
    })
    this.popIn(this.cards, { delay: 120, stagger: 80, dy: 40 })
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updatePriceButtons() })
  }

  buildCaseCard(box, index, w, h) {
    const c = this.add.container(0, 0)
    const color = CASE_COLORS[index % CASE_COLORS.length]
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 2, -h / 2 + 8, w, h, 22)
    g.fillStyle(color.shade).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 22)
    g.fillStyle(color.border).fillRoundedRect(-w / 2, -h / 2, w, h, 22)
    g.fillStyle(color.fill).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 18)
    g.fillStyle(0xFFFFFF, 0.45).fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, 12, 6)
    c.add(g)

    const imgY = -h / 2 + h * 0.36
    const glow = this.add.image(0, imgY, 'fx_glow').setTint(color.glow).setScale((h * 0.62) / 64).setAlpha(0.8)
    const img = this.add.image(0, imgY, caseKey(box.image))
    img.setScale((Math.min(w, h) * 0.56) / img.width)
    bob(this, img, 5, 1400 + index * 120)
    c.add([glow, img])

    const name = makeText(this, 0, h / 2 - 82, t(box.nameKey), { size: 19, stroke: '#3b230d', strokeW: 4.5 })
    fitText(name, w - 20)
    c.add(name)

    const info = new Button(this, w / 2 - 22, -h / 2 + 22, { w: 34, h: 34, shape: 'round', color: 'blue', glyph: 'info', onClick: () => this.openInfo(box) })
    c.add(info)

    const btn = new Button(this, 0, h / 2 - 34, { w: w - 26, h: 48, color: 'green', label: '', labelSize: 18, onClick: () => this.tryOpen(box, c) })
    c.add(btn)
    c.priceButton = btn
    c.box = box
    c.caseImage = img
    this.applyPrice(c)
    return c
  }

  applyPrice(card) {
    const box = card.box
    const btn = card.priceButton
    const p = player()
    if (box.priceType === 'free') {
      if (p.canOpenFreeCase()) {
        btn.setColor('green').setLabel(t('free'))
        if (!btn.pulseTween)
          btn.startPulse()
      }
      else {
        const left = 24 * 3600 * 1000 - (Date.now() - (p.profile.lastFreeCaseOpenTime || 0))
        btn.stopPulse()
        btn.setColor('grey').setLabel(formatDuration(left))
      }
      return
    }
    const cost = box.price
    const icon = box.priceType === 'gold' ? 'ic_gold' : 'ic_diamond'
    const affordable = box.priceType === 'gold' ? p.currencies.gold >= cost : p.currencies.diamonds >= cost
    if (!btn.priceIcon) {
      btn.priceIcon = this.add.image(0, 0, icon).setScale(28 / 256)
      btn.content.add(btn.priceIcon)
      btn.icon = btn.priceIcon
      btn.opts.iconRight = true
    }
    btn.setColor(affordable ? 'yellow' : 'grey').setLabel(String(cost))
  }

  updatePriceButtons() {
    if (this.opening)
      return
    this.cards.forEach(c => this.applyPrice(c))
  }

  openInfo(box) {
    const drops = box.drops
    const rowH = 52
    const modal = new Modal(this, { w: 340, h: 130 + drops.length * (rowH + 6), title: t(box.nameKey), color: 'wood' })
    const sub = inkText(this, 0, modal.innerTop + 8, t('drops'), { size: 17, color: '#7a5a3a' })
    modal.body.add(sub)
    drops.forEach((drop, i) => {
      const y = modal.innerTop + 44 + i * (rowH + 6)
      const r = rarityOf(drop)
      const g = this.add.graphics()
      g.fillStyle(r.dark).fillRoundedRect(-modal.w / 2 + 26, y - rowH / 2, modal.w - 52, rowH, 14)
      g.fillStyle(r.color, 0.25).fillRoundedRect(-modal.w / 2 + 28, y - rowH / 2 + 2, modal.w - 56, rowH - 4, 12)
      g.fillStyle(0xFFF8E8).fillRoundedRect(-modal.w / 2 + 28, y - rowH / 2 + 2, modal.w - 56, rowH - 4, 12)
      g.fillStyle(r.color).fillRoundedRect(-modal.w / 2 + 28, y - rowH / 2 + 2, 8, rowH - 4, { tl: 12, bl: 12, tr: 0, br: 0 })
      const icon = this.add.image(-modal.w / 2 + 66, y, dropIcon(drop))
      icon.setScale(38 / icon.width)
      const label = drop.type === 'diamond' ? `${drop.amount}x ${t('diamond')}` : `${drop.amount}x ${drop.id === 'random' ? t('random_powerup') : t(drop.id)}`
      const text = inkText(this, -modal.w / 2 + 94, y, label, { size: 17, originX: 0 })
      fitText(text, modal.w - 200)
      const pct = makeText(this, modal.w / 2 - 40, y, `%${drop.chance}`, { size: 17, stroke: Phaser.Display.Color.IntegerToColor(r.dark).rgba, strokeW: 4 })
      modal.body.add([g, icon, text, pct])
    })
  }

  tryOpen(box, card) {
    if (this.opening)
      return
    const result = shop().openCase(box.id)
    if (!result.success) {
      toastService.show(t(result.message), 'warning')
      this.tweens.add({ targets: card, x: card.x + 6, duration: 50, yoyo: true, repeat: 3 })
      return
    }
    this.refreshCurrencies()
    this.playOpening(box, card, result.drop)
  }

  // ---------------------------------------------------------------------------
  // Açılış sekansı
  // ---------------------------------------------------------------------------
  playOpening(box, card, drop) {
    const L = this.L
    this.opening = true
    this.updatePriceButtons()
    const layer = this.add.container(0, 0)
    this.modalLayer.add(layer)
    this.openLayer = layer
    const dim = this.add.rectangle(0, 0, L.dw, L.dh, 0x0B0602, 0.85).setOrigin(0).setInteractive()
    layer.add(dim)
    dim.setAlpha(0)
    this.tweens.add({ targets: dim, alpha: 1, duration: 250 })

    const m = card.caseImage.getWorldTransformMatrix()
    const img = this.add.image(m.tx / L.s, m.ty / L.s, caseKey(box.image))
    img.setScale(card.caseImage.scale)
    layer.add(img)
    const cy = L.cy - 30
    const rays = sunburst(this, layer, L.cx, cy, 240, { color: 0xFFE9A0, alpha: 0.25 })
    rays.setAlpha(0)
    this.tweens.add({ targets: rays, alpha: 1, duration: 500 })

    sfx('start_effect')
    this.tweens.add({
      targets: img,
      x: L.cx,
      y: cy,
      scale: 200 / img.width,
      duration: 480,
      ease: 'Back.easeOut',
      onComplete: () => {
        // gittikçe şiddetlenen sallanma
        let i = 0
        const shake = () => {
          i++
          const amp = 4 + i * 1.6
          haptic('click')
          this.tweens.add({
            targets: img,
            angle: { from: -amp, to: amp },
            duration: Math.max(40, 110 - i * 8),
            yoyo: true,
            onComplete: () => (i < 9 ? shake() : this.burstCase(img, rays, layer, box, drop)),
          })
        }
        shake()
      },
    })
  }

  burstCase(img, rays, layer, box, drop) {
    sfx('pop_effect')
    haptic('success')
    this.cameras.main.flash(180, 255, 245, 200)
    burst(this, layer, img.x, img.y, { texture: 'fx_star', tint: [0xFFE066, 0xFFFFFF, 0xFFB000], count: 24, speed: { min: 160, max: 420 }, scale: { start: 0.7, end: 0 }, gravityY: 300 })
    this.tweens.add({ targets: img, scale: img.scale * 1.4, alpha: 0, duration: 220, onComplete: () => img.destroy() })
    this.tweens.add({ targets: rays, alpha: 0.3, duration: 200 })
    this.time.delayedCall(250, () => this.playRoller(layer, box, drop, rays))
  }

  playRoller(layer, box, drop, rays) {
    const L = this.L
    const stripW = Math.min(L.colW - 20, 440)
    const cell = 92
    const count = 44
    const winIndex = 36
    const cy = L.cy - 30

    const frame = this.add.graphics()
    drawPanel(frame, stripW + 16, cell + 34, { radius: 18, fill: 0x2B180A, inner: 0x5A3A22, innerShade: 0x1D1006 })
    frame.setPosition(L.cx, cy)
    layer.add(frame)

    const strip = this.add.container(0, cy)
    layer.add(strip)
    const maskG = this.make.graphics({ add: false })
    maskG.fillStyle(0xFFFFFF).fillRect((L.cx - stripW / 2) * L.s, (cy - cell / 2 - 6) * L.s, stripW * L.s, (cell + 12) * L.s)
    strip.setMask(maskG.createGeometryMask())
    this.events.once('shutdown', () => maskG.destroy())

    const pickVisual = () => {
      let r = Math.random() * 100
      for (const d of box.drops) {
        r -= d.chance
        if (r < 0)
          return d
      }
      return box.drops[0]
    }
    for (let i = 0; i < count; i++) {
      const d = i === winIndex ? drop : pickVisual()
      const x = i * (cell + 6)
      const r = rarityOf(d)
      const g = this.add.graphics()
      g.fillStyle(r.dark).fillRoundedRect(x - cell / 2, -cell / 2, cell, cell, 14)
      g.fillStyle(0xFFF8E8).fillRoundedRect(x - cell / 2 + 3, -cell / 2 + 3, cell - 6, cell - 6, 12)
      g.fillStyle(r.color, 0.35).fillRoundedRect(x - cell / 2 + 3, cell / 2 - 26, cell - 6, 23, { tl: 0, tr: 0, bl: 12, br: 12 })
      g.fillStyle(r.color).fillRect(x - cell / 2 + 3, cell / 2 - 8, cell - 6, 5)
      const icon = this.add.image(x, -8, dropIcon(d))
      icon.setScale((cell * 0.5) / icon.width)
      const amount = makeText(this, x, cell / 2 - 18, `x${d.amount}`, { size: 16, stroke: '#3b230d', strokeW: 3.5 })
      strip.add([g, icon, amount])
    }

    // orta işaretçi
    const marker = this.add.graphics()
    marker.fillStyle(0xFFD84A).fillTriangle(L.cx - 12, cy - cell / 2 - 16, L.cx + 12, cy - cell / 2 - 16, L.cx, cy - cell / 2 - 2)
    marker.fillStyle(0xFFD84A).fillTriangle(L.cx - 12, cy + cell / 2 + 16, L.cx + 12, cy + cell / 2 + 16, L.cx, cy + cell / 2 + 2)
    marker.fillStyle(0xFFD84A, 0.9).fillRect(L.cx - 1.5, cy - cell / 2 - 4, 3, cell + 8)
    layer.add(marker)

    const startX = L.cx + stripW / 2 + cell
    const offset = Phaser.Math.Between(-cell * 0.35, cell * 0.35)
    const endX = L.cx - winIndex * (cell + 6) + offset
    strip.x = startX
    let lastCell = -1
    this.tweens.add({
      targets: strip,
      x: endX,
      duration: 4300,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const idx = Math.floor((L.cx - strip.x + cell / 2) / (cell + 6))
        if (idx !== lastCell) {
          lastCell = idx
          sfx('put_effect')
        }
      },
      onComplete: () => {
        this.time.delayedCall(350, () => this.revealDrop(layer, drop, rays, [frame, strip, marker]))
      },
    })
  }

  revealDrop(layer, drop, rays, roller) {
    const L = this.L
    sfx('levelup_effect')
    haptic('success')
    roller.forEach(o => this.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() }))
    confettiRain(this, layer, L.dw, { duration: 1400 })
    this.tweens.add({ targets: rays, alpha: 1, duration: 300 })

    const cy = L.cy - 50
    const card = this.add.container(L.cx, cy)
    layer.add(card)
    const r = rarityOf(drop)
    const g = this.add.graphics()
    g.fillStyle(r.dark).fillRoundedRect(-80, -80, 160, 160, 28)
    g.fillStyle(0xFFF8E8).fillRoundedRect(-75, -75, 150, 150, 24)
    g.fillStyle(r.color, 0.35).fillRoundedRect(-75, 35, 150, 40, { tl: 0, tr: 0, bl: 24, br: 24 })
    const icon = this.add.image(0, -10, dropIcon(drop))
    icon.setScale(96 / icon.width)
    const amount = makeText(this, 0, 54, `x${drop.amount}`, { size: 28, stroke: '#3b230d', strokeW: 5 })
    card.add([g, icon, amount])
    card.setScale(0)
    this.tweens.add({ targets: card, scale: 1, duration: 520, ease: 'Back.easeOut' })

    const name = drop.type === 'diamond' ? t('diamonds') : t(drop.id)
    const title = makeText(this, L.cx, cy - 130, t('you_got'), { size: 30, color: '#ffd84a', stroke: '#3b230d', strokeW: 6 })
    const sub = makeText(this, L.cx, cy + 112, `${drop.amount} ${name}`, { size: 24, stroke: '#3b230d', strokeW: 5 })
    fitText(sub, L.colW - 40)
    layer.add([title, sub])
    this.popIn([title, sub], { delay: 200 })

    const claim = new Button(this, L.cx, cy + 190, {
      w: 220,
      h: 64,
      color: 'green',
      label: t('claim'),
      pulse: true,
      onClick: () => {
        claim.disableInteractive()
        if (drop.type === 'diamond' && this.currencyBadges?.diamond) {
          const target = this.currencyBadges.diamond.getIconWorldPoint()
          const m = icon.getWorldTransformMatrix()
          const fly = this.add.image(m.tx / L.s, m.ty / L.s, 'ic_diamond').setScale(icon.scale)
          this.modalLayer.add(fly)
          flyArc(this, fly, target.x / L.s, target.y / L.s, {
            duration: 600,
            lift: 120,
            endScale: 24 / 256,
            onComplete: () => {
              fly.destroy()
              this.refreshCurrencies()
            },
          })
        }
        this.tweens.add({
          targets: layer,
          alpha: 0,
          delay: 250,
          duration: 300,
          onComplete: () => {
            layer.destroy()
            this.openLayer = null
            this.opening = false
            this.updatePriceButtons()
          },
        })
      },
    })
    layer.add(claim)
    this.popIn(claim, { delay: 450 })
  }

  handleBack() {
    if (this.opening)
      return
    super.handleBack()
  }
}
