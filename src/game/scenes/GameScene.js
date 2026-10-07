import Phaser from 'phaser'
import { toastService } from '@/core/services/ToastService'
import { powerUpKey, queueBackground } from '../assets'
import { BTN, FRUIT_COLORS, SCENES } from '../config'
import { setupBannerDock } from '../core/banner'
import BaseScene from '../core/BaseScene'
import { haptic, player, sfx, t } from '../core/services'
import Board, { COLUMN_COUNT, TRAY_SIZE } from '../logic/Board'
import { CONTINUE_COST, EXTRA_TIME_SECONDS, formatClock, levelTimeLimit, STAR_THRESHOLDS, starsFor } from '../logic/timing'
import Button from '../ui/Button'
import { drawPill, drawPlank, drawSlot } from '../ui/draw'
import { burst, confettiRain, floatText, flyArc, juiceBurst, shake, sunburst } from '../ui/effects'
import Modal, { drawRibbon } from '../ui/Modal'
import { openPowerUpPurchase } from '../ui/purchase'
import { fitText, inkText, makeText } from '../ui/text'
import Toggle from '../ui/Toggle'

const POWER_UPS = ['dynamite', 'brush', 'tornado']
const COMBO_KEYS = ['combo_good', 'combo_great', 'combo_awesome', 'combo_amazing']
const HINT_DELAY = 7000
const OUT_COUNTDOWN = 8000 // süre doldu / yer kalmadı penceresi otomatik kapanma süresi

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
      extraTimeUsed: this.extraTimeUsed,
      endModal: this.endModalKind,
      paused: this.modals.some(m => m.kind === 'pause'),
      goalTypes: this.goalTypes,
      timeLeft: this.timeLeft,
      timerStarted: this.timerRunning,
      resultStars: this.resultStars,
    }
  }

  build(data) {
    const p = player()
    this.level = data.level ?? p.profile.gameLevel
    this.board = data.board ?? new Board(this.level)
    this.continueUsed = data.continueUsed ?? false
    this.extraTimeUsed = data.extraTimeUsed ?? false
    this.timeLimit = levelTimeLimit(this.board.stats, this.level) * 1000
    this.timeLeft = data.timeLeft ?? this.timeLimit
    this.timerRunning = data.timerStarted ?? false
    this.resultStars = data.resultStars ?? null
    this.shownSecond = null
    this.litStars = 0
    this.tooltip = null
    this.aimUI = null
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
    this.goalTypes = Object.keys(this.board.remaining()).sort()
    if (data.goalTypes)
      this.goalTypes = data.goalTypes

    this.addBackground('bg_marble', { rotate: true, topShade: 0.3, bottomShade: 0.45 })
    this.bannerH = setupBannerDock(this)
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
    else if (!this.timerRunning && this.board.status === 'playing') {
      // seviye şeridi bitmeden yeniden kurulduk (döndürme, banner yüksekliği): şeridi tekrar göster
      this.showLevelBanner()
    }
    this.renderTimer(true)

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickHint() })

    // Yeniden kurulumda açık olan pencereleri geri getir
    if (this.board.status !== 'playing') {
      this.phase = 'ended'
      this.time.delayedCall(50, () => {
        if (this.resultStars !== null)
          this.resultStars > 0 ? this.showWinModal(this.resultStars) : this.showLoseModal()
        else if (this.board.status === 'won')
          this.finishLevel()
        else
          this.showOutModal(this.board.status === 'timeout' ? 'time' : 'space')
      })
    }
    else if (data.paused) {
      this.time.delayedCall(50, () => this.openPause())
    }
  }

  // ===========================================================================
  // Süre
  // ===========================================================================
  update(_time, delta) {
    if (!this.timerRunning || !this.board || this.board.status !== 'playing')
      return
    if ((this.phase !== 'playing' && this.phase !== 'aiming') || this.modals.length || this.isTransitioning)
      return
    this.timeLeft -= delta
    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.renderTimer()
      this.onTimeUp()
      return
    }
    this.renderTimer()
  }

  startTimer() {
    if (this.timerRunning || this.board.status !== 'playing')
      return
    this.timerRunning = true
    const G = this.G
    floatText(this, this.fxLayer, this.L.cx, (G.boardTop + G.boardBottom) / 2, t('go'), { size: 46, color: '#9bff8a', stroke: '#04502f', strokeW: 8, rise: 40, hold: 350 })
    this.tweens.add({ targets: this.timerPill, scale: { from: 1.25, to: 1 }, duration: 400, ease: 'Back.easeOut' })
  }

  /** Sayaç yazısını ve kalan süre uyarılarını günceller (saniye değişince). */
  renderTimer(force = false) {
    if (!this.timerText)
      return
    const sec = Math.ceil(this.timeLeft / 1000)
    if (sec === this.shownSecond && !force)
      return
    this.shownSecond = sec
    this.timerText.setText(formatClock(this.timeLeft))
    const level = sec <= 10 ? 2 : (sec <= 20 ? 1 : 0)
    this.timerText.setColor(level === 2 ? '#ff6b6b' : (level === 1 ? '#ffd84a' : '#ffffff'))
    if (!force && level === 2 && this.board.status === 'playing') {
      sfx('click_effect')
      this.tweens.add({ targets: this.timerPill, scale: { from: 1.18, to: 1 }, duration: 300, ease: 'Back.easeOut' })
      if (sec <= 5)
        this.cameras.main.shake(80, 0.002)
    }
    if (level !== this.timeWarnLevel) {
      this.timeWarnLevel = level
      this.timeWarnTween?.stop()
      this.timeWarnTween = null
      if (level === 2) {
        this.timeVignette.setAlpha(0)
        this.timeWarnTween = this.tweens.add({ targets: this.timeVignette, alpha: 0.85, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      }
      else {
        this.timeVignette.setAlpha(0)
      }
    }
  }

  onTimeUp() {
    if (this.phase === 'ended')
      return
    this.exitAim()
    this.board.expire()
    this.phase = 'ended'
    this.stopHint()
    this.hidePowerTooltip()
    this.stopTimeWarning()
    sfx('error_effect')
    haptic('error')
    this.cameras.main.shake(200, 0.005)
    const G = this.G
    floatText(this, this.fxLayer, this.L.cx, (G.boardTop + G.boardBottom) / 2, t('time_up'), { size: 44, color: '#ffb3b3', stroke: '#4a0a14', strokeW: 8, rise: 30, hold: 700 })
    this.time.delayedCall(1000, () => this.showOutModal('time'))
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
    G.starBarY = G.row1Y + 42

    const n = this.goalTypes.length
    G.goalRows = n > 8 ? 2 : 1
    G.goalsPerRow = Math.ceil(n / G.goalRows)
    G.goalsTop = G.starBarY + 22
    G.goalH = 34
    G.hudBottom = G.goalsTop + G.goalRows * (G.goalH + 4)

    // Banner'ın gerçek yüksekliği kadar alttan yer ayrılır (core/banner.js)
    G.bannerH = this.bannerH
    const bottom = L.bottom - G.bannerH - 6
    G.powerSize = 56
    G.shelfW = Math.min(G.colW - 24, 340)
    G.shelfH = G.powerSize + 30
    G.shelfY = bottom - G.shelfH / 2
    G.powerY = G.shelfY - 8
    G.powerLabelY = G.shelfY + G.shelfH / 2 - 12
    G.trayW = Math.min(G.colW - 14, 440)
    G.slot = Math.min((G.trayW - 24) / TRAY_SIZE - 4, 56)
    G.slotGap = (G.trayW - 24 - G.slot * TRAY_SIZE) / (TRAY_SIZE - 1)
    G.trayH = G.slot + 22
    G.trayY = G.shelfY - G.shelfH / 2 - 12 - G.trayH / 2
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
    this.updatePowerUpStates()
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
    if (this.phase === 'aiming') {
      this.doSmash(id)
      return
    }
    if (this.phase !== 'playing' || this.modals.length || this.powerBusy)
      return
    this.hidePowerTooltip()
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
    this.timerRunning = true // seviye şeridi geçmeden dokunulduysa süre hemen başlar
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

    const pause = new Button(this, G.left + 32, G.row1Y, {
      w: 50,
      h: 50,
      color: 'blue',
      glyph: 'pause',
      onClick: () => this.openPause(),
    })

    const plaque = this.add.container(L.cx, G.row1Y)
    const pg = this.add.graphics()
    drawPlank(pg, 140, 46, { radius: 16 })
    const label = makeText(this, 0, -1, `${t('level')} ${this.level}`, { size: 25, stroke: '#3b230d', strokeW: 5, shadowY: 3 })
    fitText(label, 116)
    plaque.add([pg, label])

    // Süre: kronometre ikonlu koyu hap
    const timerW = 104
    const timer = this.add.container(G.right - timerW / 2 - 8, G.row1Y)
    const tg = this.add.graphics()
    drawPill(tg, 0, 0, timerW, 40, { fill: 0x3B230D })
    const watch = this.add.image(-timerW / 2 + 6, -1, 'ic_stopwatch').setScale(50 / 90)
    this.timerText = makeText(this, 12, 0, formatClock(this.timeLeft), { size: 23, stroke: '#2b180a', strokeW: 4, shadowY: 2 })
    timer.add([tg, watch, this.timerText])
    this.timerPill = timer
    this.timeWarnLevel = 0

    // Son 10 saniye: kenarlarda nabız gibi atan kırmızı ışık
    const vig = this.add.image(L.cx, L.dh / 2, 'fx_vignette').setDisplaySize(L.dw, L.dh).setTint(0xFF1E3C)
    vig.setAlpha(0)
    this.timeVignette = vig

    this.buildStarBar()

    this.goalsContainer = this.add.container(0, 0)
    this.hudLayer.add([vig, pause, plaque, timer, this.starBar, this.goalsContainer])
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
      for (const obj of [pause, plaque, timer]) {
        const y = obj.y
        obj.y = y - 100
        this.tweens.add({ targets: obj, y, duration: 500, delay: 100, ease: 'Back.easeOut' })
      }
      for (const obj of [this.starBar, this.goalsContainer]) {
        obj.setAlpha(0)
        this.tweens.add({ targets: obj, alpha: 1, duration: 400, delay: 300 })
      }
    }
  }

  /** Toplanan oranı gösteren çubuk; %40, %80 ve %100'de birer yıldız. */
  buildStarBar() {
    const G = this.G
    const barW = Math.min(G.colW - 80, 290)
    const c = this.add.container(this.L.cx, G.starBarY)
    const track = this.add.graphics()
    drawPill(track, 0, 0, barW + 8, 20, { fill: 0x2B180A, alpha: 0.85, gloss: false })
    const fill = this.add.graphics()
    c.add([track, fill])
    const stars = STAR_THRESHOLDS.map((thr, i) => {
      const x = -barW / 2 + barW * thr
      const size = i === 2 ? 34 : 30
      const star = this.add.image(x, -1, 'ic_star')
      star.base = size / star.width
      star.setScale(star.base).setTint(0x5C4A3A)
      c.add(star)
      return star
    })
    this.starBar = c
    Object.assign(c, { barW, fill, stars, prog: { v: 0 } })
  }

  drawStarFill(v) {
    const { barW, fill } = this.starBar
    fill.clear()
    const w = Math.max(0, Math.min(1, v)) * barW
    if (w < 2)
      return
    const h = 12
    fill.fillStyle(0xE89B0C).fillRoundedRect(-barW / 2, -h / 2, w, h, h / 2)
    fill.fillStyle(0xFFD23F).fillRoundedRect(-barW / 2, -h / 2, w, h - 3, (h - 3) / 2)
    fill.fillStyle(0xFFFFFF, 0.35).fillRoundedRect(-barW / 2 + 3, -h / 2 + 2, Math.max(0, w - 6), 3, 1.5)
  }

  updateStarBar(animate) {
    const bar = this.starBar
    if (!bar)
      return
    const v = this.board.progress
    if (animate) {
      this.tweens.killTweensOf(bar.prog)
      this.tweens.add({ targets: bar.prog, v, duration: 420, ease: 'Cubic.easeOut', onUpdate: () => this.drawStarFill(bar.prog.v) })
    }
    else {
      bar.prog.v = v
      this.drawStarFill(v)
    }
    const lit = starsFor(v)
    while (this.litStars < lit) {
      const star = bar.stars[this.litStars]
      this.litStars++
      if (!animate) {
        star.clearTint()
        continue
      }
      this.time.delayedCall(380, () => {
        star.clearTint()
        sfx('note_effect')
        haptic('match')
        this.tweens.add({ targets: star, scale: { from: star.base * 2, to: star.base }, angle: { from: -30, to: 0 }, duration: 450, ease: 'Back.easeOut' })
        burst(this, bar, star.x, star.y, { texture: 'fx_star', tint: 0xFFE066, count: 8, speed: { min: 50, max: 150 }, scale: { start: 0.4, end: 0 }, gravityY: 0, lifespan: 500 })
      })
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
    this.updatePowerUpStates()
    this.updateStarBar(animate)
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
    this.powerGlows = {}
    this.powerGlowTweens = {}

    const shelf = this.add.graphics()
    drawPlank(shelf, G.shelfW, G.shelfH, { radius: 24, nails: false })
    shelf.setPosition(L.cx, G.shelfY)
    this.hudLayer.add(shelf)
    const anim = [shelf]

    const spacing = G.shelfW / 3
    POWER_UPS.forEach((id, i) => {
      const x = L.cx + (i - 1) * spacing
      const glow = this.add.image(x, G.powerY, 'fx_glow').setTint(0xFFF27A).setScale((G.powerSize * 2) / 64).setAlpha(0)
      const b = new Button(this, x, G.powerY, {
        w: G.powerSize,
        h: G.powerSize,
        shape: 'round',
        color: 'yellow',
        icon: powerUpKey(id),
        iconSize: G.powerSize * 0.82,
        onClick: () => this.usePowerUp(id),
        onLongPress: () => this.showPowerTooltip(id),
        onLongPressEnd: () => this.hidePowerTooltip(),
      })
      const label = makeText(this, x, G.powerLabelY, t(id), { size: 13, stroke: '#3b230d', strokeW: 3.5, shadowY: 1.5 })
      fitText(label, spacing - 10)
      this.hudLayer.add([glow, b, label])
      this.powerButtons[id] = b
      this.powerGlows[id] = glow
      anim.push(glow, b, label)
    })

    if (!this.sceneData.instant) {
      anim.forEach((obj) => {
        const y = obj.y
        obj.y = y + 140
        this.tweens.add({ targets: obj, y, duration: 520, delay: 200, ease: 'Back.easeOut' })
      })
    }
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
    this.updatePowerUpStates()
  }

  /** Güçlendirme şu an bir işe yarar mı? Yaramazsa nedeni (i18n anahtarı). */
  powerBlockReason(id) {
    const { bushes, ices } = this.board.countBlocks()
    if (id === 'dynamite')
      return this.board.boardCount ? null : 'no_matching_3_fruits_to_explode'
    if (id === 'brush')
      return bushes ? null : 'no_bushes_on_board'
    return bushes || ices ? null : 'no_blocks_on_board'
  }

  /** Görünür alandaki çalı/buz sayıları (öneri için). */
  visibleBlocks() {
    let bushes = 0
    let ices = 0
    this.board.columns.forEach(col => col.forEach((f, r) => {
      if (r >= this.visibleRows)
        return
      if (f.bush)
        bushes++
      if (f.ice > 0)
        ices++
    }))
    return { bushes, ices }
  }

  /** Kullanılamayanları soluklaştırır, o an işe yarayacak olanı parlatır. */
  updatePowerUpStates() {
    if (!this.powerButtons)
      return
    const p = player()
    const vis = this.visibleBlocks()
    const trayCount = this.vTray.filter(e => !e.matchGroup).length
    const suggest = {
      dynamite: trayCount >= TRAY_SIZE - 2,
      brush: vis.bushes >= 3,
      tornado: vis.ices >= 2 || vis.bushes + vis.ices >= 4,
    }
    for (const id of POWER_UPS) {
      const b = this.powerButtons[id]
      const usable = !this.powerBlockReason(id)
      b.setAlpha(usable ? 1 : 0.55)
      const glowOn = usable && suggest[id] && p.getPowerUpQuantity(id) > 0 && this.phase === 'playing'
      const glow = this.powerGlows[id]
      if (glowOn && !this.powerGlowTweens[id]) {
        glow.setAlpha(0.2)
        this.powerGlowTweens[id] = this.tweens.add({ targets: glow, alpha: 0.85, scale: glow.scale * 1.12, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      }
      else if (!glowOn && this.powerGlowTweens[id]) {
        this.powerGlowTweens[id].stop()
        this.powerGlowTweens[id] = null
        this.tweens.add({ targets: glow, alpha: 0, duration: 200 })
      }
    }
  }

  trayBusy() {
    return this.vTray.some(e => e.state !== 'landed' || e.popping)
  }

  usePowerUp(id) {
    if (this.phase === 'aiming') {
      this.exitAim()
      if (id === 'dynamite')
        return
    }
    if (this.phase !== 'playing' || this.powerBusy || this.modals.length)
      return
    this.hidePowerTooltip()
    const p = player()
    if (p.getPowerUpQuantity(id) <= 0) {
      openPowerUpPurchase(this, id, { onPurchased: () => this.refreshPowerUps() })
      return
    }
    const reason = this.powerBlockReason(id)
    if (reason) {
      toastService.show(t(reason), 'info', 1800)
      shake(this, this.powerButtons[id], { amount: 4, repeat: 2 })
      return
    }
    if (!p.hasSeenTip(`powerup_${id}`)) {
      this.showPowerTutorial(id)
      return
    }
    if (this.trayBusy()) {
      // sepetteki uçuş/patlama bitince kullan
      this.time.delayedCall(120, () => this.usePowerUp(id))
      return
    }
    this.lastActionAt = this.time.now
    this.stopHint()

    if (id === 'dynamite') {
      this.enterAim()
      return
    }
    p.usePowerUp(id)
    const affected = id === 'brush' ? this.board.clearBushes() : this.board.clearBlocks()
    this.animateSweep(id, affected)
    this.refreshPowerUps()
    haptic('powerup')
  }

  // --- İlk kullanım tanıtımı ve uzun basınca bilgi balonu ----------------------
  showPowerTutorial(id) {
    const p = player()
    const modal = new Modal(this, { w: 330, h: 440, title: t(id), color: 'blue' })
    modal.kind = 'tip'
    const top = modal.innerTop
    const glow = this.add.image(0, top + 66, 'fx_glow').setTint(0x8FD8FF).setScale(160 / 64).setAlpha(0.7)
    const icon = this.add.image(0, top + 66, powerUpKey(id)).setScale(110 / 256)
    this.tweens.add({ targets: icon, y: icon.y - 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    const desc = inkText(this, 0, top + 140, t(`${id}_description`), { size: 18, wrap: modal.w - 56, originY: 0, lineSpacing: 3 })
    fitText(desc, modal.w - 50, 64)
    const how = inkText(this, 0, top + 140 + desc.displayHeight + 12, t(`${id}_howto`), { size: 15, wrap: modal.w - 56, originY: 0, color: '#7a5a3a', lineSpacing: 2 })
    fitText(how, modal.w - 50, 60)
    const use = new Button(this, 0, modal.innerBottom - 30, {
      w: modal.w - 70,
      h: 58,
      color: 'green',
      label: t('use_it'),
      onClick: () => modal.close('use'),
    })
    modal.body.add([glow, icon, desc, how, use])
    modal.opts.onClose = (result) => {
      if (result !== 'use')
        return
      p.markTipSeen(`powerup_${id}`)
      this.time.delayedCall(60, () => this.usePowerUp(id))
    }
  }

  showPowerTooltip(id) {
    this.hidePowerTooltip()
    const b = this.powerButtons[id]
    const qty = player().getPowerUpQuantity(id)
    const w = Math.min(250, this.G.colW - 30)
    const c = this.add.container(0, 0)
    const title = makeText(this, 0, 0, `${t(id)}  ×${qty}`, { size: 18, stroke: '#3b230d', strokeW: 4, originY: 0 })
    fitText(title, w - 24)
    const desc = inkText(this, 0, title.displayHeight + 2, t(`${id}_description`), { size: 14, wrap: w - 26, originY: 0, color: '#4a2e1b' })
    const h = title.displayHeight + desc.displayHeight + 22
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 2, -8 + 4, w, h, 14)
    g.fillStyle(0x6B4724).fillRoundedRect(-w / 2, -8, w, h, 14)
    g.fillStyle(0xFFFAE8).fillRoundedRect(-w / 2 + 3, -5, w - 6, h - 6, 12)
    g.fillStyle(0x6B4724).fillTriangle(-10, h - 9, 10, h - 9, 0, h + 3)
    c.add([g, title, desc])
    const x = Phaser.Math.Clamp(b.x, this.G.left + w / 2 + 6, this.G.right - w / 2 - 6)
    c.setPosition(x, b.y - this.G.powerSize / 2 - h - 6)
    title.setStroke('#3b230d', 4)
    this.fxLayer.add(c)
    c.setScale(0.7).setAlpha(0)
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' })
    this.tooltip = c
    this.tooltipTimer = this.time.delayedCall(3200, () => this.hidePowerTooltip())
  }

  hidePowerTooltip() {
    this.tooltipTimer?.remove()
    const c = this.tooltip
    if (!c)
      return
    this.tooltip = null
    this.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 150, onComplete: () => c.destroy() })
  }

  // --- Balyoz: nişan modu --------------------------------------------------------
  enterAim() {
    const G = this.G
    const L = this.L
    this.phase = 'aiming'
    sfx('click_effect')
    const shade = this.add.rectangle(L.cx, (G.boardTop + G.boardBottom) / 2, G.colW + 40, G.boardBottom - G.boardTop + 24, 0x000000, 0)
    this.boardBg.add(shade)
    this.tweens.add({ targets: shade, fillAlpha: 0.38, duration: 200 })

    const bw = Math.min(G.colW - 24, 360)
    const banner = this.add.container(L.cx, G.boardTop + 26)
    const bg = this.add.graphics()
    drawPlank(bg, bw, 50, { radius: 18, nails: false })
    const icon = this.add.image(-bw / 2 + 30, -2, 'pu_dynamite').setScale(38 / 256)
    this.tweens.add({ targets: icon, angle: { from: -12, to: 12 }, duration: 260, yoyo: true, repeat: -1 })
    const text = makeText(this, 6, -2, t('smash_hint'), { size: 17, stroke: '#3b230d', strokeW: 4 })
    fitText(text, bw - 120)
    const cancel = new Button(this, bw / 2 - 26, -2, { w: 38, h: 38, shape: 'round', color: 'red', glyph: 'x', onClick: () => this.exitAim() })
    banner.add([bg, icon, text, cancel])
    this.fxLayer.add(banner)
    banner.setScale(0.6).setAlpha(0)
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' })

    const targets = [...this.tiles.values()].filter(tile => !tile.peek)
    this.aimTween = this.tweens.add({ targets, scale: 1.06, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.powerButtons.dynamite.startPulse(0.14, 300)
    this.aimUI = { shade, banner, targets }
  }

  exitAim() {
    if (this.phase !== 'aiming')
      return
    this.phase = 'playing'
    this.aimTween?.stop()
    this.aimTween = null
    const ui = this.aimUI
    this.aimUI = null
    ui?.targets.forEach(tile => tile.active && tile.setScale(1))
    if (ui) {
      this.tweens.add({ targets: ui.shade, fillAlpha: 0, duration: 160, onComplete: () => ui.shade.destroy() })
      this.tweens.add({ targets: ui.banner, alpha: 0, scale: 0.8, duration: 160, onComplete: () => ui.banner.destroy() })
    }
    this.powerButtons.dynamite.stopPulse()
    this.lastActionAt = this.time.now
  }

  doSmash(id) {
    if (this.trayBusy()) {
      this.time.delayedCall(100, () => this.phase === 'aiming' && this.doSmash(id))
      return
    }
    const tile = this.tiles.get(id)
    if (!tile || tile.peek)
      return
    const res = this.board.smash(id, this.visibleRows)
    this.exitAim()
    if (!res)
      return
    player().usePowerUp('dynamite')
    this.refreshPowerUps()
    haptic('powerup')
    this.animateSmash(res, id)
  }

  animateSmash(res, tappedId) {
    const G = this.G
    this.powerBusy = true
    const color = FRUIT_COLORS[res.type] ?? 0xFFFFFF
    const target = this.tiles.get(tappedId)
    const tx = target ? target.x : this.L.cx
    const ty = target ? target.y : G.boardTop + 40

    // sepetteki aynı tür meyveler: patlamayı bekler (yerleri korunur)
    const trayEntries = this.vTray.filter(e => res.fromTray.some(f => f.id === e.fruit.id))
    trayEntries.forEach((e) => {
      e.popping = true
      this.tweens.add({ targets: e.sprite, y: e.sprite.y - 8, duration: 150, yoyo: true, repeat: 1 })
    })

    const dyn = this.add.image(tx + 80, ty - 190, 'pu_dynamite').setScale((G.tile * 1.15) / 256).setAngle(-55)
    this.fxLayer.add(dyn)
    this.tweens.add({
      targets: dyn,
      x: tx,
      y: ty - 4,
      angle: 10,
      duration: 320,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // fitil: kısa titreme + kıvılcım
        burst(this, this.fxLayer, tx + 14, ty - 22, { texture: 'fx_sparkle', tint: 0xFFE066, count: 6, speed: { min: 40, max: 120 }, scale: { start: 0.4, end: 0 }, gravityY: 0, lifespan: 300 })
        this.tweens.add({
          targets: dyn,
          scale: dyn.scale * 1.25,
          angle: { from: -6, to: 6 },
          duration: 70,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            dyn.destroy()
            this.explodeSmash(res, trayEntries, tx, ty, color)
          },
        })
      },
    })
  }

  explodeSmash(res, trayEntries, tx, ty, color) {
    const G = this.G
    sfx('pop_effect')
    haptic('powerup')
    this.cameras.main.shake(180, 0.009)
    const flash = this.add.circle(tx, ty, G.tile * 0.4, 0xFFFFFF, 0.9)
    this.fxLayer.add(flash)
    this.tweens.add({ targets: flash, radius: G.tile * 1.6, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() })
    burst(this, this.fxLayer, tx, ty, { texture: 'fx_star', tint: [0xFFE066, 0xFF9F1C, 0xFFFFFF], count: 14, speed: { min: 160, max: 360 }, scale: { start: 0.6, end: 0 }, gravityY: 350 })

    res.fromBoard.forEach((item, i) => {
      const tile = this.tiles.get(item.fruit.id)
      if (tile) {
        this.tiles.delete(item.fruit.id)
        this.tweens.killTweensOf(tile)
      }
      this.time.delayedCall(i * 90, () => {
        const x = tile ? tile.x : G.colX(item.col)
        const y = tile ? tile.y : G.boardTop + 10
        juiceBurst(this, this.fxLayer, x, y, color, 1.15)
        if (tile)
          this.tweens.add({ targets: tile, scale: 0, angle: 120, alpha: 0, duration: 220, ease: 'Back.easeIn', onComplete: () => tile.destroy() })
      })
    })
    trayEntries.forEach((e, i) => {
      this.time.delayedCall(120 + i * 90, () => {
        juiceBurst(this, this.fxLayer, e.sprite.x, G.trayY, color, 0.9)
        this.tweens.add({ targets: e.sprite, scale: 0, alpha: 0, duration: 200, ease: 'Back.easeIn', onComplete: () => e.sprite.destroy() })
      })
    })

    this.time.delayedCall(Math.max(res.fromBoard.length, trayEntries.length + 1) * 90 + 260, () => {
      this.vTray = this.vTray.filter(e => !trayEntries.includes(e))
      this.layoutTray()
      for (let c = 0; c < COLUMN_COUNT; c++)
        this.layoutColumn(c)
      this.updateGoals(true)
      floatText(this, this.fxLayer, tx, ty - 10, '+3', { size: 34, color: '#fff7c2', stroke: '#7a4a00', rise: 50, hold: 300 })
      this.powerBusy = false
      this.updatePowerUpStates()
      if (this.board.status === 'won' && !this.matchGroups.size)
        this.onWon()
      else
        this.flushQueuedTap()
    })
  }

  // --- Süpürge / Rüzgar ----------------------------------------------------------
  animateSweep(kind, affected) {
    const G = this.G
    this.powerBusy = true
    sfx(kind === 'brush' ? 'bush_powerup_effect' : 'wind_effect')
    floatText(this, this.fxLayer, this.L.cx, G.boardTop + 40, t(kind), { size: 34, color: kind === 'brush' ? '#ffb3e6' : '#cfe3ff', stroke: '#3b230d', strokeW: 7, rise: 30, hold: 600 })
    // etkilenecek karoları önce işaretle
    affected.forEach((fruit) => {
      const tile = this.tiles.get(fruit.id)
      if (tile)
        this.tweens.add({ targets: tile, scale: 1.08, duration: 140, yoyo: true, repeat: 1 })
    })
    const icon = this.add.image(G.left - 60, (G.boardTop + G.boardBottom) / 2, powerUpKey(kind))
    icon.setScale((G.tile * 1.6) / 256)
    this.fxLayer.add(icon)
    const duration = 950
    const from = G.left - 60
    const to = G.right + 60
    const p = { t: 0 }
    const done = new Set()
    const trail = this.add.particles(0, 0, kind === 'brush' ? 'fx_leaf' : 'fx_dot', {
      follow: icon,
      speed: { min: 20, max: 80 },
      scale: { start: kind === 'brush' ? 0.6 : 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 500,
      frequency: 30,
      tint: kind === 'brush' ? [0x4CAF50, 0x7CB342] : [0xE6F4FF, 0xBFD9FF],
      rotate: { min: 0, max: 360 },
    })
    this.fxLayer.addAt(trail, this.fxLayer.getIndex(icon))
    this.tweens.add({
      targets: p,
      t: 1,
      duration,
      delay: 200,
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
        trail.stop()
        this.time.delayedCall(600, () => trail.destroy())
        this.tweens.add({ targets: icon, alpha: 0, duration: 200, onComplete: () => icon.destroy() })
        affected.forEach((fruit) => {
          const tile = this.tiles.get(fruit.id)
          if (tile && !done.has(fruit.id))
            this.clearBlockVisual(tile)
        })
        this.updateGoals(true)
        toastService.show(t(kind === 'brush' ? 'all_bushes_removed' : 'all_blocks_removed'), 'success', 1500)
        this.powerBusy = false
        this.updatePowerUpStates()
        this.flushQueuedTap()
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
    // altında seviyenin süresi
    const tg = this.add.graphics()
    drawPill(tg, 0, 58, 128, 38, { fill: 0x3B230D })
    const watch = this.add.image(-50, 57, 'ic_stopwatch').setScale(46 / 90)
    const time = makeText(this, 12, 58, formatClock(this.timeLimit), { size: 22, stroke: '#2b180a', strokeW: 4, shadowY: 2 })
    c.add([tg, watch, time, g, text])
    this.fxLayer.add(c)
    c.x = -L.colW
    this.tweens.chain({
      targets: c,
      tweens: [
        { x: L.cx, duration: 420, ease: 'Back.easeOut' },
        { scale: 1.06, duration: 300, yoyo: true },
        {
          x: L.dw + L.colW,
          duration: 380,
          delay: 550,
          ease: 'Back.easeIn',
          onComplete: () => {
            c.destroy()
            this.startTimer()
          },
        },
      ],
    })
  }

  stopTimeWarning() {
    this.timeWarnTween?.stop()
    this.timeWarnTween = null
    this.timeVignette?.setAlpha(0)
  }

  onWon() {
    if (this.phase === 'ended')
      return
    this.phase = 'ended'
    this.stopHint()
    this.stopTimeWarning()
    sfx('levelup_effect')
    haptic('success')
    this.dangerTween?.stop()
    this.trayDanger.setAlpha(0)
    confettiRain(this, this.fxLayer, this.L.dw, { duration: 1800 })
    const G = this.G
    floatText(this, this.fxLayer, this.L.cx, (G.boardTop + G.boardBottom) / 2, t('level_completed'), { size: 40, color: '#ffe066', stroke: '#3b230d', strokeW: 8, rise: 40, hold: 700 })
    this.time.delayedCall(1100, () => this.finishLevel())
  }

  onLost() {
    if (this.phase === 'ended')
      return
    this.phase = 'ended'
    this.stopHint()
    this.stopTimeWarning()
    sfx('error_effect')
    haptic('error')
    shake(this, this.trayLayer, { amount: 7, repeat: 4 })
    this.cameras.main.shake(220, 0.006)
    const G = this.G
    floatText(this, this.fxLayer, this.L.cx, G.trayY - G.trayH - 10, t('out_of_space'), { size: 34, color: '#ff8a8a', stroke: '#4a0a14', strokeW: 7, rise: 30, hold: 700 })
    this.time.delayedCall(1000, () => this.showOutModal('space'))
  }

  /** Yıldız sırası: ortadaki büyük ve yukarıda, kazanılmayanlar koyu. */
  addStarRow(parent, y, earned, { size = 64, gap = 74, animate = false, delay = 0 } = {}) {
    return [0, 1, 2].map((i) => {
      const big = i === 1
      const s = big ? size * 1.25 : size
      const x = (i - 1) * gap
      const sy = y + (big ? -s * 0.16 : 0)
      const angle = (i - 1) * 14
      const slot = this.add.image(x, sy, 'ic_star').setScale(s / 256).setAngle(angle).setTint(0x4A3A2A).setAlpha(0.55)
      parent.add(slot)
      if (i >= earned)
        return slot
      const star = this.add.image(x, sy, 'ic_star').setScale(s / 256).setAngle(angle)
      parent.add(star)
      if (animate) {
        const sc = star.scale
        star.setScale(sc * 3).setAlpha(0)
        this.tweens.add({
          targets: star,
          scale: sc,
          alpha: 1,
          delay: delay + i * 380,
          duration: 380,
          ease: 'Back.easeOut',
          onStart: () => sfx('note_effect'),
          onComplete: () => {
            haptic('match')
            burst(this, parent, x, sy, { texture: 'fx_star', tint: 0xFFE066, count: 10, speed: { min: 60, max: 180 }, scale: { start: 0.45, end: 0 }, gravityY: 0, lifespan: 550 })
            shake(this, parent, { amount: 3, repeat: 1 })
          },
        })
      }
      return star
    })
  }

  /** Süre doldu / sepet doldu: o ana kadarki yıldızlar + bir kerelik devam teklifi. */
  showOutModal(reason) {
    const offerUsed = reason === 'time' ? this.extraTimeUsed : this.continueUsed
    if (offerUsed) {
      this.finishLevel()
      return
    }
    this.endModalKind = reason
    const stars = starsFor(this.board.progress)
    const pct = Math.floor(this.board.progress * 100)
    const isTime = reason === 'time'
    const modal = new Modal(this, { w: 330, h: 500, title: isTime ? t('time_up') : t('oh_no'), color: 'purple', closable: false })
    modal.kind = 'out'
    const top = modal.innerTop

    this.addStarRow(modal.body, top + 44, stars, { size: 50, gap: 66 })
    const info = inkText(this, 0, top + 100, t('collected_percent', { p: pct }), { size: 19, color: '#4c1d95' })
    fitText(info, modal.w - 60)
    const msg = inkText(this, 0, top + 134, isTime ? t('extra_time_message', { s: EXTRA_TIME_SECONDS }) : t('return_fruits_message'), { size: 17, wrap: modal.w - 70, color: '#6b4a2a' })
    fitText(msg, modal.w - 60, 48)
    modal.body.add([info, msg])

    // geri sayım halkası: dolunca teklif kapanır
    const ringY = top + 214
    const ring = this.add.graphics()
    const icon = this.add.image(0, ringY, isTime ? 'ic_stopwatch' : 'ic_reverse')
    icon.setScale(62 / icon.width)
    const counter = makeText(this, 0, ringY + 64, '', { size: 20, stroke: '#3b0f7a', strokeW: 4 })
    modal.body.add([ring, icon, counter])
    if (isTime)
      this.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: -1 })
    else
      this.tweens.add({ targets: icon, angle: -360, duration: 2400, repeat: -1 })
    const state = { left: OUT_COUNTDOWN }
    const drawRing = () => {
      ring.clear()
      ring.lineStyle(9, 0xD8C8F5, 1).strokeCircle(0, ringY, 44)
      ring.lineStyle(9, 0x8B5CF6, 1)
      ring.beginPath()
      ring.arc(0, ringY, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (state.left / OUT_COUNTDOWN), false)
      ring.strokePath()
      counter.setText(String(Math.ceil(state.left / 1000)))
    }
    drawRing()
    const countdown = this.tweens.add({
      targets: state,
      left: 0,
      duration: OUT_COUNTDOWN,
      onUpdate: drawRing,
      onComplete: () => modal.close('finish'),
    })

    const btnW = modal.w - 60
    const accept = new Button(this, 0, modal.innerBottom - 92, {
      w: btnW,
      h: 60,
      color: 'purple',
      label: isTime ? `+${EXTRA_TIME_SECONDS} ${t('seconds_short')}   ${CONTINUE_COST}` : `${t('continue')}   ${CONTINUE_COST}`,
      icon: 'ic_diamond',
      iconSize: 34,
      iconRight: true,
      pulse: true,
      onClick: () => {
        if (player().currencies.diamonds < CONTINUE_COST) {
          toastService.show(t('not_enough_diamonds'), 'error')
          shake(this, accept)
          return
        }
        modal.close('accept')
      },
    })
    // 1 yıldız seviyeyi geçirir: bitirmek "onay" (yeşil), yıldız yoksa vazgeçmek (kırmızı)
    const finish = new Button(this, 0, modal.innerBottom - 26, {
      w: modal.w - 110,
      h: 48,
      color: stars > 0 ? 'green' : 'red',
      label: stars > 0 ? t('finish') : t('no_thanks'),
      onClick: () => modal.close('finish'),
    })
    modal.body.add([accept, finish])
    modal.opts.onClose = (result) => {
      countdown.stop()
      if (result === 'accept')
        isTime ? this.addExtraTime() : this.revive()
      else
        this.time.delayedCall(150, () => this.finishLevel())
    }
  }

  addExtraTime() {
    const p = player()
    if (!p.spendCurrency('diamonds', CONTINUE_COST)) {
      this.finishLevel()
      return
    }
    this.endModalKind = null
    this.extraTimeUsed = true
    this.board.resumeAfterTimeout()
    this.timeLeft += EXTRA_TIME_SECONDS * 1000
    this.timerRunning = true
    this.renderTimer(true)
    sfx('success_effect')
    const tp = this.timerPill
    floatText(this, this.fxLayer, tp.x, tp.y + 30, `+${EXTRA_TIME_SECONDS}`, { size: 30, color: '#9bff8a', stroke: '#04502f', strokeW: 6, rise: 40, hold: 400 })
    this.tweens.add({ targets: tp, scale: { from: 1.35, to: 1 }, duration: 450, ease: 'Back.easeOut' })
    this.time.delayedCall(300, () => {
      this.phase = 'playing'
      this.lastActionAt = this.time.now
      this.updatePowerUpStates()
    })
  }

  /** Seviye biter: yıldızlar toplanan orana göre; 1 yıldız seviyeyi geçirir. */
  finishLevel() {
    this.phase = 'ended'
    this.timerRunning = false
    this.stopTimeWarning()
    const stars = starsFor(this.board.progress)
    this.resultStars = stars
    if (stars > 0) {
      const p = player()
      const before = p.profile.gameLevel
      p.completeLevel(this.level, this.board.collected, stars)
      if (p.profile.gameLevel > before)
        this.registry.set('levelUpFrom', before)
      this.showWinModal(stars)
    }
    else {
      this.showLoseModal()
    }
  }

  showWinModal(stars) {
    this.endModalKind = 'win'
    const modal = new Modal(this, { w: 340, h: 530, title: `${t('level')} ${this.level}`, color: 'green', closable: false })
    modal.kind = 'win'
    const top = modal.innerTop
    sunburst(this, modal.body, 0, top + 62, 140, { color: 0xFFE9A0, alpha: 0.45 })
    this.addStarRow(modal.body, top + 70, stars, { size: 70, gap: 86, animate: true, delay: 350 })
    if (stars === 3)
      this.time.delayedCall(350 + 3 * 380, () => confettiRain(this, this.modalLayer, this.L.dw, { duration: 1200 }))
    const title = makeText(this, 0, top + 150, t(`stars_title_${stars}`), { size: 30, color: '#ffd84a', stroke: '#7a4a00', strokeW: 6, shadowY: 3 })
    fitText(title, modal.w - 50)
    title.setScale(0)
    this.tweens.add({ targets: title, scale: 1, delay: 350 + stars * 380, duration: 400, ease: 'Back.easeOut' })
    modal.body.add(title)

    // toplanan oran + kalan süre
    const pct = Math.floor(this.board.progress * 100)
    const statY = top + 192
    const sg = this.add.graphics()
    drawPill(sg, -66, statY, 116, 34, { fill: 0x3B230D, alpha: 0.85 })
    drawPill(sg, 66, statY, 116, 34, { fill: 0x3B230D, alpha: 0.85 })
    const basket = this.add.image(-112, statY, 'game-atlas', `${this.goalTypes[0]}.png`).setScale(38 / 256)
    const pctText = makeText(this, -58, statY, t('percent', { p: pct }), { size: 19, stroke: '#2b180a', strokeW: 3.5 })
    const watch = this.add.image(20, statY, 'ic_stopwatch').setScale(40 / 90)
    const left = makeText(this, 74, statY, formatClock(this.timeLeft), { size: 19, stroke: '#2b180a', strokeW: 3.5 })
    modal.body.add([sg, basket, pctText, watch, left])

    const collected = Object.entries(this.board.collected).filter(([, n]) => n > 0)
    const boxTop = top + 222
    const boxH = 124
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
        this.tweens.add({ targets: o, scale: sc, delay: 500 + stars * 380 + i * 70, duration: 300, ease: 'Back.easeOut' })
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

  revive() {
    const p = player()
    if (!p.spendCurrency('diamonds', CONTINUE_COST)) {
      this.finishLevel()
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
      this.updatePowerUpStates()
    })
  }

  /** 1 yıldıza (%40) ulaşılamadı. */
  showLoseModal() {
    this.endModalKind = 'lose'
    const modal = new Modal(this, { w: 330, h: 440, title: `${t('level')} ${this.level}`, color: 'red', closable: false })
    modal.kind = 'lose'
    const top = modal.innerTop
    const heart = this.add.image(0, top + 62, 'ic_heart_broken').setScale(110 / 256)
    this.tweens.add({ targets: heart, angle: { from: -6, to: 6 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    const msg = makeText(this, 0, top + 138, t('level_failed'), { size: 30, color: '#ff6b81', stroke: '#4a0a14', strokeW: 6 })
    fitText(msg, modal.w - 50)

    // toplanan oran ve 1 yıldız için gereken %40
    const barW = modal.w - 90
    const barY = top + 192
    const g = this.add.graphics()
    drawPill(g, 0, barY, barW + 8, 20, { fill: 0x2B180A, alpha: 0.85, gloss: false })
    const w = Math.max(0, barW * Math.min(1, this.board.progress))
    if (w > 2) {
      g.fillStyle(0xC9302C).fillRoundedRect(-barW / 2, barY - 6, w, 12, 6)
      g.fillStyle(0xFF6B6B).fillRoundedRect(-barW / 2, barY - 6, w, 9, 4.5)
    }
    const mark = this.add.image(-barW / 2 + barW * STAR_THRESHOLDS[0], barY - 1, 'ic_star').setScale(30 / 256).setTint(0x5C4A3A)
    const need = inkText(this, 0, barY + 34, t('need_percent', { p: Math.round(STAR_THRESHOLDS[0] * 100), c: Math.floor(this.board.progress * 100) }), { size: 16, wrap: modal.w - 60, color: '#6b4a2a' })
    fitText(need, modal.w - 50, 44)

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
    modal.body.add([heart, msg, g, mark, need, retry, home])
  }

  // ===========================================================================
  // Duraklatma
  // ===========================================================================
  openPause() {
    this.exitAim()
    this.hidePowerTooltip()
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
    if (this.phase === 'aiming') {
      this.exitAim()
      return
    }
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
