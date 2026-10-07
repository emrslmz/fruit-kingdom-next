<script setup>
import { computed } from 'vue'
import ThemedIcon from '@/components/ThemedIcon.vue'

const props = defineProps({
  // ThemedIcon'a iletilecek ikon anahtarı (bkz. core/config/icons.js)
  icon: {
    type: String,
    required: true,
  },
  amount: {
    type: [Number, String],
    required: true,
  },
  // Verilirse "amount/max" olarak gösterilir ve arka plan progress bar'a döner (örn. enerji).
  max: {
    type: [Number, String],
    default: undefined,
  },
})

const isProgress = computed(() => props.max !== undefined && props.max !== null)

const progressPercent = computed(() => {
  const max = Number(props.max)
  if (!max) return 0
  return Math.min(100, Math.max(0, (Number(props.amount) / max) * 100))
})
</script>

<template>
  <div
    class="currency-capsule relative inline-flex items-center h-8 phone-lg:h-9 phone-xl:h-10 shrink-0 select-none"
  >
    <!-- Koyu Kahverengi Pill (Hap) Şeklinde Sayı Alanı -->
    <div
      class="pill-bg relative flex items-center justify-end pl-7 phone-lg:pl-8 phone-xl:pl-9 pr-3 phone-xl:pr-4 h-full bg-[#4a2e1b] border-[2px] border-[#2b180a] rounded-full shadow-md min-w-[70px] phone-lg:min-w-[80px] phone-xl:min-w-[90px]"
    >
      <!-- Progress Bar (Enerji için varsa) -->
      <div
        v-if="isProgress"
        class="absolute inset-[2px] rounded-full overflow-hidden bg-[#2b180a]"
      >
        <div
          class="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300 ease-out"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>

      <!-- Sayı Metni -->
      <span
        class="currency-amount relative z-10 text-white font-black text-xs phone-lg:text-sm phone-xl:text-base leading-none tracking-wide"
      >
        {{ amount }}<template v-if="isProgress">/{{ max }}</template>
      </span>
    </div>

    <!-- Soldaki Büyük Taşma Yapan İkon (Görseldeki Birebir Stil) -->
    <div
      class="absolute -left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 phone-lg:w-9 phone-lg:h-9 phone-xl:w-10 phone-xl:h-10 flex items-center justify-center z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
    >
      <ThemedIcon
        :name="icon"
        class="w-full h-full object-contain scale-[1.25] phone-lg:scale-[1.3] phone-xl:scale-[1.35]"
      />
    </div>
  </div>
</template>

<style scoped>
.pill-bg {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
}

.currency-amount {
  font-family: "LuckiestGuy", sans-serif;
  color: #ffffff;
  text-shadow:
    -1px -1px 0 #1b0d04,
    1px -1px 0 #1b0d04,
    -1px 1px 0 #1b0d04,
    1px 1px 0 #1b0d04,
    0 2px 2px rgba(0, 0, 0, 0.6);
}
</style>
