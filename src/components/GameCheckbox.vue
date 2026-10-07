<script setup>
import { defineProps, defineEmits } from 'vue';
import { soundService } from '@/core/services/SoundService';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

function toggle() {
  soundService.playEffect("click_effect");
  const newValue = !props.modelValue;
  emit('update:modelValue', newValue);
  emit('change', newValue);
}
</script>

<template>
  <button 
    class="relative w-10 h-10 rounded-xl border-[3px] border-[#3b230d] flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-90 shadow-md"
    :class="modelValue ? 'bg-[#fceec9] checkbox-active' : 'bg-[#e4ce9c] checkbox-inactive'"
    @click="toggle"
  >
    <svg 
      class="w-7 h-7 transition-all duration-300"
      :class="modelValue ? 'opacity-100 scale-100 text-[#4cd964]' : 'opacity-0 scale-50 text-[#a3a3a3]'"
      fill="none" 
      stroke="currentColor" 
      stroke-width="4" 
      viewBox="0 0 24 24" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      style="filter: drop-shadow(0px 2px 1px rgba(0,0,0,0.2));"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  </button>
</template>

<style scoped>
.checkbox-active {
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 2px 0 #78350f;
}

.checkbox-inactive {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 0 #78350f;
  filter: brightness(0.9);
}
</style>
