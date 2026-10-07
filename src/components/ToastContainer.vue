<script setup>
import { computed } from 'vue'
import { toastService } from '@/core/services/ToastService.js'

// Servisteki reaktif toast state'ini alıyoruz
const toast = toastService.toast

// Toast tipine göre renk belirleme
const toastColor = computed(() => {
  switch (toast.value.type) {
    case 'success': return '#4ade80' // green-400
    case 'error': return '#f87171' // red-400
    case 'warning': return '#facc15' // yellow-400
    case 'info':
    default: return '#ffffff' // white
  }
})

// Konteyner class'larını dinamik olarak ayarla
const containerClasses = computed(() => [
  'fixed',
  'inset-0',
  'z-[9999]',
  'flex',
  'p-4',
  'pointer-events-none',
  'transition-opacity',
  'duration-300',
  toast.value.isVisible ? 'opacity-100' : 'opacity-0',
  'items-center',
  'justify-center',
])
</script>

<template>
  <div :class="containerClasses">
    <transition name="toast-transition">
      <div v-if="toast.isVisible" class="toast-item">
        <p
          class="toast-message titre"
          :style="{ color: toastColor }"
        >
          {{ toast.message }}
        </p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.toast-item {
  /* Arkaplanı tamamen şeffaf yap */
  background: transparent;
  max-width: 90%;
  pointer-events: auto;
}

.toast-message {
  font-size: 1.4rem; /* 28px */
  font-weight: 700;
  text-align: center;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1;
}

/* Animasyonlar */
.toast-transition-enter-active {
  animation: toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* a little bounce in */
}
.toast-transition-leave-active {
  animation: toast-out 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045); /* a little bounce out */
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.5);
  }
}
</style>
