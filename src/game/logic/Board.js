import { FRUIT_IDS } from './fruits'

// Oyun kuralları — saf (Phaser/Vue'dan bağımsız) model.
//
// Tahta 4 sütundan oluşur; her sütun alttan üste bir meyve dizisidir
// (index 0 = en alttaki meyve). Görünen herhangi bir meyveye dokunulabilir.
// Dokunulan meyve 7 slotluk sepete (tray) gider; aynı türden 3 meyve
// birleşince sıkılıp toplanır. Sepet eşleşmeden dolarsa seviye kaybedilir.
//
//  - Çalı (bush): meyveyi kısmen gizler, dokununca çalı kalkar ve meyve
//    aynı dokunuşta sepete gider.
//  - Buz (ice): her dokunuş buzu 1 kademe kırar; 0 olunca meyve serbest kalır.
//
// Model her işlemi anında uygular ve sahnenin animasyon için kullanacağı
// sonucu döndürür. Görsel taraf (GameScene) sadece bu sonuçları canlandırır.

export const TRAY_SIZE = 7
export const COLUMN_COUNT = 4

let uidCounter = 0

function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

/**
 * Seviye üretimi — eski gameStore.setupLevel ile aynı zorluk eğrisi.
 * @param {number} level
 * @param {() => number} rng
 */
export function generateLevel(level, rng = Math.random) {
  const typeCount = Math.min(7 + Math.floor(level / 5), FRUIT_IDS.length)
  const types = shuffle([...FRUIT_IDS], rng).slice(0, typeCount)
  const triplets = Math.min(8 + level, 55)

  const pool = []
  for (let i = 0; i < triplets; i++) {
    const type = types[i % types.length]
    for (let j = 0; j < 3; j++)
      pool.push({ id: `f${++uidCounter}`, type, bush: false, ice: 0 })
  }

  let bushCount = Math.min(40, Math.floor(level / 2))
  let iceCount = Math.min(40, Math.floor(level / 2.5))
  // Her 7. seviye "nefes alma" seviyesi: engeller azalır.
  if (level > 0 && level % 7 === 0) {
    bushCount = Math.floor(bushCount * 0.25)
    iceCount = 0
  }

  shuffle(pool, rng)
  let bushes = 0
  let ices = 0
  for (const fruit of pool) {
    if (bushes < bushCount && rng() < 0.5) {
      fruit.bush = true
      bushes++
    }
    else if (ices < iceCount) {
      fruit.ice = level > 10 ? 3 : 2
      ices++
    }
  }

  shuffle(pool, rng)
  const columns = Array.from({ length: COLUMN_COUNT }, () => [])
  pool.forEach((fruit, index) => columns[index % COLUMN_COUNT].push(fruit))
  return columns
}

export default class Board {
  /**
   * @param {number} level
   * @param {() => number} [rng]
   */
  constructor(level, rng = Math.random) {
    this.level = level
    this.columns = generateLevel(level, rng)
    this.tray = []
    this.collected = {}
    this.status = 'playing' // 'playing' | 'won' | 'lost'
    this.matches = 0
  }

  get boardCount() {
    return this.columns.reduce((sum, col) => sum + col.length, 0)
  }

  locate(id) {
    for (let col = 0; col < this.columns.length; col++) {
      const row = this.columns[col].findIndex(f => f.id === id)
      if (row !== -1)
        return { col, row, fruit: this.columns[col][row] }
    }
    return null
  }

  /** Henüz toplanmamış (tahta + sepet) meyve sayıları, türe göre. */
  remaining() {
    const counts = {}
    for (const fruit of [...this.columns.flat(), ...this.tray])
      counts[fruit.type] = (counts[fruit.type] || 0) + 1
    return counts
  }

  countBlocks() {
    let bushes = 0
    let ices = 0
    for (const fruit of this.columns.flat()) {
      if (fruit.bush) bushes++
      if (fruit.ice > 0) ices++
    }
    return { bushes, ices }
  }

  _addCollected(type, amount) {
    this.collected[type] = (this.collected[type] || 0) + amount
  }

  _checkWin() {
    if (this.boardCount === 0 && this.tray.length === 0)
      this.status = 'won'
  }

  /**
   * Bir meyveye dokunma.
   * @param {string} id
   * @param {number} maxRow - Bu satır ve üzeri ekranda görünmüyor (dokunulamaz).
   */
  tap(id, maxRow = Infinity) {
    if (this.status !== 'playing')
      return null
    const loc = this.locate(id)
    if (!loc)
      return null
    if (loc.row >= maxRow)
      return { kind: 'blocked' }

    const fruit = loc.fruit
    if (fruit.ice > 0) {
      fruit.ice--
      return { kind: 'ice', fruit, hp: fruit.ice, col: loc.col, row: loc.row }
    }
    if (this.tray.length >= TRAY_SIZE)
      return { kind: 'full' }

    const wasBush = fruit.bush
    fruit.bush = false
    this.columns[loc.col].splice(loc.row, 1)

    // Aynı türden meyvelerin yanına yerleş (görsel olarak gruplanır).
    let insertAt = this.tray.length
    for (let i = this.tray.length - 1; i >= 0; i--) {
      if (this.tray[i].type === fruit.type) {
        insertAt = i + 1
        break
      }
    }
    this.tray.splice(insertAt, 0, fruit)

    let match = null
    const same = this.tray.filter(f => f.type === fruit.type)
    if (same.length >= 3) {
      const trio = same.slice(0, 3)
      this.tray = this.tray.filter(f => !trio.includes(f))
      this._addCollected(fruit.type, 3)
      this.matches++
      match = { type: fruit.type, fruits: trio }
      this._checkWin()
    }
    else if (this.tray.length >= TRAY_SIZE) {
      this.status = 'lost'
    }

    return { kind: 'pick', fruit, col: loc.col, row: loc.row, wasBush, trayIndex: insertAt, match, status: this.status }
  }

  /**
   * "Devam et": sepetteki son 3 meyveyi tahtaya geri koyar (en kısa
   * sütunların en altına), böylece seviye hâlâ çözülebilir kalır.
   */
  revive() {
    const count = Math.min(3, this.tray.length)
    const returned = this.tray.splice(this.tray.length - count, count)
    const order = this.columns
      .map((col, index) => ({ index, length: col.length }))
      .sort((a, b) => a.length - b.length)
    const moves = returned.map((fruit, i) => {
      const col = order[i % order.length].index
      this.columns[col].unshift(fruit)
      return { fruit, col }
    })
    this.status = 'playing'
    return moves
  }

  /** Balyoz: aynı türden 3 meyveyi tahtadan kırar (görünenleri tercih eder). */
  hammer(maxRow = Infinity) {
    if (this.status !== 'playing')
      return null
    const pickFrom = (limit) => {
      const byType = {}
      this.columns.forEach((col, c) => col.forEach((fruit, r) => {
        if (r < limit && !fruit.bush && fruit.ice <= 0)
          (byType[fruit.type] ||= []).push({ fruit, col: c, row: r })
      }))
      let best = null
      for (const type in byType) {
        if (byType[type].length >= 3 && (!best || byType[type].length > byType[best].length))
          best = type
      }
      return best ? { type: best, items: byType[best].sort((a, b) => a.row - b.row).slice(0, 3) } : null
    }
    const choice = pickFrom(maxRow) || pickFrom(Infinity)
    if (!choice)
      return null

    const ids = new Set(choice.items.map(i => i.fruit.id))
    this.columns = this.columns.map(col => col.filter(f => !ids.has(f.id)))
    this._addCollected(choice.type, 3)
    this._checkWin()
    return { type: choice.type, items: choice.items, status: this.status }
  }

  /**
   * Balyoz (nişan alarak): dokunulan meyvenin türünden bir 3'lü toplar.
   * Önce sepetteki aynı türden meyveler kullanılır (sepette yer açar), eksik
   * kalanlar tahtadan alınır — önce dokunulan meyve, sonra görünen en alttakiler.
   * Çalı/buz engel değildir; balyoz kırar.
   * @param {string} id dokunulan meyve
   * @param {number} maxRow görünen satır sayısı
   */
  smash(id, maxRow = Infinity) {
    if (this.status !== 'playing')
      return null
    const loc = this.locate(id)
    if (!loc)
      return null
    const type = loc.fruit.type
    const fromTray = this.tray.filter(f => f.type === type).slice(0, 2)
    const need = 3 - fromTray.length
    const others = []
    this.columns.forEach((col, c) => col.forEach((fruit, r) => {
      if (fruit.type === type && fruit.id !== id)
        others.push({ fruit, col: c, row: r })
    }))
    others.sort((a, b) => (Number(a.row >= maxRow) - Number(b.row >= maxRow)) || a.row - b.row)
    const fromBoard = [{ fruit: loc.fruit, col: loc.col, row: loc.row }, ...others].slice(0, need)
    if (fromBoard.length < need)
      return null

    const boardIds = new Set(fromBoard.map(i => i.fruit.id))
    this.columns = this.columns.map(col => col.filter(f => !boardIds.has(f.id)))
    this.tray = this.tray.filter(f => !fromTray.includes(f))
    this._addCollected(type, 3)
    this.matches++
    this._checkWin()
    return { type, fromTray, fromBoard, status: this.status }
  }

  /** Süpürge: tüm çalıları kaldırır. */
  clearBushes() {
    const affected = this.columns.flat().filter(f => f.bush)
    for (const f of affected)
      f.bush = false
    return affected
  }

  /** Rüzgar: tüm çalıları ve buzları kaldırır. */
  clearBlocks() {
    const affected = this.columns.flat().filter(f => f.bush || f.ice > 0)
    affected.forEach((f) => {
      f.bush = false
      f.ice = 0
    })
    return affected
  }

  /** İpucu: bir sonraki iyi hamle için görünen bir meyve id'si. */
  hint(maxRow = Infinity) {
    const visible = []
    this.columns.forEach(col => col.forEach((fruit, r) => {
      if (r < maxRow && !fruit.bush && fruit.ice <= 0)
        visible.push(fruit)
    }))
    if (!visible.length)
      return null
    const trayCounts = {}
    for (const f of this.tray)
      trayCounts[f.type] = (trayCounts[f.type] || 0) + 1
    const visibleCounts = {}
    for (const f of visible)
      visibleCounts[f.type] = (visibleCounts[f.type] || 0) + 1

    let bestType = null
    let bestScore = -1
    for (const type in visibleCounts) {
      const inTray = trayCounts[type] || 0
      if (inTray + visibleCounts[type] < 3)
        continue
      const score = inTray * 10 + visibleCounts[type]
      if (score > bestScore) {
        bestScore = score
        bestType = type
      }
    }
    if (!bestType)
      return null
    return visible.find(f => f.type === bestType)?.id ?? null
  }
}
