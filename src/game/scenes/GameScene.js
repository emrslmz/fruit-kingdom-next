import Phaser from 'phaser'
import { admobService } from '@/core/services/admobService'
import { mobileService } from '@/core/services/MobileService'
import { toastService } from '@/core/services/ToastService'
import { powerUpKey, queueBackground } from '../assets'
import { BTN, FRUIT_COLORS, SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { haptic, player, sfx, t } from '../core/services'
import Board, { COLUMN_COUNT, TRAY_SIZE } from '../logic/Board'
import Button from '../ui/Button'
import CurrencyBadge from '../ui/CurrencyBadge'
import { drawPill, drawPlank, drawSlot } from '../ui/draw'
import { burst, confettiRain, floatText, flyArc, juiceBurst, shake, sunburst } from '../ui/effects'
import Modal, { drawRibbon } from '../ui/Modal'
import { openPowerUpPurchase } from '../ui/purchase'
import { fitText, inkText, makeText } from '../ui/text'
import Toggle from '../ui/Toggle'

const POWER_UPS = ['dynamite', 'brush', 'tornado']
const COMBO_KEYS = ['combo_good', 'combo_great', 'combo_awesome', 'combo_amazing']
const CONTINUE_COST = 50
const HINT_DELAY = 7000

function destroyAll(...objects) {
  for (const obj of objects)
    obj?.destroy()
}

/**
 * Oyun ekranı. Kurallar `logic/Board.js` modelinde; bu sahne modeli çizer
 * ve her hamlenin sonucunu canlandırır. Ekran boyutu değişirse sahne aynı
 * model ile (animasyonsuz) yeniden kurulur, oyun kaldığı yerden devam eder.
 */
export default class GameScene extends BaseScene {
  constructor() {
    super(SCENES.Game)
  }

  preload() {
    queueBackground(this, 'bg_marble')
  }

  getState() {
    return {
      level: this.level,
      board: this.board,
      continueUsed: this.continueUsed,
      endModal: this.endModalKind,
      paused: this.modals.some(m => m.kind === 'pause'),
      goalTypes: this.goalTypes,
    }
  }

  build(data) {
    const p = player()
    this.level = data.level ?? p.profile.gameLevel
    this.board = data.board ?? new Board(this.level)
    this.continueUsed = data.continueUsed ?? false
    this.endModalKind = null
    this.tiles = new Map()
    this.vTray = []
    this.matchGroups = new Map()
    this.combo = 0
    this.lastMatchAt = 0
    this.queuedTap = null
    this.returning = new Set()
    this.lastActionAt = this.time.now
    this.hintTween = null
    this.hintTile = null
    this.powerBusy = false
    this.dangerLevel = 0
    this.dangerTween = null
    this.phase = 'playing'
    this.bannerReserved = mobileService.isNative && !p.settings.adsRemoved
    this.goalTypes = Object.keys(this.board.remaining()).sort()
    if (data.goalTypes)
      this.goalTypes = data.goalTypes

    this.addBackground('bg_marble', { rotate: true, topShade: 0.3, bottomShade: 0.45 })
    this.G = this.computeGameLayout()

    this.boardBg = this.add.container(0, 0)
    this.boardLayer = this.add.container(0, 0)
    this.trayLayer = this.add.container(0, 0)
    this.hudLayer = this.add.container(0, 0)
    this.flyLayer = this.add.container(0, 0)
    this.fxLayer = this.add.container(0, 0)
    this.root.add([this.boardBg, this.boardLayer, this.trayLayer, this.hudLayer, this.flyLayer, this.fxLayer])

    this.buildBoardBackground()
    this.buildTray()
    this.buildPowerUps()
    this.buildHud()
    this.applyBoardMask()

    const intro = !data.instant && !data.board
    for (let c = 0; c < COLUMN_COUNT; c++)
      this.layoutColumn(c, intro ? 'intro' : 'none')
    this.restoreTray()
    this.updateGoals(false)

    if (intro) {
      this.showLevelBanner()
      sfx('start_effect')
    }

    if (this.bannerReserved && !data.instant)
      admobService.showBannerAd()
    this.events.once('shutdown', () => {
      if (this.bannerReserved)
        admobService.hideBannerAd()
    })

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickHint() })

    // Yeniden kurulumda açık olan pencereleri geri getir
    if (this.board.status === 'won') {
      this.phase = 'ended'
      this.time.delayedCall(50, () => this.showWinModal())
    }
    else if (this.board.status === 'lost') {
      this.phase = 'ended'
      this.time.delayedCall(50, () => (data.endModal === 'lose' || this.continueUsed) ? this.showLoseModal() : this.showContinueModal())
    }
    else if (data.paused) {
      this.time.delayedCall(50, () => this.openPause())
    }
  }

  // ===========================================================================
  // Düzen
  // ===========================================================================
  computeGameLayout() {
    const L = this.L
    const G = {}
    G.colW = Math.min(L.colW, 480)
    G.left = L.cx - G.colW / 2
    G.right = L.cx + G.colW / 2
    G.row1Y = L.top + 34

    const n = this.goalTypes.length
    G.goalRows = n > 8 ? 2 : 1
    G.goalsPerRow = Math.ceil(n / G.goalRows)
    G.goalsTop = G.row1Y + 34
    G.goalH = 34
    G.hudBottom = G.goalsTop + G.goalRows * (G.goalH + 4)

    // AdMob uyarlanabilir banner (~50-60px) + 10px kenar boşluğu, CSS pikseli
    G.bannerH = this.bannerReserved ? 72 / L.ui : 0
    const bottom = L.bottom - G.bannerH - 6
    G.powerSize = 62
    G.powerY = bottom - G.powerSize / 2 - 4
    G.trayW = Math.min(G.colW - 14, 440)
    G.slot = Math.min((G.trayW - 24) / TRAY_SIZE - 4, 56)
    G.slotGap = (G.trayW - 24 - G.slot * TRAY_SIZE) / (TRAY_SIZE - 1)
    G.trayH = G.slot + 22
    G.trayY = G.powerY - G.powerSize / 2 - 16 - G.trayH / 2
    G.trayTop = G.trayY - G.trayH / 2

    G.boardTop = G.hudBottom + 24
    G.boardBottom = G.trayTop - 12
    const boardH = G.boardBottom - G.boardTop
    const boardW = Math.min(G.colW - 16, 430)
    G.tile = Phaser.Math.Clamp(Math.min(boardW / 4.75, boardH / 5.4, 92), 40, 92)
    G.step = G.tile * 0.97
    G.colSpacing = Math.min(G.tile * 1.2, (boardW - G.tile) / 3)
    G.visibleRows = Math.max(2, Math.floor((boardH - G.tile * 0.3 - 4) / G.step))
    G.colX = c => L.cx + (c - (COLUMN_COUNT - 1) / 2) * G.colSpacing
    G.rowY = r => G.boardBottom - G.tile / 2 - 4 - r * G.step
    G.slotX = i => L.cx - (G.trayW - 24) / 2 + G.slot / 2 + i * (G.slot + G.slotGap)
    return G
  }

  get visibleRows() {
    return this.G.visibleRows
  }

  applyBoardMask() {
    const { s } = this.L
    const G = this.G
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xFFFFFF).fillRect(0, G.boardTop * s, this.L.W, (this.L.dh - G.boardTop) * s)
    this.boardLayer.setMask(g.createGeometryMask())
    this.events.once('shutdown', () => g.destroy())
  }

  // ===========================================================================
  // Tahta
  // ===========================================================================
  buildBoardBackground() {
    const G = this.G
    const g = this.add.graphics()
    const railW = G.tile * 1.08
    for (let c = 0; c < COLUMN_COUNT; c++) {
      const x = G.colX(c)
      g.fillStyle(0x000000, 0.16).fillRoundedRect(x - railW / 2, G.boardTop - 6, railW, G.boardBottom - G.boardTop + 10, railW * 0.3)
      g.lineStyle(2, 0xFFFFFF, 0.18).strokeRoundedRect(x - railW / 2, G.boardTop - 6, railW, G.boardBottom - G.boardTop + 10, railW * 0.3)
    }
    this.boardBg.add(g)

    this.hiddenBadges = []
    for (let c = 0; c < COLUMN_COUNT; c++) {
      const badge = this.add.container(G.colX(c), G.boardTop - 8)
      const bg = this.add.graphics()
      drawPill(bg, 0, 0, 48, 22, { fill: 0x3B230D, border: 0x1D1006 })
      const label = makeText(this, 0, 0, '', { size: 14, stroke: '#1d1006', strokeW: 3, shadowY: 1 })
      badge.add([bg, label])
      badge.label = label
      badge.setVisible(false)
      this.boardBg.add(badge)
      this.hiddenBadges.push(badge)
    }
  }

  createTile(fruit) {
    const t = this.G.tile
    const c = this.add.container(0, 0)
    const shadow = this.add.ellipse(0, t * 0.42, t * 0.86, t * 0.2, 0x000000, 0.2)
    const tile = this.add.image(0, 0, 'game-atlas', 'bisquit.png')
    tile.setScale(t / tile.frame.cutWidth * 0.98)
    const fr = this.textures.getFrame('game-atlas', `${fruit.type}.png`)
    const fruitImg = this.add.image(0, -t * 0.03, 'game-atlas', `${fruit.type}.png`)
    fruitImg.setScale((t * 0.74) / Math.max(fr.cutWidth, fr.cutHeight))
    c.add([shadow, tile, fruitImg])
    c.fruitImg = fruitImg
    c.fruitId = fruit.id
    c.fruitType = fruit.type

    if (fruit.bush) {
      const n = Phaser.Math.RND.pick([1, 2, 5, 1, 2])
      const bush = this.add.image(0, t * 0.04, 'game-atlas', `bush${n}.png`)
      bush.setScale((t * 1.12) / bush.frame.cutWidth)
      c.add(bush)
      c.bush = bush
      fruitImg.setAlpha(0.5)
    }
    if (fruit.ice > 0) {
      const ice = this.add.image(0, 0, 'game-atlas', 'freeze_box.png')
      ice.setScale((t * 1.02) / ice.frame.cutWidth)
      ice.setAlpha(0.35 + fruit.ice * 0.12)
      const cracks = this.add.graphics()
      c.add([ice, cracks])
      c.ice = ice
      c.cracks = cracks
      c.iceMax = Math.max(fruit.ice, 2)
      this.drawCracks(c, fruit.ice)
    }

    c.setSize(t, t)
    c.setInteractive({ useHandCursor: true })
    c.on('pointerdown', () => this.handleTap(fruit.id))
    this.boardLayer.add(c)
    this.tiles.set(fruit.id, c)
    return c
  }

  drawCracks(tile, hp) {
    const g = tile.cracks
    if (!g)
      return
    const t = this.G.tile
    g.clear()
    const damage = (tile.iceMax ?? 3) - hp
    if (damage <= 0)
      return
    const rnd = new Phaser.Math.RandomDataGenerator([tile.fruitId])
    g.lineStyle(2.2, 0xFFFFFF, 0.9)
    for (let i = 0; i < damage * 2; i++) {
      const a = rnd.realInRange(0, Math.PI * 2)
      let x = rnd.realInRange(-t * 0.1, t * 0.1)
      let y = rnd.realInRange(-t * 0.1, t * 0.1)
      g.beginPath()
      g.moveTo(x, y)
      for (let k = 0; k < 3; k++) {
        x += Math.cos(a + rnd.realInRange(-0.6, 0.6)) * t * 0.14
        y += Math.sin(a + rnd.realInRange(-0.6, 0.6)) * t * 0.14
        g.lineTo(x, y)
      }
      g.strokePath()
    }
  }

  /**
   * Bir sütundaki meyveleri modele göre konumlar. Görünür alana yeni giren
   * meyveler yukarıdan düşer.
   * @param {number} col
   * @param {'none'|'move'|'intro'} mode
   */
  layoutColumn(col, mode = 'move') {
    const G = this.G
    const fruits = this.board.columns[col]
    fruits.forEach((fruit, row) => {
      if (this.returning.has(fruit.id))
        return
      let tile = this.tiles.get(fruit.id)
      if (row > this.visibleRows) {
        if (tile) {
          this.tweens.killTweensOf(tile)
          this.tiles.delete(fruit.id)
          tile.destroy()
        }
        return
      }
      const x = G.colX(col)
      const y = G.rowY(row)
      const isNew = !tile
      if (!tile) {
        tile = this.createTile(fruit)
        tile.setPosition(x, mode === 'none' ? y : G.boardTop - G.tile * (mode === 'intro' ? 1 + row * 0.6 : 0.8))
      }
      const peek = row >= this.visibleRows
      tile.peek = peek
      tile.setAlpha(peek ? 0.75 : 1)
      if (peek)
        tile.disableInteractive()
      else if (!tile.input?.enabled)
        tile.setInteractive({ useHandCursor: true })

      if (mode === 'none') {
        tile.setPosition(x, y)
        return
      }
      if (Math.abs(tile.y - y) < 0.5 && Math.abs(tile.x - x) < 0.5)
        return
      this.tweens.killTweensOf(tile)
      tile.setScale(1).setAngle(0)
      const delay = mode === 'intro' ? col * 60 + row * 45 : (isNew ? 60 : row * 18)
      this.tweens.add({
        targets: tile,
        x,
        y,
        delay,
        duration: mode === 'intro' ? 650 : 420,
        ease: 'Bounce.easeOut',
      })
    })
    this.updateHiddenBadge(col)
  }

  updateHiddenBadge(col) {
    const badge = this.hiddenBadges[col]
    const hidden = Math.max(0, this.board.columns[col].length - this.visibleRows)
    if (!hidden) {
      if (badge.visible)
        this.tweens.add({ targets: badge, scale: 0, duration: 200, onComplete: () => badge.setVisible(false).setScale(1) })
      return
    }
    const str = `+${hidden}`
    if (badge.label.text !== str && badge.visible)
      this.tweens.add({ targets: badge, scale: { from: 1.25, to: 1 }, duration: 220 })
    badge.label.setText(str)
    badge.setVisible(true)
  }

  // ===========================================================================
  // Sepet (tray)
  // ===========================================================================
  buildTray() {
    const G = this.G
    const L = this.L
    this.trayDanger = this.add.graphics()
    this.trayDanger.fillStyle(0xFF2D2D, 1).fillRoundedRect(L.cx - G.trayW / 2 - 6, G.trayY - G.trayH / 2 - 6, G.trayW + 12, G.trayH + 12, 24)
    this.trayDanger.setAlpha(0)
    const plank = this.add.graphics()
    drawPlank(plank, G.trayW, G.trayH, { radius: 20, nails: false })
    plank.setPosition(L.cx, G.trayY)
    const slots = this.add.graphics()
    for (let i = 0; i < TRAY_SIZE; i++)
      drawSlot(slots, G.slotX(i), G.trayY, G.slot)
    this.trayLayer.add([this.trayDanger, plank, slots])
    this.trayPlank = plank
  }

  /** Yeniden kurulumda modeldeki sepeti animasyonsuz çizer. */
  restoreTray() {
    const G = this.G
    this.board.tray.forEach((fruit, i) => {
      const sprite = this.createTile(fruit)
      this.tiles.delete(fruit.id)
      sprite.disableInteractive()
      this.boardLayer.remove(sprite)
      this.trayLayer.add(sprite)
      sprite.setPosition(G.slotX(i), G.trayY).setScale(this.slotScale())
      this.vTray.push({ fruit, sprite, state: 'landed', matchGroup: null })
    })
    this.updateTrayDanger()
  }

  slotScale() {
    return (this.G.slot * 1.02) / this.G.tile
  }

  /** Görsel sepetteki meyveleri sıralarına göre kaydırır. */
  layoutTray() {
    const G = this.G
    this.vTray.forEach((entry, i) => {
      entry.index = i
      if (entry.state !== 'landed' || entry.popping)
        return
      const x = G.slotX(i)
      if (Math.abs(entry.sprite.x - x) > 0.5) {
        this.tweens.add({ targets: entry.sprite, x, y: G.trayY, duration: 170, ease: 'Quad.easeOut' })
      }
    })
    this.updateTrayDanger()
  }

  updateTrayDanger() {
    const count = this.vTray.filter(e => !e.matchGroup).length
    const level = count >= TRAY_SIZE - 1 ? 2 : (count >= TRAY_SIZE - 2 ? 1 : 0)
    if (level === this.dangerLevel)
      return
    this.dangerLevel = level
    this.dangerTween?.stop()
    if (!level) {
      this.tweens.add({ targets: this.trayDanger, alpha: 0, duration: 200 })
      return
    }
    this.trayDanger.setAlpha(0.15)
    this.dangerTween = this.tweens.add({
      targets: this.trayDanger,
      alpha: level === 2 ? 0.75 : 0.4,
      duration: level === 2 ? 320 : 600,
      yoyo: true,
      repeat: -1,
    })
  }

  // ===========================================================================
  // Dokunma
  // ===========================================================================
  handleTap(id) {
    if (this.phase !== 'playing' || this.modals.length)
      return
    if (this.vTray.length >= TRAY_SIZE) {
      // Görsel sepet dolu ama bir eşleşme patlamak üzere: dokunuşu sıraya al
      if (this.vTray.some(e => e.matchGroup))
        this.queuedTap = id
      else
        shake(this, this.trayLayer, { amount: 5, repeat: 2 })
      return
    }
    const res = this.board.tap(id, this.visibleRows)
    if (!res)
      return
    this.lastActionAt = this.time.now
    this.stopHint()

    if (res.kind === 'ice') {
      this.animateIce(id, res.hp)
      return
    }
    if (res.kind === 'full') {
      shake(this, this.trayLayer, { amount: 5, repeat: 2 })
      toastService.show(t('cannot_add_more_fruit'), 'warning', 1500)
      return
    }
    if (res.kind === 'pick')
      this.animatePick(res)
  }

  animateIce(id, hp) {
    const tile = this.tiles.get(id)
    sfx('ice_effect')
    haptic('click')
    if (!tile)
      return
    this.tweens.killTweensOf(tile)
    const x = this.G.colX(this.board.locate(id).col)
    tile.x = x
    this.tweens.add({ targets: tile, x: { from: x - 4, to: x + 4 }, duration: 45, yoyo: true, repeat: 2, onComplete: () => tile.setX(x) })
    this.tweens.add({ targets: tile, scale: { from: 0.92, to: 1 }, duration: 220, ease: 'Back.easeOut' })
    burst(this, this.fxLayer, tile.x, tile.y, { texture: 'fx_shard', tint: 0xCFF4FF, count: 6, speed: { min: 60, max: 160 }, scale: { start: 0.5, end: 0.1 }, rotate: { min: 0, max: 360 }, gravityY: 400 })
    if (hp > 0) {
      tile.ice?.setAlpha(0.35 + hp * 0.12)
      this.drawCracks(tile, hp)
      return
    }
    // buz tamamen kırıldı
    burst(this, this.fxLayer, tile.x, tile.y, { texture: 'fx_shard', tint: 0xE6FAFF, count: 14, speed: { min: 140, max: 320 }, scale: { start: 0.8, end: 0.1 }, rotate: { min: 0, max: 360 }, gravityY: 700 })
    const ice = tile.ice
    const cracks = tile.cracks
    tile.ice = null
    tile.cracks = null
    this.tweens.add({ targets: [ice, cracks], alpha: 0, scale: '*=1.25', duration: 220, onComplete: () => destroyAll(ice, cracks) })
    this.updateGoals(true)
  }

  removeBushVisual(tile, delay = 0) {
    const bush = tile.bush
    if (!bush)
      return
    tile.bush = null
    const fx = this.fxLayer
    const m = tile.getWorldTransformMatrix()
    const s = this.L.s
    const wx = m.tx / s
    const wy = m.ty / s
    this.time.delayedCall(delay, () => {
      if (!bush.scene)
        return
      const frame = bush.frame.name
      const sc = bush.scale * tile.scale
      bush.destroy()
      tile.fruitImg?.setAlpha(1)
      for (const dir of [-1, 1]) {
        const half = this.add.image(wx, wy, 'game-atlas', frame).setScale(sc)
        half.setCrop(dir < 0 ? 0 : half.frame.realWidth / 2, 0, half.frame.realWidth / 2, half.frame.realHeight)
        fx.add(half)
        this.tweens.add({ targets: half, x: wx + dir * 46, y: wy - 10, angle: dir * 40, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => half.destroy() })
      }
      burst(this, fx, wx, wy, { texture: 'fx_leaf', tint: [0x4CAF50, 0x7CB342, 0x2E7D32], count: 10, speed: { min: 80, max: 220 }, scale: { start: 0.7, end: 0.2 }, rotate: { min: 0, max: 360 }, gravityY: 260 })
    })
  }

  animatePick(res) {
    const G = this.G
    const fruit = res.fruit
    let sprite = this.tiles.get(fruit.id)
    this.tiles.delete(fruit.id)
    if (!sprite) {
      sprite = this.createTile(fruit)
      this.tiles.delete(fruit.id)
      sprite.setPosition(G.colX(res.col), G.rowY(res.row))
    }
    this.tweens.killTweensOf(sprite)
    sprite.disableInteractive()
    this.boardLayer.remove(sprite)
    this.flyLayer.add(sprite)
    sprite.setAlpha(1)
    if (res.wasBush) {
      sfx('bush_effect')
      this.removeBushVisual(sprite)
    }
    sfx('log_effect')
    haptic('click')

    // görsel sepete, aynı türün yanına ekle
    let insertAt = this.vTray.length
    for (let i = this.vTray.length - 1; i >= 0; i--) {
      if (this.vTray[i].fruit.type === fruit.type && !this.vTray[i].popping) {
        insertAt = i + 1
        break
      }
    }
    const entry = { fruit, sprite, state: 'flying', matchGroup: null }
    this.vTray.splice(insertAt, 0, entry)

    if (res.match) {
      const group = { id: Phaser.Math.RND.uuid(), type: res.match.type, ids: new Set(res.match.fruits.map(f => f.id)) }
      this.matchGroups.set(group.id, group)
      this.vTray.forEach((e) => {
        if (group.ids.has(e.fruit.id))
          e.matchGroup = group.id
      })
    }
    this.layoutTray()

    const target = { x: G.slotX(insertAt), y: G.trayY }
    this.tweens.add({
      targets: sprite,
      scale: 1.12,
      duration: 90,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flyArc(this, sprite, target.x, target.y, {
          duration: 360,
          lift: 40,
          curve: (target.x - sprite.x) * 0.15,
          endScale: this.slotScale(),
          ease: 'Sine.easeIn',
          onComplete: () => this.onLanded(entry),
        })
        this.tweens.add({ targets: sprite, angle: { from: 0, to: Phaser.Math.Between(-12, 12) }, duration: 360, yoyo: true })
      },
    })

    this.layoutColumn(res.col)
    this.updateGoals(true)
  }

  onLanded(entry) {
    if (!entry.sprite.scene)
      return
    entry.state = 'landed'
    const sprite = entry.sprite
    sprite.setAngle(0)
    this.flyLayer.remove(sprite)
    this.trayLayer.add(sprite)
    const sc = this.slotScale()
    this.tweens.add({ targets: sprite, scaleX: { from: sc * 1.18, to: sc }, scaleY: { from: sc * 0.85, to: sc }, duration: 260, ease: 'Back.easeOut' })
    sfx('put_effect')
    this.layoutTray()
    this.checkMatches()

    if (this.board.status === 'lost' && this.phase === 'playing' && this.vTray.every(e => e.state === 'landed'))
      this.onLost()
  }

  checkMatches() {
    for (const group of this.matchGroups.values()) {
      if (group.popping)
        continue
      const entries = this.vTray.filter(e => e.matchGroup === group.id)
      if (entries.length < 3 || entries.some(e => e.state !== 'landed'))
        continue
      group.popping = true
      for (const e of entries)
        e.popping = true
      this.popMatch(group, entries)
    }
  }

  popMatch(group, entries) {
    const G = this.G
    const mid = entries[1].sprite
    const sc = this.slotScale()
    const color = FRUIT_COLORS[group.type] ?? 0xFFFFFF
    entries.forEach((e) => {
      this.tweens.killTweensOf(e.sprite)
      this.tweens.add({ targets: e.sprite, x: mid.x, scale: sc * 1.15, duration: 150, delay: 40, ease: 'Quad.easeIn' })
    })
    this.time.delayedCall(200, () => {
      haptic('match')
      sfx('echopop_effect')
      juiceBurst(this, this.fxLayer, mid.x, G.trayY, color, 1)
      entries.forEach((e) => {
        this.tweens.add({ targets: e.sprite, scale: 0, alpha: 0, duration: 160, ease: 'Back.easeIn', onComplete: () => e.sprite.destroy() })
      })
      this.vTray = this.vTray.filter(e => !entries.includes(e))
      this.matchGroups.delete(group.id)
      this.showCombo(mid.x)
      this.time.delayedCall(120, () => {
        this.layoutTray()
        if (this.board.status === 'won' && this.phase === 'playing' && !this.matchGroups.size)
          this.onWon()
        else
          this.flushQueuedTap()
      })
    })
  }

  flushQueuedTap() {
    if (!this.queuedTap)
      return
    const id = this.queuedTap
    this.queuedTap = null
    if (this.board.locate(id))
      this.handleTap(id)
  }

  showCombo(x) {
    const now = this.time.now
    this.combo = now - this.lastMatchAt < 3200 ? this.combo + 1 : 1
    this.lastMatchAt = now
    const G = this.G
    floatText(this, this.fxLayer, x, G.trayY - G.trayH / 2 - 6, '+3', { size: 26, color: '#fff7c2', stroke: '#7a4a00', rise: 50, hold: 250 })
    if (this.combo >= 2) {
      const key = COMBO_KEYS[Math.min(this.combo - 2, COMBO_KEYS.length - 1)]
      const colors = ['#9bff8a', '#7fe3ff', '#ffd84a', '#ff9ef5']
      floatText(this, this.fxLayer, this.L.cx, (G.boardTop + G.boardBottom) / 2, t(key), {
        size: 42 + Math.min(this.combo, 5) * 3,
        color: colors[Math.min(this.combo - 2, colors.length - 1)],
        stroke: '#3b230d',
        strokeW: 8,
        rise: 70,
        hold: 500,
      })
      if (this.combo >= 4)
        this.cameras.main.shake(180, 0.004)
    }
  }

  // ===========================================================================
  // HUD
  // ===========================================================================
  buildHud() {
    const G = this.G
    const L = this.L
    const p = player()

    const pause = new Button(this, G.left + 32, G.row1Y, {
      w: 50,
      h: 50,
      color: 'blue',
      glyph: 'pause',
      onClick: () => this.openPause(),
    })

    const plaque = this.add.container(L.cx, G.row1Y)
    const pg = this.add.graphics()
    drawPlank(pg, 150, 46, { radius: 16 })
    const label = makeText(this, 0, -1, `${t('level')} ${this.level}`, { size: 25, stroke: '#3b230d', strokeW: 5, shadowY: 3 })
    fitText(label, 124)
    plaque.add([pg, label])

    this.diamondBadge = new CurrencyBadge(this, G.right - 52, G.row1Y, { w: 88, h: 30, icon: 'ic_diamond', value: p.currencies.diamonds })

    this.goalsContainer = this.add.container(0, 0)
    this.hudLayer.add([pause, plaque, this.diamondBadge, this.goalsContainer])
    this.goalChips = new Map()
    this.goalTypes.forEach((type) => {
      const chip = this.add.container(0, 0)
      const bg = this.add.graphics()
      const icon = this.add.image(0, 0, 'game-atlas', `${type}.png`)
      const count = makeText(this, 0, 0, '0', { size: 17, stroke: '#2b180a', strokeW: 3.5, shadowY: 1.5 })
      const check = this.add.graphics()
      chip.add([bg, icon, count, check])
      Object.assign(chip, { bg, icon, count, check, type, done: false })
      this.goalsContainer.add(chip)
      this.goalChips.set(type, chip)
    })
    this.layoutGoals()

    if (!this.sceneData.instant) {
      for (const obj of [pause, plaque, this.diamondBadge]) {
        const y = obj.y
        obj.y = y - 100
        this.tweens.add({ targets: obj, y, duration: 500, delay: 100, ease: 'Back.easeOut' })
      }
      this.goalsContainer.setAlpha(0)
      this.tweens.add({ targets: this.goalsContainer, alpha: 1, duration: 400, delay: 300 })
    }
  }

  layoutGoals() {
    const G = this.G
    const n = this.goalTypes.length
    const perRow = G.goalsPerRow
    const chipW = Math.min(62, (G.colW - 20) / perRow - 6)
    const chipH = G.goalH
    this.goalTypes.forEach((type, i) => {
      const chip = this.goalChips.get(type)
      const row = Math.floor(i / perRow)
      const inRow = Math.min(perRow, n - row * perRow)
      const col = i - row * perRow
      chip.x = this.L.cx + (col - (inRow - 1) / 2) * (chipW + 6)
      chip.y = G.goalsTop + chipH / 2 + row * (chipH + 4)
      chip.bg.clear()
      drawPill(chip.bg, 0, 0, chipW, chipH, { fill: 0x3B230D, alpha: 0.82, border: 0x1D1006 })
      const fr = chip.icon.frame
      chip.icon.setScale((chipH * 0.9) / Math.max(fr.cutWidth, fr.cutHeight))
      chip.icon.x = -chipW / 2 + chipH * 0.5
      chip.count.x = chipW / 2 - (chipW - chipH * 0.9) / 2 + 2
      chip.check.x = chip.count.x
      chip.chipW = chipW
    })
  }

  updateGoals(animate) {
    const remaining = this.board.remaining()
    for (const [type, chip] of this.goalChips) {
      const n = remaining[type] || 0
      const str = String(n)
      if (chip.count.text !== str) {
        chip.count.setText(str)
        fitText(chip.count, chip.chipW * 0.5)
        if (animate)
          this.tweens.add({ targets: chip, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.easeOut' })
      }
      if (n === 0 && !chip.done) {
        chip.done = true
        chip.count.setVisible(false)
        chip.check.clear()
        chip.check.fillStyle(0x16BB77).fillCircle(0, 0, 9)
        chip.check.lineStyle(3, 0xFFFFFF).beginPath().moveTo(-4, 0).lineTo(-1, 3.5).lineTo(4.5, -3.5).strokePath()
        chip.icon.setAlpha(0.55)
        if (animate)
          this.tweens.add({ targets: chip.check, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.easeOut' })
      }
    }
  }

  // ===========================================================================
  // Güçlendirmeler
  // ===========================================================================
  buildPowerUps() {
    const G = this.G
    const L = this.L
    this.powerButtons = {}
    const spacing = Math.min(96, G.colW / 3.4)
    POWER_UPS.forEach((id, i) => {
      const b = new Button(this, L.cx + (i - 1) * spacing, G.powerY, {
        w: G.powerSize,
        h: G.powerSize,
        shape: 'round',
        color: 'yellow',
        icon: powerUpKey(id),
        iconSize: G.powerSize * 0.78,
        onClick: () => this.usePowerUp(id),
      })
      this.hudLayer.add(b)
      this.powerButtons[id] = b
      if (!this.sceneData.instant) {
        const y = b.y
        b.y = y + 120
        this.tweens.add({ targets: b, y, duration: 520, delay: 200 + i * 80, ease: 'Back.easeOut' })
      }
    })
    this.refreshPowerUps()
  }

  refreshPowerUps() {
    const p = player()
    for (const id of POWER_UPS) {
      const qty = p.getPowerUpQuantity(id)
      const b = this.powerButtons[id]
      if (qty > 0)
        b.setBadge(qty, { color: 0xEE2747 })
      else
        b.setBadge('+', { color: 0x16BB77, stroke: '#04502f' })
    }
    this.diamondBadge?.setValue(p.currencies.diamonds)
  }

  usePowerUp(id) {
    if (this.phase !== 'playing' || this.powerBusy)
      return
    const p = player()
    if (p.getPowerUpQuantity(id) <= 0) {
      openPowerUpPurchase(this, id, { onPurchased: () => this.refreshPowerUps() })
      return
    }
    this.lastActionAt = this.time.now
    this.stopHint()

    if (id === 'dynamite') {
      const res = this.board.hammer(this.visibleRows)
      if (!res) {
        toastService.show(t('no_matching_3_fruits_to_explode'), 'warning')
        return
      }
      p.usePowerUp(id)
      this.animateHammer(res)
    }
    else if (id === 'brush') {
      if (!this.board.countBlocks().bushes) {
        toastService.show(t('no_bushes_on_board'), 'info')
        return
      }
      p.usePowerUp(id)
      const affected = this.board.clearBushes()
      this.animateSweep('brush', affected)
    }
    else if (id === 'tornado') {
      const { bushes, ices } = this.board.countBlocks()
      if (!bushes && !ices) {
        toastService.show(t('no_blocks_on_board'), 'info')
        return
      }
      p.usePowerUp(id)
      const affected = this.board.clearBlocks()
      this.animateSweep('tornado', affected)
    }
    this.refreshPowerUps()
    haptic('powerup')
  }

  animateHammer(res) {
    const G = this.G
    this.powerBusy = true
    sfx('pop_effect')
    const cols = new Set()
    res.items.forEach((item, i) => {
      cols.add(item.col)
      const tile = this.tiles.get(item.fruit.id)
      const x = tile ? tile.x : G.colX(item.col)
      const y = tile ? tile.y : G.boardTop + 10
      const hammer = this.add.image(x + 60, y - 120, 'pu_dynamite').setScale((G.tile * 0.9) / 256).setAngle(-40)
      this.fxLayer.add(hammer)
      this.tweens.add({
        targets: hammer,
        x,
        y: y - 10,
        angle: 20,
        delay: i * 140,
        duration: 260,
        ease: 'Back.easeIn',
        onComplete: () => {
          hammer.destroy()
          this.cameras.main.shake(120, 0.006)
          haptic('powerup')
          juiceBurst(this, this.fxLayer, x, y, FRUIT_COLORS[res.type] ?? 0xFFFFFF, 1.2)
          burst(this, this.fxLayer, x, y, { texture: 'fx_star', tint: 0xFFE066, count: 8, speed: { min: 120, max: 260 }, scale: { start: 0.5, end: 0 }, gravityY: 300 })
          if (tile) {
            this.tiles.delete(item.fruit.id)
            this.tweens.killTweensOf(tile)
            this.tweens.add({ targets: tile, scale: 0, angle: 90, alpha: 0, duration: 200, onComplete: () => tile.destroy() })
          }
        },
      })
    })
    this.time.delayedCall(res.items.length * 140 + 320, () => {
      cols.forEach(c => this.layoutColumn(c))
      // gizli satırdan silinen meyveler için de sütunu güncelle
      for (let c = 0; c < COLUMN_COUNT; c++) this.layoutColumn(c)
      this.updateGoals(true)
      floatText(this, this.fxLayer, this.L.cx, (G.boardTop + G.boardBottom) / 2, '+3', { size: 40, color: '#fff7c2', stroke: '#7a4a00' })
      this.powerBusy = false
      if (this.board.status === 'won' && !this.matchGroups.size)
        this.onWon()
    })
  }

  animateSweep(kind, affected) {
    const G = this.G
    this.powerBusy = true
    sfx(kind === 'brush' ? 'bush_powerup_effect' : 'wind_effect')
    const icon = this.add.image(G.left - 60, (G.boardTop + G.boardBottom) / 2, powerUpKey(kind))
    icon.setScale((G.tile * 1.6) / 256)
    this.fxLayer.add(icon)
    const duration = 900
    const from = G.left - 60
    const to = G.right + 60
    const p = { t: 0 }
    const done = new Set()
    this.tweens.add({
      targets: p,
      t: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        icon.x = from + (to - from) * p.t
        if (kind === 'tornado') {
          icon.y = (G.boardTop + G.boardBottom) / 2 + Math.sin(p.t * Math.PI * 3) * (G.boardBottom - G.boardTop) * 0.3
          icon.setScale(((G.tile * 1.6) / 256) * (1 + Math.sin(p.t * Math.PI * 10) * 0.06))
          icon.setAngle(Math.sin(p.t * Math.PI * 8) * 8)
        }
        else {
          icon.y = (G.boardTop + G.boardBottom) / 2 + Math.sin(p.t * Math.PI * 6) * 30
          icon.setAngle(-20 + Math.sin(p.t * Math.PI * 12) * 25)
        }
        affected.forEach((fruit) => {
          if (done.has(fruit.id))
            return
          const tile = this.tiles.get(fruit.id)
          if (!tile) {
            done.add(fruit.id)
            return
          }
          if (tile.x <= icon.x) {
            done.add(fruit.id)
            this.clearBlockVisual(tile)
          }
        })
      },
      onComplete: () => {
        this.tweens.add({ targets: icon, alpha: 0, duration: 200, onComplete: () => icon.destroy() })
        affected.forEach((fruit) => {
          const tile = this.tiles.get(fruit.id)
          if (tile && !done.has(fruit.id))
            this.clearBlockVisual(tile)
        })
        this.updateGoals(true)
        this.powerBusy = false
      },
    })
  }

  clearBlockVisual(tile) {
    if (tile.bush)
      this.removeBushVisual(tile)
    if (tile.ice) {
      const ice = tile.ice
      const cracks = tile.cracks
      tile.ice = null
      tile.cracks = null
      const m = tile.getWorldTransformMatrix()
      burst(this, this.fxLayer, m.tx / this.L.s, m.ty / this.L.s, { texture: 'fx_shard', tint: 0xE6FAFF, count: 10, speed: { min: 120, max: 260 }, scale: { start: 0.7, end: 0.1 }, rotate: { min: 0, max: 360 }, gravityY: 600 })
      this.tweens.add({ targets: [ice, cracks], alpha: 0, duration: 200, onComplete: () => destroyAll(ice, cracks) })
    }
  }

  // ===========================================================================
  // İpucu
  // ===========================================================================
  tickHint() {
    if (this.phase !== 'playing' || this.modals.length || this.hintTween || !player().settings.hintEnabled)
      return
    if (this.time.now - this.lastActionAt < HINT_DELAY)
      return
    const id = this.board.hint(this.visibleRows)
    const tile = id && this.tiles.get(id)
    if (!tile)
      return
    this.hintTile = tile
    this.hintTween = this.tweens.add({
      targets: tile,
      angle: { from: -7, to: 7 },
      scale: 1.08,
      duration: 160,
      yoyo: true,
      repeat: 5,
      repeatDelay: 40,
      onComplete: () => {
        tile.setAngle(0).setScale(1)
        this.hintTween = null
        this.lastActionAt = this.time.now - HINT_DELAY + 3500
      },
    })
  }

  stopHint() {
    if (this.hintTween) {
      this.hintTween.stop()
      this.hintTween = null
      this.hintTile?.setAngle(0).setScale(1)
    }
  }

  // ===========================================================================
  // Seviye başı / sonu
  // ===========================================================================
  showLevelBanner() {
    const L = this.L
    const G = this.G
    const c = this.add.container(L.cx, (G.boardTop + G.boardBottom) / 2)
    const g = this.add.graphics()
    drawRibbon(g, Math.min(300, L.colW - 90), 64, BTN.green)
    const text = makeText(this, 0, 0, `${t('level')} ${this.level}`, { size: 36, stroke: BTN.green.stroke, strokeW: 7, shadowY: 4 })
    fitText(text, Math.min(260, L.colW - 120))
    c.add([g, text])
    this.fxLayer.add(c)
    c.x = -L.colW
    this.tweens.chain({
      targets: c,
      tweens: [
        { x: L.cx, duration: 420, ease: 'Back.easeOut' },
        { scale: 1.06, duration: 300, yoyo: true },
        { x: L.dw + L.colW, duration: 380, delay: 350, ease: 'Back.easeIn', onComplete: () => c.destroy() },
      ],
    })
  }

  onWon() {
    if (this.phase === 'ended')
      return
    this.phase = 'ended'
    this.stopHint()
    const p = player()
    p.completeLevel(this.level, this.board.collected)
    sfx('levelup_effect')
    haptic('success')
    this.dangerTween?.stop()
    this.trayDanger.setAlpha(0)
    confettiRain(this, this.fxLayer, this.L.dw, { duration: 1800 })
    const G = this.G
    floatText(this, this.fxLayer, this.L.cx, (G.boardTop + G.boardBottom) / 2, t('level_completed'), { size: 40, color: '#ffe066', stroke: '#3b230d', strokeW: 8, rise: 40, hold: 700 })
    this.time.delayedCall(1100, () => this.showWinModal())
  }

  onLost() {
    if (this.phase === 'ended')
      return
    this.phase = 'ended'
    this.stopHint()
    sfx('error_effect')
    haptic('error')
    shake(this, this.trayLayer, { amount: 7, repeat: 4 })
    this.cameras.main.shake(220, 0.006)
    const G = this.G
    floatText(this, this.fxLayer, this.L.cx, G.trayY - G.trayH - 10, t('out_of_space'), { size: 34, color: '#ff8a8a', stroke: '#4a0a14', strokeW: 7, rise: 30, hold: 700 })
    this.time.delayedCall(1000, () => {
      if (this.continueUsed)
        this.showLoseModal()
      else
        this.showContinueModal()
    })
  }

  showWinModal() {
    this.endModalKind = 'win'
    const modal = new Modal(this, { w: 340, h: 470, title: `${t('level')} ${this.level}`, color: 'green', closable: false })
    modal.kind = 'win'
    const top = modal.innerTop
    sunburst(this, modal.body, 0, top + 62, 130, { color: 0xFFE9A0, alpha: 0.45 })
    const cup = this.add.image(0, top + 62, 'ic_cup')
    cup.setScale(110 / cup.width)
    this.tweens.add({ targets: cup, scale: { from: 0, to: cup.scale }, duration: 600, delay: 200, ease: 'Back.easeOut' })
    const title = makeText(this, 0, top + 136, t('level_completed'), { size: 28, color: '#ffd84a', stroke: '#7a4a00', strokeW: 6, shadowY: 3 })
    fitText(title, modal.w - 50)
    modal.body.add([cup, title])

    const collected = Object.entries(this.board.collected).filter(([, n]) => n > 0)
    const boxTop = top + 166
    const boxH = 130
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.08).fillRoundedRect(-modal.w / 2 + 26, boxTop, modal.w - 52, boxH, 16)
    const sub = inkText(this, 0, boxTop + 16, t('collected_fruits'), { size: 16, color: '#7a5a3a' })
    modal.body.add([g, sub])
    const perRow = Math.min(5, Math.max(1, collected.length))
    const rows = Math.ceil(collected.length / perRow)
    const cell = Math.min(54, (modal.w - 70) / perRow)
    collected.forEach(([type, n], i) => {
      const r = Math.floor(i / perRow)
      const inRow = Math.min(perRow, collected.length - r * perRow)
      const cx = ((i % perRow) - (inRow - 1) / 2) * cell
      const cy = boxTop + 50 + r * (rows > 1 ? 44 : 0) + (rows > 1 ? 0 : 12)
      const icon = this.add.image(cx, cy, 'game-atlas', `${type}.png`)
      icon.setScale((cell * 0.62) / 256 * 1.2)
      const cnt = makeText(this, cx + cell * 0.18, cy + cell * 0.22, `x${n}`, { size: 15, stroke: '#3b230d', strokeW: 3.5 })
      modal.body.add([icon, cnt])
      for (const o of [icon, cnt]) {
        const sc = o.scale
        o.setScale(0)
        this.tweens.add({ targets: o, scale: sc, delay: 500 + i * 70, duration: 300, ease: 'Back.easeOut' })
      }
    })

    const next = new Button(this, 0, modal.innerBottom - 92, {
      w: modal.w - 70,
      h: 62,
      color: 'green',
      label: t('next_level'),
      pulse: true,
      onClick: () => this.go(SCENES.Game, { level: player().profile.gameLevel }),
    })
    const home = new Button(this, 0, modal.innerBottom - 26, {
      w: modal.w - 110,
      h: 50,
      color: 'grey',
      label: t('home'),
      onClick: () => this.go(SCENES.Menu),
    })
    modal.body.add([next, home])
  }

  showContinueModal() {
    this.endModalKind = 'continue'
    const modal = new Modal(this, { w: 330, h: 450, title: t('oh_no'), color: 'purple', closable: false })
    modal.kind = 'continue'
    const top = modal.innerTop
    const msg = inkText(this, 0, top + 30, t('continue_message'), { size: 19, wrap: modal.w - 60, color: '#4c1d95' })
    fitText(msg, modal.w - 50, 60)

    // geri sayım halkası
    const ringY = top + 140
    const ring = this.add.graphics()
    const icon = this.add.image(0, ringY, 'ic_reverse').setScale(80 / 256)
    const counter = makeText(this, 0, ringY + 76, '7', { size: 22, stroke: '#3b0f7a', strokeW: 4 })
    modal.body.add([msg, ring, icon, counter])
    this.tweens.add({ targets: icon, angle: -360, duration: 2400, repeat: -1 })
    const total = 7000
    const state = { left: total }
    const drawRing = () => {
      ring.clear()
      ring.lineStyle(10, 0xD8C8F5, 1).strokeCircle(0, ringY, 52)
      ring.lineStyle(10, 0x8B5CF6, 1)
      ring.beginPath()
      ring.arc(0, ringY, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (state.left / total), false)
      ring.strokePath()
      counter.setText(String(Math.ceil(state.left / 1000)))
    }
    drawRing()
    const timer = this.tweens.add({
      targets: state,
      left: 0,
      duration: total,
      onUpdate: drawRing,
      onComplete: () => {
        if (!modal.closing)
          modal.close('decline')
      },
    })

    const diamonds = player().currencies.diamonds
    const accept = new Button(this, 0, modal.innerBottom - 92, {
      w: modal.w - 60,
      h: 62,
      color: 'purple',
      label: `${t('continue_for')} ${CONTINUE_COST}`,
      icon: 'ic_diamond',
      iconSize: 34,
      iconRight: true,
      pulse: true,
      onClick: () => {
        if (diamonds < CONTINUE_COST && player().currencies.diamonds < CONTINUE_COST) {
          toastService.show(t('not_enough_diamonds'), 'error')
          shake(this, accept)
          return
        }
        timer.stop()
        modal.close('accept')
      },
    })
    const decline = new Button(this, 0, modal.innerBottom - 26, {
      w: modal.w - 110,
      h: 48,
      color: 'red',
      label: t('no_thanks'),
      onClick: () => {
        timer.stop()
        modal.close('decline')
      },
    })
    modal.body.add([accept, decline])
    modal.opts.onClose = (result) => {
      timer.stop()
      if (result === 'accept')
        this.revive()
      else
        this.time.delayedCall(150, () => this.showLoseModal())
    }
  }

  revive() {
    const p = player()
    if (!p.spendCurrency('diamonds', CONTINUE_COST)) {
      this.showLoseModal()
      return
    }
    this.endModalKind = null
    this.continueUsed = true
    this.refreshPowerUps()
    toastService.show(t('continue_successful'), 'success')
    sfx('success_effect')
    const moves = this.board.revive()
    const G = this.G
    const movedIds = new Set(moves.map(m => m.fruit.id))
    const entries = this.vTray.filter(e => movedIds.has(e.fruit.id))
    this.vTray = this.vTray.filter(e => !movedIds.has(e.fruit.id))
    moves.forEach(m => this.returning.add(m.fruit.id))
    // geri dönen meyvelere yer açmak için sütunları hemen kaydır
    new Set(moves.map(m => m.col)).forEach(c => this.layoutColumn(c))
    entries.forEach((entry, i) => {
      const move = moves.find(m => m.fruit.id === entry.fruit.id)
      const sprite = entry.sprite
      this.trayLayer.remove(sprite)
      this.flyLayer.add(sprite)
      flyArc(this, sprite, G.colX(move.col), G.rowY(0), {
        delay: i * 90,
        duration: 480,
        lift: 60,
        endScale: 1,
        onComplete: () => {
          this.returning.delete(move.fruit.id)
          this.flyLayer.remove(sprite)
          this.boardLayer.add(sprite)
          this.tiles.set(move.fruit.id, sprite)
          sprite.setInteractive({ useHandCursor: true })
          this.layoutColumn(move.col)
        },
      })
    })
    this.layoutTray()
    this.time.delayedCall(700, () => {
      this.phase = 'playing'
      this.lastActionAt = this.time.now
    })
  }

  showLoseModal() {
    this.endModalKind = 'lose'
    const modal = new Modal(this, { w: 330, h: 400, title: `${t('level')} ${this.level}`, color: 'red', closable: false })
    modal.kind = 'lose'
    const top = modal.innerTop
    const heart = this.add.image(0, top + 70, 'ic_heart_broken').setScale(120 / 256)
    this.tweens.add({ targets: heart, angle: { from: -6, to: 6 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    const msg = makeText(this, 0, top + 150, t('level_failed'), { size: 30, color: '#ff6b81', stroke: '#4a0a14', strokeW: 6 })
    fitText(msg, modal.w - 50)
    const retry = new Button(this, 0, modal.innerBottom - 92, {
      w: modal.w - 70,
      h: 62,
      color: 'yellow',
      label: t('try_again'),
      glyph: 'refresh',
      pulse: true,
      onClick: () => this.go(SCENES.Game, { level: this.level }),
    })
    const home = new Button(this, 0, modal.innerBottom - 26, {
      w: modal.w - 110,
      h: 50,
      color: 'grey',
      label: t('home'),
      onClick: () => this.go(SCENES.Menu),
    })
    modal.body.add([heart, msg, retry, home])
  }

  // ===========================================================================
  // Duraklatma
  // ===========================================================================
  openPause() {
    if (this.phase === 'ended' || this.modals.length)
      return
    const p = player()
    this.stopHint()
    const modal = new Modal(this, { w: 330, h: 450, title: t('paused'), color: 'blue' })
    modal.kind = 'pause'
    const rows = [
      { key: 'music', badge: 'badge_music', value: () => p.settings.musicEnabled, set: v => p.updateSettings({ musicEnabled: v }) },
      { key: 'sound', badge: 'badge_sound', value: () => p.settings.soundEnabled, set: v => p.updateSettings({ soundEnabled: v }) },
      { key: 'vibration', badge: 'badge_vibration', value: () => p.settings.vibration, set: v => p.updateSettings({ vibration: v }) },
    ]
    let y = modal.innerTop + 30
    rows.forEach((row) => {
      const g = this.add.graphics()
      g.fillStyle(0x6B4724).fillRoundedRect(-modal.w / 2 + 26, y - 26, modal.w - 52, 52, 14)
      g.fillStyle(0xFCEEC9).fillRoundedRect(-modal.w / 2 + 28.5, y - 23.5, modal.w - 57, 47, 12)
      const badge = this.add.image(-modal.w / 2 + 54, y, row.badge).setScale(40 / 256)
      const label = inkText(this, -modal.w / 2 + 82, y, t(row.key), { size: 20, originX: 0 })
      fitText(label, modal.w - 200)
      const toggle = new Toggle(this, modal.w / 2 - 66, y, { value: row.value(), onChange: v => row.set(v) })
      modal.body.add([g, badge, label, toggle])
      y += 60
    })
    const btnW = modal.w - 70
    const resume = new Button(this, 0, modal.innerBottom - 152, {
      w: btnW,
      h: 56,
      color: 'green',
      label: t('resume'),
      glyph: 'play',
      onClick: () => modal.close(true),
    })
    const restart = new Button(this, 0, modal.innerBottom - 88, {
      w: btnW,
      h: 52,
      color: 'yellow',
      label: t('restart'),
      glyph: 'refresh',
      onClick: () => this.go(SCENES.Game, { level: this.level }),
    })
    const home = new Button(this, 0, modal.innerBottom - 28, {
      w: btnW,
      h: 50,
      color: 'red',
      label: t('home'),
      onClick: () => this.go(SCENES.Menu),
    })
    modal.body.add([resume, restart, home])
    modal.opts.onClose = () => {
      this.lastActionAt = this.time.now
    }
  }

  onAppPause() {
    this.openPause()
  }

  onBack() {
    if (this.phase === 'ended')
      return
    this.openPause()
  }

  handleBack() {
    const top = this.modals[this.modals.length - 1]
    if (top && top.kind !== 'pause' && !top.opts.closable)
      return
    super.handleBack()
  }
}
