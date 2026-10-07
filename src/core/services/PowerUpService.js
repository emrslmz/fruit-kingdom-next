import { useGameStore } from '@/store/gameStore'
import { usePlayerStore } from '@/store/playerStore'
import { toastService } from '@/core/services/ToastService'
import { soundService } from '@/core/services/SoundService'
import vibrationService from '@/core/services/VibrationService'
import i18n from '@/i18n'

class PowerUpService {
  constructor() {
    this.gameStore = useGameStore()
    this.playerStore = usePlayerStore()
    this.t = i18n.global.t
  }

  use(powerUpId) {
    if (this.gameStore.isGameOver || this.gameStore.isPowerUpAnimating) return

    const hasPowerUp = this.playerStore.usePowerUp(powerUpId)
    if (!hasPowerUp) {
      toastService.show(this.t('not_owned'), 'error')
      return
    }

    this.gameStore.isPowerUpAnimating = true

    switch (powerUpId) {
      case 'rainbow':
        vibrationService.vibrate('powerup')
        this.activateRainbow()
        this.gameStore.isPowerUpAnimating = false
        break
      case 'dynamite':
        vibrationService.vibrate('powerup')
        this.activateDynamite()
        break
      // GÜÇLENDİRME MANTIKLARI GÜNCELLENDİ
      case 'brush':
        vibrationService.vibrate('powerup')
        this.activateBrush()
        break
      case 'tornado':
        vibrationService.vibrate('powerup')
        this.activateTornado()
        break
      default:
        console.warn(`Unknown power-up ID: ${powerUpId}`)
        this.gameStore.isPowerUpAnimating = false
    }
  }

  activateRainbow() {
    // HATA DÜZELTMESİ: 'squeezeBox' yerine 'selectionBox' kullanıldı.
    if (this.gameStore.isSelectionBoxFull) {
      toastService.show(this.t('squeeze_bar_full'), 'warning')
      this.playerStore.addPowerUp('rainbow', 1)
      return
    }

    // HATA DÜZELTMESİ: 'squeezeBox' yerine 'selectionBox' kullanıldı.
    const jokerCount = this.gameStore.selectionBox.filter(item => item && item.type === 'rainbow').length
    if (jokerCount >= 2) {
      toastService.show(this.t('max_joker_usage'), 'warning')
      this.playerStore.addPowerUp('rainbow', 1)
      return
    }

    // HATA DÜZELTMESİ: 'addFruitToSqueezeBox' yerine 'addFruitToSelectionBox' kullanıldı.
    this.gameStore.addFruitToSelectionBox({
      id: 'rainbow',
      uniqueId: `rainbow-${Date.now()}`,
      type: 'rainbow',
      imgPath: '/assets/power_ups/rainbow.png',
    })
    toastService.show(this.t('joker_added'), 'success')
  }

  activateDynamite() {
    const allFruitsOnBoard = this.gameStore.columns.flat().filter(f => f.type !== 'rainbow')
    const fruitsByType = allFruitsOnBoard.reduce((acc, fruit) => {
      if (!acc[fruit.type]) {
        acc[fruit.type] = []
      }
      acc[fruit.type].push(fruit)
      return acc
    }, {})

    let fruitsToRemove = null
    // En çok bulunan türü patlatmak daha tatmin edici olabilir
    let maxCount = 0
    let typeToExplode = null

    for (const type in fruitsByType) {
      if (fruitsByType[type].length > maxCount) {
        maxCount = fruitsByType[type].length
        typeToExplode = type
      }
    }

    if (typeToExplode && maxCount >= 3) {
      fruitsToRemove = fruitsByType[typeToExplode].slice(0, 3)
    }

    if (!fruitsToRemove) {
      toastService.show(this.t('no_matching_3_fruits'), 'warning')
      this.playerStore.addPowerUp('dynamite', 1)
      this.gameStore.isPowerUpAnimating = false
      return
    }

    this.removeFruits(fruitsToRemove)
    toastService.show(this.t('three_fruits_exploded'), 'success')
  }

  // GÜÇLENDİRME FONKSİYONLARI GÜNCELLENDİ
  activateBrush() {
    this.gameStore.triggerShakeEffect() // Sarsıntı efektini tetikle

    const bushedFruits = this.gameStore.columns.flat().filter(f => f.isBushed)
    if (bushedFruits.length === 0) {
      toastService.show(this.t('no_bushes_on_board'), 'info')
      this.playerStore.addPowerUp('brush', 1) // Güçlendirmeyi iade et
      this.gameStore.isPowerUpAnimating = false
      return
    }

    bushedFruits.forEach((fruit) => {
      this.gameStore.updateFruitState(fruit.uniqueId, { isBushed: false })
    })

    setTimeout(() => {
      this.gameStore.isPowerUpAnimating = false
      toastService.show(this.t('all_bushes_removed'), 'success')
    }, 500) // Animasyonların bitmesi için bekle
  }

  activateTornado() {
    const blockedFruits = this.gameStore.columns.flat().filter(f => f.isBushed || f.isFrozen > 0)
    if (blockedFruits.length === 0) {
      toastService.show(this.t('no_blocks_on_board'), 'info')
      this.playerStore.addPowerUp('tornado', 1) // Güçlendirmeyi iade et
      this.gameStore.isPowerUpAnimating = false
      return
    }

    blockedFruits.forEach((fruit) => {
      this.gameStore.updateFruitState(fruit.uniqueId, { isBushed: false, isFrozen: 0 })
    })

    setTimeout(() => {
      this.gameStore.isPowerUpAnimating = false
      toastService.show(this.t('all_blocks_removed'), 'success')
    }, 500) // Animasyonların bitmesi için bekle
  }

  removeFruits(fruitsToRemove) {
    if (!fruitsToRemove || fruitsToRemove.length === 0) {
      this.gameStore.isPowerUpAnimating = false
      this.gameStore.checkGameOver()
      return
    }

    const idsToRemove = new Set(fruitsToRemove.map(f => f.uniqueId))

    // DÜZELTME: Store'u direkt güncellemek reaktiviteyi tetikler.
    // Phaser'daki watch bu değişikliği yakalayıp animasyonu oynatacaktır.
    this.gameStore.columns = this.gameStore.columns.map(col => col.filter(f => !idsToRemove.has(f.uniqueId)))

    setTimeout(() => {
      this.gameStore.isPowerUpAnimating = false
      this.gameStore.checkGameOver()
    }, 600)
  }
}

export const powerUpService = new PowerUpService()
