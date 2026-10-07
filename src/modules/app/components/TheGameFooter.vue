<script setup>
import { onMounted, onUnmounted } from 'vue'
import SelectionBar from './SelectionBar.vue'
import PowerUp from './PowerUp.vue'
import { usePlayerStore } from '@/store/playerStore'
import { admobService } from '@/core/services/admobService'

const playerStore = usePlayerStore()

// --- DEĞİŞİKLİK: isLost prop'u kaldırıldı ---
defineProps({
  selectionBox: Array,
})

onMounted(async () => {
  if (!playerStore.settings.adsRemoved) {
    await admobService.showBannerAd()
  }
})

onUnmounted(async () => {
  if (!playerStore.settings.adsRemoved) {
    await admobService.hideBannerAd()
  }
})
</script>

<template>
  <footer class="w-full flex flex-col items-center gap-y-2 z-30 pb-2 pointer-events-none">
    <div class="w-full max-w-lg mx-auto flex flex-col justify-center items-center gap-2 sm:gap-4 px-2 pointer-events-auto">
      <SelectionBar :selection-box="selectionBox" class="flex-grow" />

      <!-- --- DEĞİŞİKLİK: Power-up'lar artık her zaman görünür --- -->
      <div class="w-full flex justify-center items-center gap-x-5 px-2">
        <div class="flex-shrink-0">
          <PowerUp power-up-id="dynamite" />
        </div>
        <div class="flex-shrink-0">
          <PowerUp power-up-id="brush" />
        </div>
        <div class="flex-shrink-0">
          <PowerUp power-up-id="tornado" />
        </div>
      </div>
    </div>

    <div v-if="!playerStore.settings.adsRemoved" class="w-full h-[120px]" />
    <div v-else class="w-full h-[120px]" />
  </footer>
</template>
