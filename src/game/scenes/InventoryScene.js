import { powerUpKey, queueBackground } from '../assets'
import { SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { player, t } from '../core/services'
import { FRUIT_TYPES } from '../logic/fruits'
import Button from '../ui/Button'
import { drawCard, drawPanel } from '../ui/draw'
import ScrollView from '../ui/ScrollView'
import { fitText, inkText, makeText } from '../ui/text'

const TABS = ['all', 'fruits', 'powerups']

/** Envanter: toplanan meyveler ve güçlendirmeler (sekmeli ızgara). */
export default class InventoryScene extends BaseScene {
  constructor() {
    super(SCENES.Inventory)
  }

  preload() {
    queueBackground(this, 'bg_grass')
  }

  getState() {
    return { tab: this.tab }
  }

  build(data) {
    const L = this.L
    this.tab = data.tab ?? 'all'
    this.sv = null
    this.addBackground('bg_grass', { rotate: true })
    const top = this.addTopBar({ title: t('inventory'), currencies: ['gold', 'diamond'] })

    const panelW = Math.min(L.colW - 20, 460)
    const tabsY = top + 34
    const tabW = Math.min(130, (panelW - 20) / 3)
    this.tabButtons = {}
    TABS.forEach((key, i) => {
      const b = new Button(this, L.cx + (i - 1) * (tabW + 8), tabsY, {
        w: tabW,
        h: 46,
        color: key === this.tab ? 'yellow' : 'wood',
        label: t(key),
        labelSize: 18,
        onClick: () => this.selectTab(key),
      })
      this.root.add(b)
      this.tabButtons[key] = b
    })
    this.popIn(Object.values(this.tabButtons), { delay: 80, stagger: 50 })

    const panelTop = tabsY + 34
    const panelH = L.bottom - panelTop - 10
    const panel = this.add.container(L.cx, panelTop + panelH / 2)
    const pg = this.add.graphics()
    drawPanel(pg, panelW, panelH)
    panel.add(pg)
    this.root.add(panel)
    this.panel = panel
    this.panelW = panelW
    this.panelH = panelH
    this.renderItems(!data.instant)
    this.popIn(panel, { delay: 40, dy: 40, scale: 0.96 })
  }

  selectTab(key) {
    if (key === this.tab)
      return
    this.tab = key
    for (const [k, b] of Object.entries(this.tabButtons))
      b.setColor(k === key ? 'yellow' : 'wood')
    this.renderItems(true)
  }

  collectItems() {
    const p = player()
    const items = []
    if (this.tab !== 'fruits') {
      p.inventory.powerUps.filter(pu => pu.quantity > 0 && this.textures.exists(powerUpKey(pu.id))).forEach((pu) => {
        items.push({ key: powerUpKey(pu.id), frame: null, name: t(pu.id), count: pu.quantity })
      })
    }
    if (this.tab !== 'powerups') {
      FRUIT_TYPES.forEach((fruit) => {
        const n = p.inventory.fruitInventory[fruit.id] || 0
        if (n > 0)
          items.push({ key: 'game-atlas', frame: `${fruit.id}.png`, name: t(`fruit_${fruit.id}`, null, fruit.name), count: n })
      })
    }
    return items
  }

  renderItems(animate) {
    this.sv?.destroy()
    this.sv?.container.destroy()
    const w = this.panelW - 36
    const h = this.panelH - 40
    const sv = new ScrollView(this, this.panel, -w / 2, -this.panelH / 2 + 18, w, h)
    this.sv = sv
    const items = this.collectItems()

    if (!items.length) {
      const mascot = this.add.image(w / 2, h * 0.4, 'mascot_sad')
      mascot.setScale(Math.min(170, h * 0.5) / mascot.height)
      const text = inkText(this, w / 2, h * 0.4 + mascot.displayHeight / 2 + 30, t('inventory_empty'), { size: 18, wrap: w - 40, color: '#6b4724' })
      sv.content.add([mascot, text])
      return
    }

    const cols = w >= 380 ? 4 : 3
    const gap = 10
    const cell = (w - gap * (cols - 1)) / cols
    const cellH = cell + 24
    const cells = []
    items.forEach((item, i) => {
      const x = (i % cols) * (cell + gap) + cell / 2
      const y = Math.floor(i / cols) * (cellH + gap) + cellH / 2 + 4
      const c = this.add.container(x, y)
      const g = this.add.graphics()
      drawCard(g, 0, 0, cell, cellH, { radius: 16 })
      const img = item.frame ? this.add.image(0, -10, item.key, item.frame) : this.add.image(0, -10, item.key)
      img.setScale((cell * 0.62) / 256 * (item.frame ? 1.15 : 1))
      const count = makeText(this, cell / 2 - 16, -cellH / 2 + 16, `x${item.count}`, { size: 16, stroke: '#3b230d', strokeW: 4, originX: 1 })
      count.x = cell / 2 - 8
      const name = inkText(this, 0, cellH / 2 - 16, item.name, { size: 14, color: '#6b4724' })
      fitText(name, cell - 10)
      c.add([g, img, count, name])
      sv.content.add(c)
      cells.push(c)
    })
    sv.setContentHeight(Math.ceil(items.length / cols) * (cellH + gap) + 8)
    if (animate) {
      cells.forEach((c, i) => {
        c.setScale(0.6).setAlpha(0)
        this.tweens.add({ targets: c, scale: 1, alpha: 1, delay: 40 + Math.min(i, 16) * 30, duration: 300, ease: 'Back.easeOut' })
      })
    }
  }
}
