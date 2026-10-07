<script setup>
import { onMounted, ref, nextTick } from 'vue'
import { languageService } from '@/core/services/LanguageService'
import { usePlayerStore } from '@/store/playerStore.js'
import { soundService } from '@/core/services/SoundService'
import notificationService from '@/core/services/NotificationService'

const playerStore = usePlayerStore()

// --- Component State ---
const isAnimationComplete = ref(false)
const isLoading = ref(true)

// --- Template Refs ---
const loadingScreenRef = ref(null)
const contentContainerRef = ref(null)

/**
 * CSS transition kullanarak performanslı geçiş animasyonu
 */
function startTransition() {
  if (!loadingScreenRef.value || !contentContainerRef.value) return

  // CSS transition ile fade out
  loadingScreenRef.value.style.opacity = '0'
  contentContainerRef.value.style.opacity = '1'

  // Transition tamamlandıktan sonra state güncelle
  setTimeout(() => {
    isAnimationComplete.value = true

    // İlk müzik çalma işlemini başlat
    soundService.startInitialMusic()
  }, 100) // CSS transition süresi
}

/**
 * Uygulama için gerekli tüm verileri ve servisleri başlatan ana fonksiyon.
 */
async function initialize() {
  try {
    await languageService.initializeWithPlayerStore(playerStore)

    // İlk açılış notification izni iste
    await notificationService.requestInitialPermission()

    // Minimum loading süresi (UX için)
    await new Promise(resolve => setTimeout(resolve, 1500))

    isLoading.value = false

    // DOM güncellemesini bekle
    await nextTick()

    startTransition()
  }
  catch (error) {
    console.error('Uygulama başlatılırken bir hata oluştu:', error)
    isLoading.value = false
    startTransition()
  }
}

/**
 * Performanslı audio unlock
 */
function unlockAudio() {
  soundService.handleFirstUserInteraction()
  // Event listener'ları kaldır
  document.removeEventListener('click', unlockAudio, { once: true })
  document.removeEventListener('touchstart', unlockAudio, { once: true })
}

onMounted(async () => {
  // Audio unlock için event listener (once: true ile performans artırımı)
  document.addEventListener('click', unlockAudio, { once: true })
  document.addEventListener('touchstart', unlockAudio, { once: true })

  // App lifecycle listeners'ı kur
  soundService.setupAppLifecycleListeners()

  // İlk state ayarları
  if (contentContainerRef.value) {
    contentContainerRef.value.style.opacity = '0'
  }

  // Yükleme işlemini başlat
  initialize()
})
</script>

<template>
  <div class="w-full h-screen relative overflow-hidden bg-gray-900">
    <!-- Yükleme Ekranı -->
    <div
      v-if="!isAnimationComplete"
      ref="loadingScreenRef"
      class="absolute inset-0 z-50 flex flex-col justify-between items-center bg-cover bg-center bg-leaf-background transition-opacity duration-700 ease-out pb-[100px]"
    >
      <!-- Logo - En üstte -->
      <div class="flex justify-center items-center pt-16 sm:pt-20">
        <img
          src="/assets/images/logos/fruit_orders_text_logo.png"
          alt="Logo"
          class="w-32 h-32 sm:w-40 sm:h-40 object-contain"
          loading="eager"
          decoding="async"
        >
      </div>

      <!-- Yükleniyor Metni - En altta -->
      <div class="">
        <div
          class="titre text-xl sm:text-2xl font-bold text-white tracking-wider"
          :class="isLoading ? 'animate-pulse' : ''"
        >
          {{ $t('loading') }}
        </div>
      </div>
    </div>

    <!-- Ana Uygulama İçeriği -->
    <div
      ref="contentContainerRef"
      class="relative w-full h-full z-20 transition-opacity duration-700 ease-out"
    >
      <router-view />
    </div>
  </div>
</template>

<style scoped>
/* Tailwind kullanıldığı için ek CSS'e gerek yok */
</style>
