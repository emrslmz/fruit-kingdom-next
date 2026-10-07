<script setup>
import { useI18n } from 'vue-i18n'
import ColorCard from '@/components/ColorCard.vue'

defineProps({
  level: {
    type: [Number, String],
    required: true,
  },
})

const { t } = useI18n()

// Diğer para birimi rozetlerinden ayrışsın diye ahşap/kahverengi ton — bkz. CLAUDE.md.
const LEVEL_COLOR = { bg: '#c68642', border: '#8b5a2b', shadow: '#6b4423' }
</script>

<template>
  <ColorCard
    as="div"
    :color="LEVEL_COLOR"
    :radius="999"
    :border-width="3"
    :depth="false"
    class="level-badge relative inline-flex items-center gap-1.5 phone-xl:gap-2 md:gap-2.5 pl-3 phone-xl:pl-4 md:pl-5 pr-4 phone-xl:pr-5 md:pr-6 lg:pr-7 py-1.5 phone-xl:py-2"
  >
    <span class="titre text-white text-[10px] phone-lg:text-xs phone-xl:text-sm md:text-base uppercase tracking-wide leading-none whitespace-nowrap drop-shadow">{{ t('level') }}</span>
    <span class="titre text-white text-base phone-lg:text-lg phone-xl:text-xl md:text-2xl lg:text-3xl leading-none whitespace-nowrap drop-shadow">{{ level }}</span>
  </ColorCard>
</template>
