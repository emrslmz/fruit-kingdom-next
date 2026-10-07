import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'
import { FRUIT_TYPES } from '@/game/logic/fruits'

class PlayerStorage {
  constructor() {
    this.isNative = Capacitor.isNativePlatform()
    this.storageKey = 'fruitkingdom-player'
  }

  async save(state) {
    try {
      const data = JSON.stringify(state)
      if (this.isNative) {
        await Preferences.set({ key: this.storageKey, value: data })
      }
      else {
        localStorage.setItem(this.storageKey, data)
      }
    }
    catch (error) {
      console.error('[PlayerStorage] Veri kaydı başarısız:', error)
    }
  }

  async load() {
    try {
      let data
      if (this.isNative) {
        const result = await Preferences.get({ key: this.storageKey })
        data = result.value
      }
      else {
        data = localStorage.getItem(this.storageKey, data)
      }
      return data ? JSON.parse(data) : null
    }
    catch (error) {
      console.error('[PlayerStorage] Veri yüklemesi başarısız:', error)
      return null
    }
  }
}
const playerStorage = new PlayerStorage()

export const usePlayerStore = defineStore('player', {
  state: () => ({
    profile: {
      username: 'fruitkingdom57',
      gameLevel: 1,
      levelData: {},
      claimedLevelRewards: [],
      lastFreeCaseOpenTime: 0, // YENİ: Son ücretsiz kutu açılış zamanı
      seenTips: [], // Gösterilmiş tanıtımlar (örn. güçlendirmelerin ilk kullanımı)
    },
    stats: {
      totalOrdersCompleted: 0,
    },
    currencies: {
      diamonds: 100,
      gold: 0,
    },
    energy: {
      current: 100,
      max: 100,
    },
    inventory: {
      powerUps: [
        // { id: 'rainbow', quantity: 20 },
        { id: 'dynamite', quantity: 5 },
        { id: 'brush', quantity: 5 },
        { id: 'tornado', quantity: 5 },
      ],
      fruitInventory: {},
    },
    orders: Array.from({ length: 3 }).fill(null),
    characters: [
      { id: 1, name: 'Alex', spriteName: 'c1.png', rarity: 'common' },
      { id: 2, name: 'Jordan', spriteName: 'c2.png', rarity: 'common' },
      { id: 3, name: 'Taylor', spriteName: 'c3.png', rarity: 'common' },
      { id: 4, name: 'Casey', spriteName: 'c4.png', rarity: 'common' },
      { id: 5, name: 'Riley', spriteName: 'c5.png', rarity: 'common' },
      { id: 6, name: 'Jamie', spriteName: 'c6.png', rarity: 'common' },
      { id: 7, name: 'Morgan', spriteName: 'c7x.png', rarity: 'rare' },
      { id: 8, name: 'Skyler', spriteName: 'c8x.png', rarity: 'rare' },
      { id: 9, name: 'Quinn', spriteName: 'c9x.png', rarity: 'rare' },
      { id: 10, name: 'Peyton', spriteName: 'c10x.png', rarity: 'rare' },
      { id: 11, name: 'Rowan', spriteName: 'c11x.png', rarity: 'rare' },
      { id: 12, name: 'Avery', spriteName: 'c12x.png', rarity: 'rare' },
      { id: 13, name: 'Cameron', spriteName: 'c13x.png', rarity: 'rare' },
    ],
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      vibration: true,
      adsRemoved: false,
      hintEnabled: true,
      language: 'en',
      notifications: false,
      theme: 'default',
    },
    ads: {
      dailyAdLimit: 5,
      lastAdWatchDate: null,
      watchedToday: 0,
      navigationCount: 0, // Her 5 sayfada bir reklam için sayaç
    },
    _isLoaded: false,
  }),

  getters: {
    getPowerUpQuantity: state => (powerUpId) => {
      const powerUp = state.inventory.powerUps.find(p => p.id === powerUpId)
      return powerUp ? powerUp.quantity : 0
    },
    levelStars: state => level => state.profile.levelData?.[level]?.stars || 0,
    totalStars: state => Object.values(state.profile.levelData || {}).reduce((sum, d) => sum + (d?.stars || 0), 0),
    getFruit: state => (fruitId) => {
      return state.inventory.fruitInventory[fruitId] || 0
    },
    adsLeftToday: (state) => {
      const today = new Date().toISOString().slice(0, 10)
      if (state.ads.lastAdWatchDate !== today) {
        return state.ads.dailyAdLimit
      }
      return Math.max(0, state.ads.dailyAdLimit - state.ads.watchedToday)
    },
    speedUpOrderCost: () => 20,
    orderEnergyCost: () => 10,
  },

  actions: {
    async loadFromStorage() {
      if (this._isLoaded) return
      const savedData = await playerStorage.load()
      if (savedData) {
        this.$patch(savedData)
      }

      const totalSlots = 3
      while (this.orders.length < totalSlots) {
        this.orders.push(null)
      }
      if (this.orders.length > totalSlots) {
        this.orders.splice(totalSlots)
      }

      this.generateOrders(false)
      this._isLoaded = true
    },

    async saveToStorage() {
      if (!this._isLoaded) return
      const { _isLoaded, ...dataToSave } = this.$state
      await playerStorage.save(dataToSave)
    },

    generateOrders() {
      const availableFruits = FRUIT_TYPES
      if (availableFruits.length === 0) return

      let ordersStateChanged = false
      const now = Date.now()

      this.orders.forEach((order, index) => {
        if (order && order.expiresAt && now > order.expiresAt) {
          this.orders[index] = null
          ordersStateChanged = true
        }
      })

      const activeCharacterIds = this.orders.filter(o => o !== null).map(o => o.characterId)
      const commonCharacters = this.characters.filter(c => c.rarity === 'common' && !activeCharacterIds.includes(c.id))
      const rareCharacters = this.characters.filter(c => c.rarity === 'rare' && !activeCharacterIds.includes(c.id))

      this.orders.forEach((order, index) => {
        const shouldGenerate = !order

        if (shouldGenerate) {
          const isRareOrder = Math.random() < 0.2 && rareCharacters.length > 0
          let characterPool = isRareOrder ? rareCharacters : commonCharacters
          if (characterPool.length === 0) characterPool = commonCharacters
          if (characterPool.length === 0) return

          const charIndex = Math.floor(Math.random() * characterPool.length)
          const selectedCharacter = characterPool.splice(charIndex, 1)[0]
          const level = this.profile.gameLevel

          const requiredFruitVariety = Math.min(Math.floor(1 + level / 10), 3) // Kolaylaştırdık (max 3 çeşit)
          const requirements = {}
          const usedFruits = new Set()
          for (let i = 0; i < requiredFruitVariety; i++) {
            let randomFruit
            do {
              randomFruit = availableFruits[Math.floor(Math.random() * availableFruits.length)]
            } while (usedFruits.has(randomFruit.id))
            usedFruits.add(randomFruit.id)
            const baseAmount = 1 + Math.floor(level / 5) // Kolaylaştırdık
            requirements[randomFruit.id] = Math.ceil(baseAmount + Math.random() * 2)
          }

          const minDurationMs = 3 * 60 * 60 * 1000
          const maxDurationMs = 24 * 60 * 60 * 1000
          const durationMs = minDurationMs + Math.random() * (maxDurationMs - minDurationMs)
          const durationHours = durationMs / (1000 * 60 * 60)
          const reward = Math.max(1, Math.round(9 - (durationHours / 2.1)))

          this.orders[index] = {
            id: `order-${index}-${now}`,
            characterId: selectedCharacter.id,
            requirements,
            reward,
            createdAt: now,
            expiresAt: now + durationMs,
          }
          ordersStateChanged = true
        }
      })

      if (ordersStateChanged) this.saveToStorage()
    },

    completeOrder(orderId) {
      const orderIndex = this.orders.findIndex(o => o && o.id === orderId)
      if (orderIndex === -1) return { success: false, message: 'Sipariş bulunamadı.' }

      const order = this.orders[orderIndex]

      if (Date.now() > order.expiresAt) {
        this.orders[orderIndex] = null
        this.generateOrders()
        this.saveToStorage()
        return { success: false, message: 'Siparişin süresi doldu!' }
      }

      const energyCost = this.orderEnergyCost
      if (this.energy.current < energyCost) {
        return { success: false, message: 'not_enough_energy' }
      }

      for (const fruitType in order.requirements) {
        if ((this.inventory.fruitInventory[fruitType] || 0) < order.requirements[fruitType]) {
          return { success: false, message: 'Yeterli meyveniz yok.' }
        }
      }

      for (const fruitType in order.requirements) {
        this.inventory.fruitInventory[fruitType] -= order.requirements[fruitType]
      }

      this.energy.current -= energyCost
      this.addCurrency('gold', order.reward)
      this.stats.totalOrdersCompleted++

      this.orders[orderIndex] = null // Bekleme süresi olmadan hemen yenisi gelsin

      this.generateOrders()
      this.saveToStorage()
      return { success: true, reward: order.reward, message: 'Sipariş tamamlandı!' }
    },

    speedUpOrder(orderIndex) {
      const order = this.orders[orderIndex]
      if (!order || !order.cooldownUntil) {
        return { success: false, message: 'Bu sipariş şu anda hızlandırılamaz.' }
      }

      const cost = this.speedUpOrderCost
      if (!this.spendCurrency('gold', cost)) {
        return { success: false, message: 'Yeterli altınınız yok.' }
      }

      this.orders[orderIndex] = null
      this.generateOrders()
      this.saveToStorage()
      return { success: true }
    },

    removeOrder(orderIndex) {
      const order = this.orders[orderIndex]
      if (!order) {
        return { success: false, message: 'Bu sipariş şu anda silinemez.' }
      }

      this.orders[orderIndex] = null // Bekleme süresi yok
      this.generateOrders()
      this.saveToStorage()
      return { success: true }
    },

    addTestOrder() {
      const availableFruits = FRUIT_TYPES
      if (availableFruits.length === 0) {
        return { success: false, message: 'Meyve verisi yok.' }
      }

      let availableSlotIndex = this.orders.findIndex(o => !o || (o.cooldownUntil && Date.now() > o.cooldownUntil))

      // GÜNCELLEME: Boş yuva bulunamazsa, test amacıyla ilk siparişin üzerine yaz.
      if (availableSlotIndex === -1) {
        availableSlotIndex = 0
      }

      const activeCharacterIds = this.orders.filter((o, index) => o && !o.cooldownUntil && index !== availableSlotIndex).map(o => o.characterId)
      let availableCharacters = this.characters.filter(c => !activeCharacterIds.includes(c.id))
      if (availableCharacters.length === 0) {
        availableCharacters = this.characters
      }

      const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)]
      const randomFruit = availableFruits[Math.floor(Math.random() * availableFruits.length)]

      const now = Date.now()
      const newOrder = {
        id: `order-debug-${now}`,
        characterId: randomCharacter.id,
        requirements: {
          [randomFruit.id]: 1,
        },
        reward: 5,
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000, // 10 dakika
        cooldownUntil: null,
      }

      // GÜNCELLEME: Reaktiviteyi garantilemek için splice kullanıldı.
      this.orders.splice(availableSlotIndex, 1, newOrder)
      this.saveToStorage()
      return { success: true, message: 'Test siparişi eklendi.' }
    },

    addTestFruits() {
      FRUIT_TYPES.forEach((fruit) => {
        this.inventory.fruitInventory[fruit.id] = (this.inventory.fruitInventory[fruit.id] || 0) + 10
      })
      this.saveToStorage()
      return { success: true, message: 'Test meyveleri eklendi.' }
    },

    handleNavigation() {
      if (this.settings.adsRemoved) {
        return false // Reklamlar kaldırıldıysa bir şey yapma
      }

      if (!this.ads.navigationCount) {
        this.ads.navigationCount = 0
      }

      this.ads.navigationCount++
      this.saveToStorage()

      if (this.ads.navigationCount >= 10) {
        this.ads.navigationCount = 0
        this.saveToStorage()
        return true // Reklam gösterme zamanı
      }

      return false // Henüz reklam gösterme
    },

    addCurrency(type, amount) {
      if (this.currencies[type] !== undefined) {
        this.currencies[type] += amount
      }
    },

    addEnergy(amount) {
      this.energy.current = Math.min(this.energy.max, this.energy.current + amount)
      this.saveToStorage()
    },

    spendCurrency(type, amount) {
      if (this.currencies[type] !== undefined && this.currencies[type] >= amount) {
        this.currencies[type] -= amount
        this.saveToStorage()
        return true
      }
      return false
    },

    addPowerUp(powerUpId, quantity) {
      const powerUp = this.inventory.powerUps.find(p => p.id === powerUpId)
      if (powerUp) {
        powerUp.quantity += quantity
      }
      else {
        this.inventory.powerUps.push({ id: powerUpId, quantity })
      }
      this.saveToStorage()
    },

    usePowerUp(powerUpId) {
      const powerUpIndex = this.inventory.powerUps.findIndex(p => p.id === powerUpId)
      if (powerUpIndex !== -1 && this.inventory.powerUps[powerUpIndex].quantity > 0) {
        this.inventory.powerUps[powerUpIndex].quantity--
        this.saveToStorage()
        return true
      }
      return false
    },

    /**
     * Seviye geçildi (en az 1 yıldız). Geçilen seviye tekrar oynanmaz.
     * @param {number} level
     * @param {Record<string, number>} collectedFruits
     * @param {number} [stars] 1..3
     */
    completeLevel(level, collectedFruits, stars = 1) {
      if (level === this.profile.gameLevel) {
        this.profile.gameLevel++
      }
      if (!this.profile.levelData)
        this.profile.levelData = {}
      const prev = this.profile.levelData[level]?.stars || 0
      this.profile.levelData[level] = { stars: Math.max(prev, stars), at: Date.now() }
      for (const fruitType in collectedFruits) {
        if (Object.hasOwnProperty.call(collectedFruits, fruitType)) {
          const amount = collectedFruits[fruitType]
          this.inventory.fruitInventory[fruitType] = (this.inventory.fruitInventory[fruitType] || 0) + amount
        }
      }
      this.saveToStorage()
    },
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
      this.saveToStorage()
    },

    removeAds() {
      if (!this.settings.adsRemoved) {
        this.settings.adsRemoved = true
        this.saveToStorage()
        console.log('Ads have been removed.')
      }
    },
    recordAdWatch() {
      const today = new Date().toISOString().slice(0, 10)
      if (this.ads.lastAdWatchDate !== today) {
        this.ads.watchedToday = 1
        this.ads.lastAdWatchDate = today
      }
      else {
        this.ads.watchedToday++
      }
      this.saveToStorage()
    },

    hasSeenTip(id) {
      return (this.profile.seenTips || []).includes(id)
    },

    markTipSeen(id) {
      if (!this.profile.seenTips)
        this.profile.seenTips = []
      if (!this.profile.seenTips.includes(id)) {
        this.profile.seenTips.push(id)
        this.saveToStorage()
      }
    },

    canOpenFreeCase() {
      const now = Date.now()
      const cooldown = 24 * 60 * 60 * 1000 // 24 saat
      return now - (this.profile.lastFreeCaseOpenTime || 0) >= cooldown
    },

    recordFreeCaseOpen() {
      this.profile.lastFreeCaseOpenTime = Date.now()
      this.saveToStorage()
    },
  },
})
