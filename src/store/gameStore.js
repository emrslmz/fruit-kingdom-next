import { defineStore } from 'pinia'
import { usePlayerStore } from './playerStore'
import { soundService } from '@/core/services/SoundService'
import vibrationService from '@/core/services/VibrationService'
import { toastService } from '@/core/services/ToastService'
import i18n from '@/i18n'

// Helper function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

export const useGameStore = defineStore('game', {
  state: () => ({
    currentLevel: 1,
    columns: [[], [], [], []],
    selectionBox: Array.from({ length: 7 }).fill(null),
    isGameOver: false,
    levelComplete: false,
    isPowerUpAnimating: false,
    isShakeEffect: false,
    isInteractionLocked: false,
    collectedFruitsThisLevel: {},
    fruitTypes: [
      { id: 'apple', name: 'Apple', imgPath: '/assets/fruits/apple.png' },
      { id: 'bamboo', name: 'Bamboo', imgPath: '/assets/fruits/bamboo.png' },
      { id: 'banana', name: 'Banana', imgPath: '/assets/fruits/banana.png' },
      { id: 'berry', name: 'Berry', imgPath: '/assets/fruits/berry.png' },
      { id: 'carrot', name: 'Carrot', imgPath: '/assets/fruits/carrot.png' },
      { id: 'cherry', name: 'Cherry', imgPath: '/assets/fruits/cherry.png' },
      { id: 'coconut', name: 'Coconut', imgPath: '/assets/fruits/coconut.png' },
      { id: 'grape', name: 'Grape', imgPath: '/assets/fruits/grape.png' },
      { id: 'lemon', name: 'Lemon', imgPath: '/assets/fruits/lemon.png' },
      { id: 'orange', name: 'Orange', imgPath: '/assets/fruits/orange.png' },
      { id: 'pear', name: 'Pear', imgPath: '/assets/fruits/pear.png' },
      { id: 'pulm', name: 'Pulm', imgPath: '/assets/fruits/pulm.png' },
      { id: 'strawberry', name: 'Strawberry', imgPath: '/assets/fruits/strawberry.png' },
      { id: 'watermelon', name: 'Watermelon', imgPath: '/assets/fruits/watermelon.png' },
      { id: 'rainbow', name: 'Joker', imgPath: '/assets/power_ups/rainbow.png' },
    ],
  }),

  getters: {
    remainingFruitsByType: (state) => {
      const counts = new Map()
      state.columns.flat().forEach((fruit) => {
        if (fruit.type !== 'rainbow' && !fruit.isBushed && !fruit.isFrozen) {
          counts.set(fruit.type, (counts.get(fruit.type) || 0) + 1)
        }
      })
      return Array.from(counts.entries())
        .map(([type, count]) => {
          const typeInfo = state.fruitTypes.find(f => f.id === type)
          return { type, count, imgPath: typeInfo ? typeInfo.imgPath : '' }
        })
        .filter(f => f.imgPath && f.count > 0)
    },
    isSelectionBoxFull: (state) => {
      return state.selectionBox.filter(Boolean).length >= 7
    },
    areAllFruitsCollected: (state) => {
      return state.columns.every(col => col.length === 0)
    },
    isUnwinnable() {
      if (this.isSelectionBoxFull) {
        return true
      }

      if (this.areAllFruitsCollected) {
        return false
      }

      const allBoardFruits = this.columns.flat()
      if (allBoardFruits.length > 0) {
        const allActiveFruits = allBoardFruits.filter(f => !f.isBushed && f.isFrozen <= 0)
        if (allActiveFruits.length === 0) {
          return true
        }
      }
      return false
    },
  },

  actions: {
    setupLevel(levelId) {
      this.resetGameState()
      this.currentLevel = levelId

      let availableTypesCount = 7 + Math.floor(levelId / 5)
      const allPossibleFruitTypes = this.fruitTypes.filter(f => f.id !== 'rainbow')
      availableTypesCount = Math.min(availableTypesCount, allPossibleFruitTypes.length)

      shuffleArray(allPossibleFruitTypes)
      const availableFruitTypes = allPossibleFruitTypes.slice(0, availableTypesCount)

      let totalTriplets = 8 + levelId
      totalTriplets = Math.min(totalTriplets, 55)

      const allTriplets = []
      let idCounter = 0
      for (let i = 0; i < totalTriplets; i++) {
        const typeInfo = availableFruitTypes[i % availableFruitTypes.length]
        for (let j = 0; j < 3; j++) {
          allTriplets.push({
            id: idCounter,
            uniqueId: `fruit-${levelId}-${idCounter++}`,
            type: typeInfo.id,
            imgPath: typeInfo.imgPath,
            isBushed: false,
            isFrozen: 0,
          })
        }
      }
      let fruitPool = allTriplets.flat()

      let bushedCount = Math.min(40, Math.floor(levelId / 2))
      let frozenCount = Math.min(40, Math.floor(levelId / 2.5))

      if (levelId > 0 && levelId % 7 === 0) {
        bushedCount = Math.floor(bushedCount * 0.25)
        frozenCount = 0
      }

      shuffleArray(fruitPool)

      let appliedBushes = 0
      let appliedFrozen = 0

      for (const fruit of fruitPool) {
        if (appliedBushes < bushedCount && Math.random() < 0.5) {
          fruit.isBushed = true
          appliedBushes++
        }
        else if (appliedFrozen < frozenCount) {
          fruit.isFrozen = levelId > 10 ? 3 : 2
          appliedFrozen++
        }
      }

      fruitPool.sort(() => Math.random() - 0.5)
      const finalColumns = [[], [], [], []]
      fruitPool.forEach((fruit, index) => {
        finalColumns[index % 4].push(fruit)
      })
      this.columns = finalColumns
    },

    updateFruitState(uniqueId, updates) {
      this.columns = this.columns.map(column =>
        column.map((fruit) => {
          if (fruit.uniqueId === uniqueId) {
            return { ...fruit, ...updates }
          }
          return fruit
        }),
      )
    },

    addFruitToSelectionBox(fruitUniqueId, fromColumnIndex) {
      if (this.isInteractionLocked || this.isGameOver || this.isSelectionBoxFull) {
        return
      }

      const col = this.columns[fromColumnIndex]
      if (!col) return

      const itemIndex = col.findIndex(f => f.uniqueId === fruitUniqueId)
      if (itemIndex === -1) return

      const fruit = col[itemIndex]
      if (fruit.isBushed || fruit.isFrozen > 0) {
        return
      }

      this.isInteractionLocked = true

      const newColumns = this.columns.map((c, index) => {
        if (index === fromColumnIndex) {
          return c.filter(f => f.uniqueId !== fruitUniqueId)
        }
        return c
      })
      this.columns = newColumns

      const newSelectionBox = [...this.selectionBox]
      const firstEmptySlot = newSelectionBox.findIndex(slot => slot === null)
      if (firstEmptySlot !== -1) {
        newSelectionBox[firstEmptySlot] = fruit
        this.selectionBox = newSelectionBox
      }

      const fruitsInBox = this.selectionBox.filter(Boolean)
      const typeCounts = new Map()
      const jokers = fruitsInBox.filter(f => f.type === 'rainbow')

      fruitsInBox.forEach((f) => {
        if (f.type !== 'rainbow') {
          typeCounts.set(f.type, (typeCounts.get(f.type) || 0) + 1)
        }
      })

      let typeToSqueeze = null
      for (const [type, count] of typeCounts.entries()) {
        if (count + jokers.length >= 3) {
          typeToSqueeze = type
          break
        }
      }

      if (typeToSqueeze) {
        setTimeout(() => {
          vibrationService.vibrate('success')
          soundService.playEffect('echopop_effect')

          const matchedFruitsCount = typeCounts.get(typeToSqueeze) || 0
          const jokersToUseCount = 3 - matchedFruitsCount
          this.collectedFruitsThisLevel[typeToSqueeze] = (this.collectedFruitsThisLevel[typeToSqueeze] || 0) + matchedFruitsCount
          if (jokersToUseCount > 0) {
            this.collectedFruitsThisLevel.rainbow = (this.collectedFruitsThisLevel.rainbow || 0) + jokersToUseCount
          }

          const jokersToUse = jokers.slice(0, jokersToUseCount)
          const jokerIdsToUse = new Set(jokersToUse.map(j => j.uniqueId))

          const remaining = this.selectionBox.filter((f) => {
            if (!f) return false
            if (f.type === typeToSqueeze) return false
            if (jokerIdsToUse.has(f.uniqueId)) return false
            return true
          })

          const finalSelectionBox = Array.from({ length: 7 }).fill(null)
          remaining.forEach((f, index) => { finalSelectionBox[index] = f })
          this.selectionBox = finalSelectionBox

          this.checkGameOver()
          this.isInteractionLocked = false
        }, 400)
      }
      else {
        this.checkGameOver()
        setTimeout(() => {
          this.isInteractionLocked = false
        }, 150)
      }
    },

    checkGameOver() {
      if (this.isGameOver) return

      if (this.areAllFruitsCollected && this.selectionBox.every(s => s === null)) {
        this.levelFinished(true)
        return
      }

      setTimeout(() => {
        if (!this.isGameOver && this.isUnwinnable) {
          this.levelFinished(false)
        }
      }, 500)
    },

    revivePlayer() {
      if (this.isGameOver) {
        const fruitsInBox = this.selectionBox.filter(Boolean)
        const toRemoveCount = Math.min(3, fruitsInBox.length)

        for (let i = 0; i < toRemoveCount; i++) {
          fruitsInBox.pop()
        }

        const newBox = Array.from({ length: 7 }).fill(null)
        fruitsInBox.forEach((f, i) => newBox[i] = f)
        this.selectionBox = newBox

        this.isGameOver = false
      }
    },

    levelFinished(isWin) {
      if (this.isGameOver) return
      this.isGameOver = true
      if (isWin) {
        const playerStore = usePlayerStore()
        playerStore.completeLevel(this.currentLevel, this.collectedFruitsThisLevel)
        this.levelComplete = true
      }
    },

    resetGameState() {
      this.currentLevel = 1
      this.columns = [[], [], [], []]
      this.selectionBox = Array.from({ length: 7 }).fill(null)
      this.isGameOver = false
      this.levelComplete = false
      this.isPowerUpAnimating = false
      this.isInteractionLocked = false
      this.collectedFruitsThisLevel = {}
    },

    triggerShakeEffect() {
      this.isShakeEffect = true
      setTimeout(() => {
        this.isShakeEffect = false
      }, 500)
    },

    useBrushPowerUp() {
      if (this.isPowerUpAnimating) return
      this.isPowerUpAnimating = true
      const t = i18n.global.t

      vibrationService.vibrate('heavy')

      const bushedFruits = this.columns.flat().filter(f => f.isBushed)
      if (bushedFruits.length === 0) {
        toastService.show(t('no_bushes_on_board'), 'info')
        const playerStore = usePlayerStore()
        playerStore.addPowerUp('brush', 1)
        this.isPowerUpAnimating = false
        return
      }

      this.columns = this.columns.map(column =>
        column.map((fruit) => {
          if (fruit.isBushed) {
            return { ...fruit, isBushed: false }
          }
          return fruit
        }),
      )
      soundService.playEffect('bush_powerup_effect')
      toastService.show(t('all_bushes_removed'), 'success')

      setTimeout(() => { this.isPowerUpAnimating = false }, 500)
    },

    useTornadoPowerUp() {
      if (this.isPowerUpAnimating) return
      this.isPowerUpAnimating = true
      const t = i18n.global.t

      vibrationService.vibrate('heavy')

      const blockedFruits = this.columns.flat().filter(f => f.isBushed || f.isFrozen > 0)
      if (blockedFruits.length === 0) {
        toastService.show(t('no_blocks_on_board'), 'info')
        const playerStore = usePlayerStore()
        playerStore.addPowerUp('tornado', 1)
        this.isPowerUpAnimating = false
        return
      }

      this.columns = this.columns.map(column =>
        column.map((fruit) => {
          if (fruit.isBushed || fruit.isFrozen > 0) {
            return { ...fruit, isBushed: false, isFrozen: 0 }
          }
          return fruit
        }),
      )
      soundService.playEffect('wind_effect')
      toastService.show(t('all_blocks_removed'), 'success')

      setTimeout(() => { this.isPowerUpAnimating = false }, 500)
    },

    useDynamitePowerUp() {
      if (this.isPowerUpAnimating) return
      this.isPowerUpAnimating = true
      const playerStore = usePlayerStore()
      const t = i18n.global.t

      const allFruitsOnBoard = this.columns.flat().filter(f => !f.isBushed && f.isFrozen <= 0 && f.type !== 'rainbow')

      const fruitsByType = allFruitsOnBoard.reduce((acc, fruit) => {
        if (!acc[fruit.type]) acc[fruit.type] = []
        acc[fruit.type].push(fruit)
        return acc
      }, {})

      let typeToExplode = null
      let maxCount = 0
      for (const type in fruitsByType) {
        if (fruitsByType[type].length >= 3 && fruitsByType[type].length > maxCount) {
          maxCount = fruitsByType[type].length
          typeToExplode = type
        }
      }

      if (!typeToExplode) {
        toastService.show(t('no_matching_3_fruits_to_explode'), 'warning')
        playerStore.addPowerUp('dynamite', 1)
        this.isPowerUpAnimating = false
        return
      }

      soundService.playEffect('pop_effect')
      vibrationService.vibrate('heavy')

      const fruitsToRemove = fruitsByType[typeToExplode].slice(0, 3)
      const idsToRemove = new Set(fruitsToRemove.map(f => f.uniqueId))

      this.columns = this.columns.map(col => col.filter(f => !idsToRemove.has(f.uniqueId)))

      setTimeout(() => {
        this.isPowerUpAnimating = false
        this.checkGameOver()
      }, 500)
    },
  },
})
