import { powerUpKey, queueBackground } from '../assets'
import { SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { player, shop, t } from '../core/services'
import Button from '../ui/Button'
import { drawPanel } from '../ui/draw'
import { bob } from '../ui/effects'
import { openPowerUpPurchase } from '../ui/purchase'
import ScrollView from '../ui/ScrollView'
import { fitText, inkText, makeText } from '../ui/text'

// Her güçlendirme kartının rengi (Kenney'de kart paleti yok).
const CARD_COLORS = {
  dynamite: { fill: 0xFFE3DC, border: 0xD84A37, shade: 0xA8382A, glow: 0xFF9F8A },
  brush: { fill: 0xDFF0FF, border: 0x2F7DC2, shade: 0x215F94, glow: 0x8FD8FF },
  tornado: { fill: 0xECE4FF, border: 0x6D28D9, shade: 0x5B21B6, glow: 0xC4A8FF },
}

/** Market: güçlendirmeleri elmasla satın alma. */
export default class ShopScene extends BaseScene {
  constructor() {
    super(SCENES.Shop)
  }

  preload() {
    queueBackground(this, 'bg_market')
  }

  build() {
    const L = this.L
    this.addBackground('bg_market', { tint: 0x2B1706, tintAlpha: 0.25 })
    const top = this.addTopBar({ title: t('shop'), currencies: ['gold', 'diamond'] })

    const listW = Math.min(L.colW - 20, 460)
    const listTop = top + 12
    const listH = L.bottom - listTop - 8
    const sv = new ScrollView(this, this.root, L.cx - listW / 2, listTop, listW, listH)

    const items = shop().powerUps
    const cols = listW >= 380 ? 2 : 1
    const gap = 14
    const cardW = (listW - gap * (cols - 1) - 8) / cols
    const cardH = cols === 2 ? 270 : 150
    const cards = []
    items.forEach((item, i) => {
      // tek sayıda ürün varsa son kart ortalanır
      const lastOdd = cols === 2 && items.length % 2 === 1 && i === items.length - 1
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = lastOdd ? listW / 2 : 4 + col * (cardW + gap) + cardW / 2
      const y = 10 + row * (cardH + gap) + cardH / 2
      const card = this.buildCard(item, cardW, cardH, cols === 2, sv)
      card.setPosition(x, y)
      sv.content.add(card)
      cards.push(card)
    })
    const rowsCount = Math.ceil(items.length / cols)
    let y = 10 + rowsCount * (cardH + gap) + 6

    // daha fazla elmas kartı
    const more = this.add.container(listW / 2, y + 42)
    const mg = this.add.graphics()
    drawPanel(mg, listW - 8, 84, { radius: 20 })
    const icon = this.add.image(-(listW - 8) / 2 + 52, 0, 'dia3').setScale(70 / 256)
    const text = inkText(this, -(listW - 8) / 2 + 96, -2, t('get_more_diamonds'), { size: 19, originX: 0, wrap: listW - 250 })
    fitText(text, listW - 250, 60)
    const go = new Button(this, (listW - 8) / 2 - 62, -2, { w: 96, h: 48, color: 'yellow', glyph: 'plus', onClick: () => this.openPurchase('diamond') })
    sv.register(go)
    more.add([mg, icon, text, go])
    sv.content.add(more)
    cards.push(more)
    y += 100
    sv.setContentHeight(y)
    this.popIn(cards, { delay: 120, stagger: 70 })
  }

  buildCard(item, w, h, tall, sv) {
    const c = this.add.container(0, 0)
    const color = CARD_COLORS[item.id] ?? CARD_COLORS.brush
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 2, -h / 2 + 7, w, h, 22)
    g.fillStyle(color.shade).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 22)
    g.fillStyle(color.border).fillRoundedRect(-w / 2, -h / 2, w, h, 22)
    g.fillStyle(color.fill).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 18)
    g.fillStyle(0xFFFFFF, 0.5).fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, 14, 7)
    c.add(g)

    const owned = player().getPowerUpQuantity(item.id)
    const iconX = tall ? 0 : -w / 2 + 62
    const iconY = tall ? -h / 2 + 70 : -6
    const glow = this.add.image(iconX, iconY, 'fx_glow').setTint(color.glow).setAlpha(0.7).setScale(130 / 64)
    const icon = this.add.image(iconX, iconY, powerUpKey(item.id))
    icon.setScale((tall ? 96 : 84) / icon.width)
    bob(this, icon, 5, 1300 + Math.random() * 400)
    c.add([glow, icon])

    const ownedBadge = makeText(this, iconX + 38, iconY + 34, `x${owned}`, { size: 18, stroke: '#3b230d', strokeW: 4 })
    c.add(ownedBadge)

    const textX = tall ? 0 : -w / 2 + 122
    const nameY = tall ? -h / 2 + 138 : -h / 2 + 32
    const name = makeText(this, textX, nameY, t(item.name), { size: 22, stroke: toCssColor(color.shade), strokeW: 5, originX: tall ? 0.5 : 0 })
    fitText(name, tall ? w - 24 : w - 140)
    const desc = inkText(this, textX, nameY + (tall ? 30 : 30), t(item.description), {
      size: 14,
      wrap: tall ? w - 30 : w - 140,
      originX: tall ? 0.5 : 0,
      originY: 0,
      color: '#4a2e1b',
    })
    fitText(desc, tall ? w - 24 : w - 140, tall ? 44 : 40)
    c.add([name, desc])

    const btnW = tall ? w - 36 : Math.min(150, w - 140)
    const btn = new Button(this, tall ? 0 : textX + btnW / 2, h / 2 - 34, {
      w: btnW,
      h: 48,
      color: 'green',
      label: String(item.price),
      icon: 'ic_diamond',
      iconSize: 28,
      iconRight: true,
      onClick: () => openPowerUpPurchase(this, item.id, {
        onPurchased: () => {
          this.refreshCurrencies()
          ownedBadge.setText(`x${player().getPowerUpQuantity(item.id)}`)
          this.tweens.add({ targets: [icon, ownedBadge], scale: '*=1.2', duration: 160, yoyo: true })
        },
      }),
    })
    sv.register(btn)
    c.add(btn)
    return c
  }
}

function toCssColor(color) {
  return `#${color.toString(16).padStart(6, '0')}`
}
