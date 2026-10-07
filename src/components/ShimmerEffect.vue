<script setup>
import { computed } from 'vue'

// Animasyon gecikmesini bir 'prop' olarak alıyoruz.
// Bu sayede her kullanımda farklı bir gecikme atayabiliriz.
const props = defineProps({
  delay: {
    type: String,
    default: '0s', // Varsayılan gecikme 0 saniye
  },
})

// Prop'tan gelen gecikmeyi stil nesnesine dönüştürüyoruz.
const animationStyle = computed(() => ({
  animationDelay: props.delay,
}))
</script>

<template>
  <div class="shimmer-wrapper">
    <div class="shimmer-light" :style="animationStyle" />
  </div>
</template>

<style scoped>
.shimmer-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* Üzerine konulduğu elementin köşe yuvarlaklığını miras alır. */
  border-radius: inherit;
  overflow: hidden;
  /* İçeriğin arkasında kalmasını sağlar. */
  z-index: 0;
  /* Dokunma/tıklama olaylarını engeller, arkadaki elemente iletir. */
  pointer-events: none;
}

.shimmer-light {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: translateX(-150%);
  /* Animasyon süresi 4 saniye ve sonsuz döngüde */
  animation: shimmer 4s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-150%) skewX(-30deg);
  }
  100% {
    transform: translateX(250%) skewX(-30deg);
  }
}
</style>
