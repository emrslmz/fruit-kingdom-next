<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useGameStore } from '@/store/gameStore.js'
import { usePlayerStore } from '@/store/playerStore.js'
import confetti from 'canvas-confetti'
import Clouds from '@/components/Clouds.vue'
import { useCoreStore } from '@/store/coreStore.js'
import { soundService } from '@/core/services/soundService.js'
import { alertService } from '@/core/services/alertService.js'
import { useI18n } from 'vue-i18n'
import { toastService } from '@/core/services/ToastService'

import TheGameHeader from '@/modules/app/components/TheGameHeader.vue'
import TheGameFooter from '@/modules/app/components/TheGameFooter.vue'
import LevelEndModal from '@/modules/app/components/LevelEndModal.vue'
import PhaserGame from '@/modules/app/components/PhaserGame.vue'
import GameLoading from '@/modules/app/components/GameLoading.vue'

const gameStore = useGameStore()
const playerStore = usePlayerStore()
const coreStore = useCoreStore()
const { t } = useI18n()

const isLoading = ref(true)
const isModalVisible = ref(false)
const modalMode = ref('win')
const levelKey = ref(0)
const collectedFruitsForModal = ref({})
const continueOffered = ref(false)
const isGrayscale = ref(false)
const gameOverSequenceTriggered = ref(false)

const canRenderGame = computed(() => !isLoading.value)

function handleFruitClick(payload) {
  soundService.playEffect('log_effect')
  gameStore.addFruitToSelectionBox(payload.uniqueId, payload.colIndex)
}

async function startNewLevel(levelId) {
  isModalVisible.value = false
  continueOffered.value = false
  gameOverSequenceTriggered.value = false
  gameStore.resetGameState()
  await nextTick()
  gameStore.setupLevel(levelId)
  levelKey.value++
}

async function startNextLevel() {
  isModalVisible.value = false
  isLoading.value = true
  setTimeout(async () => {
    await startNewLevel(playerStore.profile.gameLevel)
    isLoading.value = false
  }, 1200)
}

async function retryLevel() {
  soundService.playEffect('success_effect')
  isModalVisible.value = false
  isLoading.value = true
  setTimeout(async () => {
    await startNewLevel(gameStore.currentLevel)
    isLoading.value = false
  }, 1200)
}

function acceptContinue() {
  if (playerStore.spendCurrency('diamonds', 50)) {
    isModalVisible.value = false
    gameStore.revivePlayer()
    gameOverSequenceTriggered.value = false
    toastService.show(t('continue_successful'), 'success')
  }
  else {
    toastService.show(t('not_enough_diamonds'), 'error')
    declineContinue()
  }
}

function declineContinue() {
  isModalVisible.value = false
  setTimeout(() => {
    modalMode.value = 'lose'
    isModalVisible.value = true
  }, 300)
}

async function confirmExitGame() {
  const confirmed = await alertService.show({
    title: t('exit_game'),
    message: t('exit_game_message'),
    confirmButtonText: t('yes_exit'),
    cancelButtonText: t('no'),
  })
  if (confirmed) {
    coreStore.goTo('MainMenu')
  }
}

function goToMenu() {
  isModalVisible.value = false
  coreStore.goTo('MainMenu')
}

onMounted(async () => {
  await playerStore.loadFromStorage()
  setTimeout(() => {
    isLoading.value = false
    gameStore.resetGameState()
    gameStore.setupLevel(playerStore.profile.gameLevel)
    soundService.playEffect('start_effect')
  }, 1500)
})

watch(() => gameStore.isGameOver, (isOver) => {
  if (isOver && !gameOverSequenceTriggered.value) {
    gameOverSequenceTriggered.value = true

    if (gameStore.levelComplete) {
      collectedFruitsForModal.value = { ...gameStore.collectedFruitsThisLevel }
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 9999 })
      setTimeout(() => {
        soundService.playEffect('levelup_effect')
        modalMode.value = 'win'
        isModalVisible.value = true
      }, 1000)
    }
    else {
      isGrayscale.value = true
      toastService.show(t('game_over'), 'error', 2500)
      soundService.playEffect('error_effect')

      setTimeout(() => {
        isGrayscale.value = false
        if (!continueOffered.value) {
          modalMode.value = 'continue'
          isModalVisible.value = true
          continueOffered.value = true
        }
        else {
          modalMode.value = 'lose'
          isModalVisible.value = true
        }
      }, 3000)
    }
  }
})
</script>

<template>
  <GameLoading v-if="isLoading" />

  <div
    v-else
    class="w-full h-screen bg-marble-background bg-cover bg-center overflow-hidden flex flex-col relative transition-all duration-500"
    :class="{ grayscale: isGrayscale }"
  >
    <!-- --- DEĞİŞİKLİK: Header artık her zaman görünür --- -->
    <div class="absolute top-20 z-[100] w-full pointer-events-none">
      <div class="pointer-events-auto max-w-2xl mx-auto">
        <TheGameHeader @open-settings="confirmExitGame" />
      </div>
    </div>

    <main class="flex-grow w-full relative -mt-16">
      <div class="w-full h-full relative z-[10] pointer-events-auto">
        <PhaserGame
          v-if="canRenderGame"
          :key="levelKey"
          :columns="gameStore.columns"
          @fruit-clicked="handleFruitClick"
        />
      </div>
      <div class="absolute inset-0 z-[1] pointer-events-none">
        <Clouds position="top-24 scale-[1.6] left-20 w-full" />
      </div>
    </main>

    <!-- --- DEĞİŞİKLİK: Footer artık her zaman görünür --- -->
    <TheGameFooter
      :selection-box="gameStore.selectionBox"
    />

    <LevelEndModal
      :show="isModalVisible"
      :mode="modalMode"
      :level="gameStore.currentLevel"
      :player-diamonds="playerStore.currencies.diamonds"
      :collected-fruits="collectedFruitsForModal"
      @next-level="startNextLevel"
      @retry-level="retryLevel"
      @main-menu="goToMenu"
      @accept-continue="acceptContinue"
      @decline-continue="declineContinue"
    />
  </div>
</template>

<style scoped>
.grayscale {
  filter: grayscale(100%);
}
</style>
