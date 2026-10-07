<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const tips = [
  t('tips.tip1'),
  t('tips.tip2'),
  t('tips.tip3'),
  t('tips.tip4'),
  t('tips.tip5'),
  t('tips.tip6'),
  t('tips.tip7'),
]

const randomTip = ref('')

onMounted(() => {
  const index = Math.floor(Math.random() * tips.length)
  randomTip.value = tips[index]
})
</script>

<template>
  <div class="w-full h-screen bg-marble-background bg-cover bg-center overflow-hidden flex flex-col items-center justify-between pb-[100px]">
    <!-- Logo -->
    <div class="flex justify-center items-center pt-16 sm:pt-20">
      <img
        src="/assets/images/logos/fruit_orders_text_logo.png"
        alt="Logo"
        class="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-lg"
        loading="eager"
        decoding="async"
      >
    </div>

    <!-- Tip + Loading -->
    <div class="flex flex-col items-center gap-6 w-full px-10">
      <!-- Rastgele Tip -->
      <div class="bg-black/50 rounded-2xl p-6 w-full max-w-md">
        <div class="flex items-center gap-3">
          <img src="/assets/icons/announcement.png" alt="Tip" class="w-8 h-8 sm:w-10 sm:h-10">
          <p class="text-white text-md leading-snug">
            {{ randomTip }}
          </p>
        </div>
      </div>

      <!-- Yükleniyor Metni -->
      <div>
        <div class="titre text-xl sm:text-2xl font-bold text-white tracking-wider drop-shadow">
          {{ $t('loading') }}
        </div>
      </div>
    </div>
  </div>
</template>
