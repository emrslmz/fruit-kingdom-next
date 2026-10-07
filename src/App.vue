<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { languageService } from '@/core/services/LanguageService'
import notificationService from '@/core/services/notificationService'
import { soundService } from '@/core/services/soundService'
import { createGame } from '@/game'
import { usePlayerStore } from '@/store/playerStore.js'

// Tüm arayüz Phaser tarafından çiziliyor (bkz. src/game). Vue sadece
// store/i18n/servisleri başlatan ince bir kabuk.

const playerStore = usePlayerStore()
const host = ref(null)
let instance = null

async function initialize() {
  try {
    await playerStore.loadFromStorage()
    await languageService.initializeWithPlayerStore(playerStore)
    notificationService.requestInitialPermission()
  }
  catch (error) {
    console.error('Uygulama başlatılırken bir hata oluştu:', error)
  }
}

function unlockAudio() {
  soundService.handleFirstUserInteraction()
  soundService.startInitialMusic()
  document.removeEventListener('pointerdown', unlockAudio)
  document.removeEventListener('keydown', unlockAudio)
}

onMounted(() => {
  document.addEventListener('pointerdown', unlockAudio)
  document.addEventListener('keydown', unlockAudio)
  soundService.setupAppLifecycleListeners()
  const appReady = initialize().then(() => soundService.startInitialMusic())
  instance = createGame(host.value, { appReady })
})

onBeforeUnmount(() => {
  instance?.destroy()
  document.removeEventListener('pointerdown', unlockAudio)
  document.removeEventListener('keydown', unlockAudio)
})
</script>

<template>
  <div ref="host" class="game-host" />
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1d1006;
  overscroll-behavior: none;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.game-host {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.game-host canvas {
  display: block;
  touch-action: none;
}
</style>
