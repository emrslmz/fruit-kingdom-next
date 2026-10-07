<script setup>
import { computed } from 'vue'
import { resolveIcon } from '@/core/config/icons'
import { usePlayerStore } from '@/store/playerStore'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
})

const playerStore = usePlayerStore()

const icon = computed(() => resolveIcon(playerStore.settings.theme, props.name))
const isImage = computed(() => typeof icon.value === 'string' && icon.value.startsWith('/'))
</script>

<template>
  <img v-if="isImage" :src="icon" :alt="alt || name" class="w-full h-full object-contain drop-shadow">
  <span v-else class="w-full h-full flex items-center justify-center leading-none">{{ icon }}</span>
</template>
