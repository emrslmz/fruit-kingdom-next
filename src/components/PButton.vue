<script setup lang="ts">
import { soundService } from '@/core/services/SoundService'
import vibrationService from '@/core/services/VibrationService'
import { ref } from 'vue'

// Props tanımları
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value: string) => [
      'none',
      'primary',
      'secondary',
      'danger',
      'success',
      'warning',
    ].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
  rounded: {
    type: Boolean,
    default: true,
  },
  icon: {
    type: String,
    default: '',
  },
  iconColor: {
    type: String,
    default: 'white',
  },
  img: {
    type: String,
    default: '',
  },
  rotate: {
    type: String,
    default: '',
  },
  customClass: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['click'])

// Animasyon sınıfı
const animateClass = ref('')

// Variant sınıfları
const variantClasses = {
  primary:
      'bg-blue-500 border border-blue-400 [box-shadow:0_8px_0_0_#1b6ff8,0_13px_0_0_#1b70f841] active:[box-shadow:0_0px_0_0_#1b6ff8,0_0px_0_0_#1b70f841]',
  secondary:
      'bg-gray-500 border border-gray-400 [box-shadow:0_8px_0_0_#4b5563,0_13px_0_0_#4b556341] active:[box-shadow:0_0px_0_0_#4b5563,0_0px_0_0_#4b556341]',
  danger:
      'bg-red-500 border border-red-400 [box-shadow:0_6px_0_0_#b91c1c,0_10px_0_0_#b91c1c80] active:[box-shadow:0_0px_0_0_#b91c1c,0_0px_0_0_#b91c1c80]',
  success:
      'bg-green-500 border border-green-700 [box-shadow:0_6px_0_0_#15803d,0_10px_0_0_#15803d40] active:[box-shadow:0_0px_0_0_#15803d,0_0px_0_0_#15803d40]',
  warning:
      'bg-yellow-500 border border-yellow-700 [box-shadow:0_6px_0_0_#f59e0b,0_10px_0_0_#f59e0b40] active:[box-shadow:0_0px_0_0_#f59e0b,0_0px_0_0_#f59e0b40]',
}

// Boyut sınıfları
const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
}

// İkon sınıfları
const iconClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
}

// Tıklama işleyicisi
async function handleClick(event: Event) {
  emits('click', event)
  soundService.playEffect('put_effect')
  vibrationService.vibrate('click')
  animateClass.value = 'animate__animated animate__rubberBand'
  setTimeout(() => {
    animateClass.value = ''
  }, 900)
}

// Touch event handlers
function handleTouchStart() {
  animateClass.value = 'active:translate-y-2'
}

function handleTouchEnd() {
  setTimeout(() => {
    animateClass.value = ''
  }, 100)
}
</script>

<template>
  <button
    class="relative button cursor-pointer select-none active:translate-y-2 active:border-b-[0px] transition-all duration-50 flex justify-center items-center px-2"
    :class="[
      variantClasses[variant],
      sizeClasses[size],
      animateClass,
      rounded && 'rounded-full',
    ]"
    @click="handleClick"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <img
      v-if="img"
      :src="img"
      alt="Icon"
      class="w-auto h-auto"
      :class="[rotate, customClass]"
    >
    <i
      v-if="icon"
      :class="[icon, iconClasses[size], rotate]"
      :style="{ color: iconColor }"
    />
    <slot v-else />
  </button>
</template>
