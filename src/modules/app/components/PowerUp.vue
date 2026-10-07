<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '@/store/playerStore'
import { useShopStore } from '@/store/shopStore'
import { useGameStore } from '@/store/gameStore'
import { toastService } from '@/core/services/ToastService'
import { useI18n } from 'vue-i18n'
import ShimmerEffect from '@/components/ShimmerEffect.vue'

// Component artık tek bir power-up'ı yönetmek için 'powerUpId' prop'u alıyor.
const props = defineProps({
  powerUpId: {
    type: String,
    required: true,
  },
})

const playerStore = usePlayerStore()
const shopStore = useShopStore()
const gameStore = useGameStore()
const { t } = useI18n()

// Gelen ID'ye göre tek bir power-up'ın verisini hesapla.
const powerUp = computed(() => {
  const shopPowerUp = shopStore.powerUps.find(p => p.id === props.powerUpId)
  if (!shopPowerUp) return null

  const playerPowerUp = playerStore.inventory.powerUps.find(p => p.id === props.powerUpId)
  return {
    ...shopPowerUp,
    quantity: playerPowerUp ? playerPowerUp.quantity : 0,
  }
})

// DÜZENLENDİ: Eksik servis yerine doğrudan store'daki actions çağrılıyor.
function handlePowerUpClick() {
  if (!powerUp.value) return
  if (gameStore.isGameOver || gameStore.isPowerUpAnimating) return

  if (powerUp.value.quantity > 0) {
    // Önce envanterden kullanmayı dene
    if (playerStore.usePowerUp(powerUp.value.id)) {
      // Başarılı olursa oyun mantığını tetikle
      switch (powerUp.value.id) {
        case 'brush':
          gameStore.useBrushPowerUp()
          break
        case 'tornado':
          gameStore.useTornadoPowerUp()
          break
        case 'dynamite':
          gameStore.useDynamitePowerUp()
          break
        default:
          console.warn(`'${powerUp.value.id}' için güçlendirme mantığı bulunamadı.`)
      }
    }
  }
  else {
    toastService.show(t('powerup_not_found'), 'error', 1500)
  }
}
</script>

<template>
  <!-- Template kısmı aynı kalıyor -->
  <div v-if="powerUp" class="flex-shrink-0">
    <button
      class="relative w-16 h-16 bg-gradient-to-b from-orange-500/40 to-orange-800/40 rounded-full shadow-lg border-b-4 border-orange-900 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      :disabled="powerUp.quantity === 0 || gameStore.isGameOver"
      @mousedown.stop="handlePowerUpClick"
    >
      <ShimmerEffect />
      <img :src="powerUp.img" :alt="powerUp.name" class="w-12 h-12 object-contain  scale-150">

      <div class="absolute top-0 -right-2 bg-red-500 text-white text-md titre font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-md">
        {{ powerUp.quantity }}
      </div>
    </button>
  </div>
</template>
