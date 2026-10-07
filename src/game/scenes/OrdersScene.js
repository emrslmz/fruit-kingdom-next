import Phaser from 'phaser'
import { toastService } from '@/core/services/ToastService'
import { queueBackground } from '../assets'
import { SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { formatDuration, haptic, player, sfx, t } from '../core/services'
import Button from '../ui/Button'
import { drawCard, drawPill } from '../ui/draw'
import { burst, flyArc } from '../ui/effects'
import { confirmModal } from '../ui/purchase'
import ScrollView from '../ui/ScrollView'
import { fitText, inkText, makeText } from '../ui/text'

/** Siparişler: müşterilerin istediği meyveleri teslim edip altın kazanma. */
export default class OrdersScene extends BaseScene {
  constructor() {
    super(SCENES.Orders)
  }

  preload() {
    queueBackground(this, 'bg_orders')
  }

  build() {
    const L = this.L
    player().generateOrders()
    this.addBackground('bg_orders', { tint: 0x2B1706, tintAlpha: 0.15 })
    const top = this.addTopBar({ title: t('orders'), currencies: ['energy', 'gold'] })

    this.listW = Math.min(L.colW - 20, 460)
    this.listTop = top + 12
    this.sv = new ScrollView(this, this.root, L.cx - this.listW / 2, this.listTop, this.listW, L.bottom - this.listTop - 8)
    this.renderOrders(true)

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() })
  }

  renderOrders(animate) {
    const sv = this.sv
    sv.content.removeAll(true)
    this.timerTexts = []
    const p = player()
    const w = this.listW - 8
    const h = 176
    const gap = 16
    const cards = []
    p.orders.forEach((order, index) => {
      if (!order)
        return
      const card = this.buildOrderCard(order, index, w, h)
      card.setPosition(this.listW / 2, 8 + cards.length * (h + gap) + h / 2)
      sv.content.add(card)
      cards.push(card)
    })

    const total = p.stats.totalOrdersCompleted || 0
    let y = 8 + cards.length * (h + gap)
    if (total > 0) {
      const banner = this.add.container(this.listW / 2, y + 24)
      const g = this.add.graphics()
      drawPill(g, 0, 0, w - 40, 40, { fill: 0x3B230D, alpha: 0.85 })
      const txt = makeText(this, 0, 0, t('all_orders_completed', { count: total }), { size: 15, stroke: '#1d1006', strokeW: 3 })
      fitText(txt, w - 70)
      banner.add([g, txt])
      sv.content.add(banner)
      y += 60
    }
    sv.setContentHeight(y + 10)
    if (animate)
      this.popIn(cards, { delay: 100, stagger: 90, dy: 50 })
  }

  buildOrderCard(order, index, w, h) {
    const p = player()
    const c = this.add.container(0, 0)
    const character = p.characters.find(ch => ch.id === order.characterId) || { name: '?', spriteName: 'c1.png', rarity: 'common' }
    const rare = character.rarity === 'rare'
    const g = this.add.graphics()
    drawCard(g, 0, 0, w, h, { radius: 22, fill: 0xFFFAE8, border: rare ? 0x7C3AED : 0x6B4724, shade: rare ? 0x4C1D95 : 0xC9A46A })
    c.add(g)

    // portre
    const px = -w / 2 + 64
    const pg = this.add.graphics()
    pg.fillStyle(rare ? 0xE9DDFF : 0xF6E7C1).fillRoundedRect(px - 50, -h / 2 + 12, 100, h - 24, 18)
    pg.fillStyle(0xFFFFFF, 0.5).fillEllipse(px, -h / 2 + 40, 70, 30)
    c.add(pg)
    if (this.textures.get('chars').has(character.spriteName)) {
      const img = this.add.image(px, h / 2 - 14, 'chars', character.spriteName).setOrigin(0.5, 1)
      img.setScale(Math.min((h - 30) / img.frame.cutHeight, 92 / img.frame.cutWidth))
      c.add(img)
      this.tweens.add({ targets: img, scaleY: img.scaleY * 1.025, duration: 1200 + index * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    if (rare) {
      const star = this.add.image(px + 38, -h / 2 + 20, 'ic_star').setScale(30 / 256)
      c.add(star)
    }

    const left = -w / 2 + 128
    const right = w / 2 - 14
    const name = makeText(this, left, -h / 2 + 28, character.name, { size: 24, originX: 0, stroke: '#3b230d', strokeW: 5 })
    fitText(name, right - left - 60)
    c.add(name)

    const refresh = new Button(this, right - 20, -h / 2 + 28, {
      w: 40,
      h: 40,
      shape: 'round',
      color: 'blue',
      glyph: 'refresh',
      onClick: () => this.refreshOrder(index),
    })
    this.sv.register(refresh)
    c.add(refresh)

    // istenen meyveler
    const reqs = Object.entries(order.requirements || {})
    const reqRow = this.add.container(left, -h / 2 + 72)
    let rx = 0
    let collected = 0
    let required = 0
    reqs.forEach(([fruitId, need]) => {
      const have = p.inventory.fruitInventory[fruitId] || 0
      collected += Math.min(have, need)
      required += need
      const icon = this.add.image(rx + 17, 0, 'game-atlas', `${fruitId}.png`).setScale(36 / 256 * 1.15)
      const ok = have >= need
      const txt = makeText(this, rx + 36, 2, `${Math.min(have, need)}/${need}`, { size: 16, originX: 0, color: ok ? '#9bff8a' : '#ffffff', stroke: '#3b230d', strokeW: 4 })
      reqRow.add([icon, txt])
      rx += 36 + txt.width + 6
    })
    const reqMax = right - left - 74
    if (rx > reqMax)
      reqRow.setScale(reqMax / rx)
    c.add(reqRow)

    // ilerleme çubuğu
    const barW = right - left
    const barY = -h / 2 + 104
    const bar = this.add.graphics()
    drawPill(bar, left + barW / 2, barY, barW, 18, { fill: 0x5A3A22, gloss: false })
    const ratio = required ? collected / required : 0
    if (ratio > 0) {
      bar.fillStyle(0x7EC12F).fillRoundedRect(left + 2, barY - 7, Math.max(14, (barW - 4) * ratio), 14, 7)
      bar.fillStyle(0xFFFFFF, 0.25).fillRoundedRect(left + 4, barY - 6, Math.max(10, (barW - 8) * ratio), 5, 3)
    }
    c.add(bar)

    // ödül (sağ üst, istenen meyvelerin hizasında)
    const reward = makeText(this, right - 4, -h / 2 + 72, `+${order.reward}`, { size: 22, originX: 1, color: '#ffd84a', stroke: '#6b3d17', strokeW: 4.5 })
    const coin = this.add.image(right - 10 - reward.width - 14, -h / 2 + 72, 'ic_gold').setScale(32 / 256)
    // süre (sol alt)
    const bottomY = h / 2 - 30
    const watch = this.add.image(left + 10, bottomY, 'ic_stopwatch').setScale(22 / 90)
    const timer = inkText(this, left + 24, bottomY, formatDuration(order.expiresAt - Date.now()), { size: 15, originX: 0, color: '#7a5a3a' })
    timer.order = order
    this.timerTexts.push(timer)
    c.add([watch, timer, coin, reward])

    const can = this.canFulfill(order)
    const deliver = new Button(this, right - 58, bottomY, {
      w: 116,
      h: 46,
      color: can ? 'green' : 'grey',
      label: t('deliver'),
      labelSize: 18,
      pulse: can,
      onClick: () => this.deliver(order, deliver, c),
    })
    this.sv.register(deliver)
    // enerji maliyeti rozeti
    const eb = this.add.container(right - 112, bottomY - 22)
    const eg = this.add.graphics()
    drawPill(eg, 0, 0, 46, 22, { fill: 0x1C9FD7, border: 0x146587 })
    const ei = this.add.image(-12, 0, 'ic_energy').setScale(20 / 1024)
    const et = makeText(this, 6, 0, String(p.orderEnergyCost), { size: 13, stroke: '#0e4a63', strokeW: 3 })
    eb.add([eg, ei, et])
    c.add([deliver, eb])
    return c
  }

  canFulfill(order) {
    const p = player()
    if (p.energy.current < p.orderEnergyCost)
      return false
    return Object.entries(order.requirements || {}).every(([id, n]) => (p.inventory.fruitInventory[id] || 0) >= n)
  }

  deliver(order, button, card) {
    const p = player()
    if (p.energy.current < p.orderEnergyCost) {
      toastService.show(t('not_enough_energy'), 'warning')
      return
    }
    if (!this.canFulfill(order)) {
      toastService.show(t('not_enough_fruits'), 'warning')
      return
    }
    const result = p.completeOrder(order.id)
    if (!result.success) {
      toastService.show(t(result.message), 'warning')
      this.renderOrders(false)
      return
    }
    sfx('done_effect')
    haptic('success')
    button.setDisabled(true)
    // altınlar üst çubuktaki rozete uçar
    const s = this.L.s
    const m = button.getWorldTransformMatrix()
    const from = { x: m.tx / s, y: m.ty / s }
    const badge = this.currencyBadges.gold
    const target = badge.getIconWorldPoint()
    burst(this, this.root, from.x, from.y, { texture: 'fx_star', tint: 0xFFE066, count: 10, speed: { min: 80, max: 220 }, scale: { start: 0.5, end: 0 }, gravityY: 200 })
    const coins = Math.min(8, Math.max(3, result.reward))
    for (let i = 0; i < coins; i++) {
      const coin = this.add.image(from.x + Phaser.Math.Between(-20, 20), from.y + Phaser.Math.Between(-10, 10), 'ic_gold').setScale(30 / 256)
      this.root.add(coin)
      flyArc(this, coin, target.x / s, target.y / s, {
        delay: i * 60,
        duration: 650,
        lift: 120,
        curve: Phaser.Math.Between(-60, 60),
        endScale: 22 / 256,
        onComplete: () => {
          coin.destroy()
          if (i === coins - 1)
            this.refreshCurrencies()
        },
      })
    }
    this.tweens.add({
      targets: card,
      x: card.x + this.listW,
      alpha: 0,
      delay: 450,
      duration: 380,
      ease: 'Back.easeIn',
      onComplete: () => this.renderOrders(true),
    })
    toastService.show(`${t('gold_won')}: +${result.reward}`, 'success', 1800)
  }

  async refreshOrder(index) {
    const ok = await confirmModal(this, {
      title: t('refresh_order'),
      message: t('refresh_order_message'),
      confirmText: t('yes'),
      cancelText: t('no'),
      confirmColor: 'blue',
    })
    if (!ok || !this.sys.isActive())
      return
    const result = player().removeOrder(index)
    if (result.success) {
      toastService.show(t('order_removed'), 'success', 1500)
      this.renderOrders(true)
    }
  }

  tick() {
    let expired = false
    for (const text of this.timerTexts || []) {
      if (!text.active)
        continue
      const left = text.order.expiresAt - Date.now()
      if (left <= 0)
        expired = true
      text.setText(formatDuration(left))
    }
    if (expired) {
      player().generateOrders()
      this.renderOrders(true)
    }
  }
}
