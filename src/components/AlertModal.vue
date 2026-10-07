<script setup>
import { ref, watch, computed } from 'vue'
import gsap from 'gsap'
import { alertService } from '@/core/services/alertService'
import MainButton from '@/components/MainButton.vue'

const modalCard = ref(null)

const sizeClass = computed(() => {
  const size = alertService.alert.size
  switch (size) {
    case 'lg':
      return 'max-w-xl'
    case 'xl':
      return 'max-w-xl'
    case '2xl':
      return 'max-w-2xl'
    default:
      return 'max-w-md' // Varsayılan boyut
  }
})

// Mavi renk teması
const colorClasses = computed(() => {
  return {
    mainBg: 'bg-sky-600',
    border: 'border-sky-400/80',
    innerBorder: 'border-sky-200',
    textPrimary: 'text-sky-800',
  }
})

function handleCancel() {
  if (alertService.alert.onCancel && typeof alertService.alert.onCancel === 'function') {
    alertService.alert.onCancel()
  }
  else {
    alertService.hide()
  }
}

function handleConfirm() {
  if (alertService.alert.onConfirm && typeof alertService.alert.onConfirm === 'function') {
    alertService.alert.onConfirm()
  }
  else {
    alertService.hide() // Varsayılan onaylama eylemi
  }
}

// Modal göründüğünde animasyonu tetikle
watch(() => alertService.alert.isVisible, (isShown) => {
  if (isShown && modalCard.value) {
    gsap.fromTo(
      modalCard.value,
      { scale: 0.5, opacity: 0, y: 50 },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
      },
    )
  }
})
</script>

<template>
  <transition name="fade">
    <div v-if="alertService.alert.isVisible" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4" @click.self="handleCancel">
      <div ref="modalCard" class="relative w-full text-center"  @click.stop>
        <div
          :class="[colorClasses.mainBg, colorClasses.border]"
          class="relative rounded-t-[2.5rem] rounded-b-[3rem] sm:rounded-t-[5rem] sm:rounded-b-[6rem] p-2 sm:p-4 border-4 shadow-2xl"
        >
          <!-- Başlık -->
          <h2 v-if="alertService.alert.title" class="titre text-4xl sm:text-5xl font-black text-white z-20 pb-6 pt-4">
            {{ alertService.alert.title }}
          </h2>

          <!-- İçerik Kartı -->
          <div
            :class="colorClasses.innerBorder"
            class="bg-[#fdf6e3] rounded-t-[2.5rem] rounded-b-[3rem] sm:rounded-t-[5rem] sm:rounded-b-[6rem] border-4 shadow-inner min-h-[250px] flex flex-col items-center justify-center p-6"
          >
            <!-- Slot İçeriği -->
            <div v-if="alertService.alert.slotComponent" class="w-full">
              <component :is="alertService.alert.slotComponent" v-bind="alertService.alert.slotProps" />
            </div>

            <!-- Varsayılan İçerik (Resim, Mesaj) -->
            <div v-else class="flex flex-col items-center justify-center gap-4 px-4">
              <img v-if="alertService.alert.image" :src="alertService.alert.image" alt="Modal Resmi" class="w-24 h-24 sm:w-32 sm:h-32 scale-[1.5] object-contain mb-4">
              <p v-if="alertService.alert.message" :class="colorClasses.textPrimary" class="text-xl sm:text-2xl titre-light whitespace-pre-line">
                {{ alertService.alert.message }}
              </p>
            </div>
          </div>

          <!-- Butonlar -->
          <div v-if="alertService.alert.confirmButtonText || alertService.alert.cancelButtonText" class="w-full flex flex-col sm:flex-row justify-center items-center py-4 px-6 gap-4">
            <MainButton
              v-if="alertService.alert.cancelButtonText"
              variant="red"
              class="w-full sm:w-auto order-2 sm:order-1"
              :text="alertService.alert.cancelButtonText"
              @click="handleCancel"
            />

            <MainButton
              v-if="alertService.alert.confirmButtonText"
              variant="green"
              class="w-full sm:w-auto order-1 sm:order-2"
              :text="alertService.alert.confirmButtonText"
              @click="handleConfirm"
            />
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-bounce-animation {
  animation: scale-bounce 1.5s infinite ease-in-out;
}

@keyframes scale-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
</style>
