<script setup>
import Phaser from 'phaser'
import { ref, shallowRef, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useGameStore } from '@/store/gameStore.js'
import { toastService } from '@/core/services/ToastService.js'
import { useI18n } from 'vue-i18n'
import { soundService } from '@/core/services/soundService'
import vibrationService from '@/core/services/VibrationService'

const { t } = useI18n()

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['fruitClicked'])

const phaserContainer = ref(null)
const gameInstance = shallowRef(null)
const sceneInstance = ref(null)
let isLaunching = false

watch(() => props.columns, (newColumns, oldColumns) => {
  if (sceneInstance.value && gameInstance.value?.scene?.isActive('GameScene')) {
    sceneInstance.value.reconcileGrid(newColumns, oldColumns)
  }
}, { deep: true })

function launchPhaser() {
  if (isLaunching || gameInstance.value) {
    return
  }
  isLaunching = true

  if (gameInstance.value) {
    gameInstance.value.destroy(true)
  }
  if (!phaserContainer.value) {
    isLaunching = false
    return
  }

  class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' })
    }

    preload() {
      if (!this.textures.exists('game-atlas')) {
        this.load.atlas('game-atlas', 'assets/sprites/game-atlas.png', 'assets/sprites/game-atlas.json')
      }
    }

    create() {
      sceneInstance.value = this
      this.fruitSprites = new Map()
      this.calculateGridMetrics()

      props.columns.forEach((column, colIndex) => {
        column.forEach((fruit, rowIndex) => {
          this.createFruitSprite(fruit, colIndex, rowIndex, true)
        })
      })

      this.scale.on('resize', this.handleResize, this)
    }

    calculateGridMetrics() {
      this.numColumns = 4
      const screenWidth = this.scale.width
      this.boxSize = Math.min(screenWidth / 5.5, 90)
      this.totalBoxesWidth = this.numColumns * this.boxSize
      this.gap = (screenWidth - this.totalBoxesWidth) / (this.numColumns + 1)
    }

    getSqueezeSlotPosition(slotIndex) {
      const screenWidth = this.scale.width
      const totalBarWidth = screenWidth * 0.7
      const slotWidth = totalBarWidth / 7.5
      const startX = (screenWidth - totalBarWidth) / 2
      const x = startX + slotIndex * (slotWidth) + slotWidth / 2
      const y = this.scale.height - 60
      return { x, y }
    }

    handleResize() {
      if (!this.scale.parent) return
      this.calculateGridMetrics()
      this.fruitSprites.forEach((sprite) => {
        const fruitInfo = sprite.getData('fruitInfo')
        let found = false
        for (let i = 0; i < props.columns.length; i++) {
          const j = props.columns[i].findIndex(f => f.uniqueId === fruitInfo.uniqueId)
          if (j !== -1) {
            const { x, y } = this.getGridPosition(i, j)
            sprite.setPosition(x, y)
            found = true
            break
          }
        }
        if (!found && sprite.active) sprite.destroy()
      })
    }

    getGridPosition(colIndex, rowIndex) {
      const x = this.gap + this.boxSize / 2 + colIndex * (this.boxSize + this.gap)
      const y = this.scale.height - (rowIndex * this.boxSize * 0.95) - (this.boxSize / 2) - 10
      return { x, y }
    }

    onFruitPointerDown(container) {
      const gameStore = useGameStore()
      let fruitInfo = container.getData('fruitInfo')

      if (gameStore.isGameOver || gameStore.isInteractionLocked) {
        return
      }

      const column = gameStore.columns[fruitInfo.colIndex]
      if (!column || !column.some(f => f.uniqueId === fruitInfo.uniqueId)) {
        return
      }

      if (fruitInfo.isFrozen > 0) {
        this.handleIceClick(container, fruitInfo)
        return
      }

      if (fruitInfo.isBushed) {
        if (gameStore.isSelectionBoxFull) {
          toastService.show(t('cannot_add_more_fruit'), 'warning', 1500)
          return
        }
        soundService.playEffect('bush_effect')
        vibrationService.vibrate('success')

        const bushSprite = container.getData('bushSprite')
        if (bushSprite) {
          const bushLeft = this.add.image(container.x, container.y, 'game-atlas', bushSprite.frame.name).setScale(bushSprite.scale)
          const bushRight = this.add.image(container.x, container.y, 'game-atlas', bushSprite.frame.name).setScale(bushSprite.scale)
          bushSprite.destroy()
          this.tweens.add({ targets: bushLeft, x: '-=40', alpha: 0, rotation: -0.8, duration: 400, ease: 'power1.out', onComplete: () => bushLeft.destroy() })
          this.tweens.add({ targets: bushRight, x: '+=40', alpha: 0, rotation: 0.8, duration: 400, ease: 'power1.out', onComplete: () => bushRight.destroy() })
        }
        const fruitSprite = container.list[1]
        if (fruitSprite) this.tweens.add({ targets: fruitSprite, alpha: 1, duration: 200 })

        gameStore.updateFruitState(fruitInfo.uniqueId, { isBushed: false })
        fruitInfo = { ...fruitInfo, isBushed: false }
        container.setData('fruitInfo', fruitInfo)
      }

      this.collectFruit(container, fruitInfo)
    }

    createFruitSprite(fruit, colIndex, rowIndex, withInitialAnimation) {
      const { x, y } = this.getGridPosition(colIndex, rowIndex)
      const container = this.add.container(x, withInitialAnimation ? -this.boxSize : y)

      const boxSprite = this.add.image(0, 0, 'game-atlas', 'bisquit.png')
      const fruitSprite = this.add.image(0, 0, 'game-atlas', `${fruit.type}.png`)

      boxSprite.setScale(this.boxSize / boxSprite.width)
      fruitSprite.setScale((boxSprite.displayWidth * 0.85) / fruitSprite.width)
      container.add([boxSprite, fruitSprite])

      if (fruit.isBushed) {
        const bushType = `bush${Phaser.Math.Between(1, 5)}.png`
        const bushSprite = this.add.image(0, 0, 'game-atlas', bushType)
        bushSprite.setScale(boxSprite.displayWidth / bushSprite.width * 1.2)
        container.add(bushSprite)
        container.setData('bushSprite', bushSprite)
        fruitSprite.setAlpha(0.6)
      }
      else if (fruit.isFrozen > 0) {
        const iceSprite = this.add.image(0, 0, 'game-atlas', 'freeze_box.png')
        iceSprite.setScale(boxSprite.displayWidth / iceSprite.width)
        iceSprite.setAlpha(0.5 + (0.1 * fruit.isFrozen))
        container.add(iceSprite)
        container.setData('iceSprite', iceSprite)
      }

      container.setSize(boxSprite.displayWidth, boxSprite.displayHeight)
      container.setData('fruitInfo', { ...fruit, colIndex })
      container.setInteractive({ useHandCursor: true })
      container.on('pointerdown', () => this.onFruitPointerDown(container))
      this.fruitSprites.set(fruit.uniqueId, container)

      if (withInitialAnimation) {
        this.tweens.add({
          targets: container,
          y,
          duration: 700,
          ease: 'Bounce.easeOut',
          delay: rowIndex * 50 + colIndex * 25,
        })
      }
    }

    createIceShatterEffect(x, y) {
      for (let i = 0; i < 8; i++) {
        const shard = this.add.image(x, y, 'game-atlas', 'freeze_box.png')
        shard.setScale(this.boxSize / shard.width * 0.2).setTint(0xADD8E6)
        const angle = Phaser.Math.RND.realInRange(0, Math.PI * 2)
        const distance = Phaser.Math.RND.realInRange(30, 60)
        this.tweens.add({ targets: shard, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, rotation: Phaser.Math.RND.realInRange(-Math.PI, Math.PI), scale: shard.scale * 0.5, duration: 400 + Math.random() * 200, ease: 'quad.out', onComplete: () => shard.destroy() })
      }
    }

    handleIceClick(container, fruitInfo) {
      const gameStore = useGameStore()
      gameStore.isInteractionLocked = true
      vibrationService.vibrate('success')
      soundService.playEffect('ice_effect')

      const iceSprite = container.getData('iceSprite')
      const newHealth = fruitInfo.isFrozen - 1
      gameStore.updateFruitState(fruitInfo.uniqueId, { isFrozen: newHealth })
      container.setData('fruitInfo', { ...fruitInfo, isFrozen: newHealth })

      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 80, yoyo: true, ease: 'quad.inout' })

      if (newHealth <= 0) {
        if (iceSprite && iceSprite.active) {
          this.createIceShatterEffect(container.x, container.y)
          this.tweens.add({ targets: iceSprite, alpha: 0, duration: 100, onComplete: () => { if (iceSprite) iceSprite.destroy() } })
        }
      }
      else {
        if (iceSprite && iceSprite.active) iceSprite.setAlpha(0.5 + (0.1 * newHealth))
      }

      this.time.delayedCall(100, () => { gameStore.isInteractionLocked = false })
    }

    // --- DEĞİŞİKLİK: Hata veren 'timeline' fonksiyonu kaldırıldı ve animasyon zincirleme ile yeniden yazıldı ---
    collectFruit(container, fruitInfo) {
      const gameStore = useGameStore()
      if (gameStore.isSelectionBoxFull || gameStore.isGameOver || !container.active) {
        if (gameStore.isSelectionBoxFull) toastService.show(t('cannot_add_more_fruit'), 'warning', 1500)
        return
      }

      soundService.playEffect('log_effect')
      container.disableInteractive()
      emit('fruitClicked', { uniqueId: fruitInfo.uniqueId, colIndex: fruitInfo.colIndex })

      const targetSlotIndex = gameStore.selectionBox.filter(Boolean).length
      const targetPos = this.getSqueezeSlotPosition(targetSlotIndex)

      // 1. Aşama: Yerinden fırlama efekti
      this.tweens.add({
        targets: container,
        scale: 1.2,
        angle: 10,
        duration: 150,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Güvenlik kontrolü: Eğer sahne veya container yok olmuşsa ikinci animasyonu başlatma
          if (!container || !container.scene) return

          // 2. Aşama: Slota doğru zarifçe uçma
          this.tweens.add({
            targets: container,
            x: targetPos.x,
            y: targetPos.y,
            scale: 0.4,
            alpha: 0.8,
            rotation: Math.PI,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              // Animasyon bittiğinde container hala varsa yok et
              if (container && container.active) {
                container.destroy()
              }
            },
          })
        },
      })
    }

    reconcileGrid(newColumns, oldColumns) {
      if (!this.fruitSprites) return

      const newFruitIds = new Set(newColumns.flat().map(f => f.uniqueId))
      const oldFruitsMap = new Map(oldColumns.flat().map(f => [f.uniqueId, f]))

      this.fruitSprites.forEach((sprite, uniqueId) => {
        if (!newFruitIds.has(uniqueId) && sprite.active) {
          if (this.tweens.getTweensOf(sprite).length > 0) return
          this.tweens.add({ targets: sprite, scale: 0, alpha: 0, duration: 300, ease: 'power1.in', onComplete: () => sprite.destroy() })
          this.fruitSprites.delete(uniqueId)
        }
      })

      newColumns.forEach((column, colIndex) => {
        column.forEach((newFruit, rowIndex) => {
          const sprite = this.fruitSprites.get(newFruit.uniqueId)
          if (!sprite || !sprite.active) return

          const oldFruit = oldFruitsMap.get(newFruit.uniqueId)

          if (oldFruit) {
            if (oldFruit.isBushed && !newFruit.isBushed) {
              const bushSprite = sprite.getData('bushSprite')
              if (bushSprite && bushSprite.active) {
                this.tweens.add({ targets: bushSprite, alpha: 0, scale: 1.5, duration: 300, onComplete: () => bushSprite.destroy() })
                sprite.setData('bushSprite', null)
                const fruitSprite = sprite.list[1]
                if (fruitSprite) this.tweens.add({ targets: fruitSprite, alpha: 1, duration: 200 })
              }
            }

            if (oldFruit.isFrozen > 0 && newFruit.isFrozen <= 0) {
              const iceSprite = sprite.getData('iceSprite')
              if (iceSprite && iceSprite.active) {
                this.createIceShatterEffect(sprite.x, sprite.y)
                this.tweens.add({ targets: iceSprite, alpha: 0, duration: 100, onComplete: () => iceSprite.destroy() })
                sprite.setData('iceSprite', null)
              }
            }
          }

          const { x, y } = this.getGridPosition(colIndex, rowIndex)
          sprite.setData('fruitInfo', { ...newFruit, colIndex })

          if (Math.round(sprite.x) !== Math.round(x) || Math.round(sprite.y) !== Math.round(y)) {
            this.tweens.killTweensOf(sprite)
            this.tweens.add({
              targets: sprite,
              x,
              y,
              duration: 600,
              ease: 'Bounce.easeOut',
            })
          }
        })
      })
    }

    shutdown() {
      this.scale.off('resize', this.handleResize, this)
      this.fruitSprites.forEach((sprite) => {
        if (sprite && sprite.active) sprite.destroy()
      })
      this.fruitSprites.clear()
      sceneInstance.value = null
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: phaserContainer.value,
    width: phaserContainer.value.clientWidth,
    height: phaserContainer.value.clientHeight,
    transparent: true,
    scene: [GameScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
    input: {
      mouse: { target: phaserContainer.value },
      touch: { target: phaserContainer.value },
    },
  }
  gameInstance.value = new Phaser.Game(config)
  gameInstance.value.events.on('ready', () => { isLaunching = false })
}

onMounted(async () => {
  await nextTick()
  if (phaserContainer.value) {
    launchPhaser()
  }
})

onUnmounted(() => {
  if (gameInstance.value) {
    gameInstance.value.destroy(true, false)
    gameInstance.value = null
  }
  isLaunching = false
})
</script>

<template>
  <div id="phaser-game-container" ref="phaserContainer" class="w-full h-full pointer-events-auto" />
</template>
