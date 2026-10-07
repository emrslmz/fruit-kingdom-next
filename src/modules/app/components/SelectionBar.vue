<script setup>
import { computed } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  selectionBox: Array,
})

// Bu computed property, her zaman 7 elemanlı bir dizi döndürür.
// Dizi, meyve nesneleri veya boş slotlar için yer tutucu nesneler içerir.
const displayItems = computed(() => {
  const items = []
  const fruits = props.selectionBox.filter(Boolean)
  for (let i = 0; i < 7; i++) {
    items.push(fruits[i] || { isEmpty: true, uniqueId: `empty-${i}` })
  }
  return items
})

// Item'lar kaldırıldığında çalışacak animasyon
function onLeaveAnimation(el, done) {
  const tl = gsap.timeline({ onComplete: done })
  tl.to(el, {
    scale: 1.2, // Önce hafifçe büyüt
    duration: 0.15,
    ease: 'power1.out',
  }).to(el, {
    scale: 0, // Sonra küçülterek yok et
    opacity: 0,
    duration: 0.2,
    ease: 'power1.in',
  })
}
</script>

<template>
  <div class="flex justify-center">
    <div class="flex min-h-[56px] justify-center items-center gap-1 sm:gap-1.5 p-1.5 bg-black/30 rounded-2xl border-2 border-white/20 shadow-lg">
      <transition-group
        tag="div"
        name="selection-item"
        class="flex items-center gap-1 sm:gap-1.5"
        @leave="onLeaveAnimation"
      >
        <div
          v-for="item in displayItems"
          :key="item.uniqueId"
          class="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 transition-all duration-200"
        >
          <!-- Boş Slot -->
          <div v-if="item.isEmpty" class="w-full h-full bg-black/20 rounded-lg" />
          <!-- Meyve Item'ı -->
          <div v-else class="relative w-full h-full animate-pop-in">
            <img src="/assets/blocks/bisquit_free.png" class="w-full h-full drop-shadow-md">
            <img :src="item.imgPath" class="absolute inset-0 w-full h-full object-contain p-1.5 drop-shadow-lg">
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
/* Hareket ve giriş animasyonları */
.selection-item-move,
.selection-item-enter-active,
.selection-item-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0, 0.1, 1);
}

.selection-item-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

/* GSAP ayrılma animasyonu sırasında elemanın yer kaplamasını engeller */
.selection-item-leave-active {
  position: absolute;
  opacity: 0; /* Anında gizle, GSAP gerisini halleder */
}

@keyframes pop-in {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-pop-in {
  animation: pop-in 0.2s ease-out forwards;
}
</style>
