<script setup>
import { ref, onMounted, computed } from 'vue'
import { useGameStore } from '@/store/gameStore.js'
import gsap from 'gsap'
import { soundService } from '@/core/services/soundService.js'
import vibrationService from '@/core/services/VibrationService'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const gameStore = useGameStore()
const headerRef = ref(null)
const emit = defineEmits(['open-settings'])

const remainingFruits = computed(() => gameStore.remainingFruitsByType)

onMounted(() => {
  if (headerRef.value) {
    gsap.from(headerRef.value, {
      duration: 0.6,
      y: -80,
      opacity: 0,
      ease: 'power2.out',
    })
  }
})

function leftButtonClick() {
  vibrationService.vibrate('click')
  soundService.playEffect('put_effect')
  emit('open-settings')
}
</script>

<template>
  <header ref="headerRef" class="w-full flex items-center justify-between px-3 max-w-2xl mx-auto gap-2">
    <!-- Sol Taraf: Seviye Göstergesi -->
    <div class="flex-shrink-0 flex flex-col items-center justify-center h-14 w-14 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
      <span class="text-xs font-bold tracking-wider uppercase text-gray-500">{{ t('level') }}</span>
      <span class="text-2xl font-bold text-gray-800 -mt-1">{{ gameStore.currentLevel }}</span>
    </div>

    <!-- Orta: Kalan Meyveler (Yatay Kaydırılabilir) -->
    <div class="flex-grow h-14 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
      <div class="w-full h-full flex items-center px-3 overflow-x-auto no-scrollbar">
        <div class="flex items-center gap-3">
          <transition-group name="fruit-list" tag="div" class="flex items-center gap-3">
            <div
              v-for="fruit in remainingFruits"
              :key="fruit.type"
              class="flex-shrink-0 flex items-center justify-center gap-1 bg-black/5 p-1 rounded-lg"
            >
              <img :src="fruit.imgPath" :alt="fruit.type" class="w-7 h-7 object-contain drop-shadow-lg">
              <span class="text-md font-bold text-slate-700 pr-1">{{ fruit.count }}</span>
            </div>
          </transition-group>
        </div>
      </div>
    </div>

    <!-- Sağ Taraf: Ayarlar Butonu -->
    <button
      class="flex-shrink-0 w-14 h-14 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform shadow-lg border border-white/60 hover:scale-105"
      @click="leftButtonClick"
    >
      <!-- GÜNCELLENDİ: Simge ve alt metin, yeniden deneme yerine çıkış işlevini yansıtacak şekilde geri değiştirildi -->
      <img src="/assets/icons/close.png" alt="Ayarlar" class="w-7 h-7 scale-[1.5]">
    </button>
  </header>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fruit-list-enter-active,
.fruit-list-leave-active {
  transition: all 0.4s ease;
}
.fruit-list-enter-from,
.fruit-list-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
.fruit-list-move {
    transition: transform 0.4s ease;
}
</style>
