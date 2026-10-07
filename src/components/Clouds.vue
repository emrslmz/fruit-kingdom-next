<script setup>
defineProps({
  position: {
    type: String,
    default: 'top-4 left-0 right-0',
  },
})
</script>

<template>
  <div class="absolute h-64 pointer-events-none overflow-hidden" :class="position">
    <svg width="0" height="0" class="absolute">
      <defs>
        <radialGradient id="denseCloudGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style="stop-color:rgb(230,230,230);stop-opacity:0.98" />
          <stop offset="50%" style="stop-color:rgb(200,200,200);stop-opacity:0.75" />
          <stop offset="100%" style="stop-color:rgb(180,180,180);stop-opacity:0" />
        </radialGradient>
        <radialGradient id="lightCloudGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style="stop-color:rgb(230,230,230);stop-opacity:0.7" />
          <stop offset="50%" style="stop-color:rgb(200,200,200);stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:rgb(180,180,180);stop-opacity:0" />
        </radialGradient>
        <filter id="denseCloudBlur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.95 0" />
        </filter>
        <filter id="lightCloudBlur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0" />
        </filter>
      </defs>
    </svg>

    <div class="absolute w-full h-[90%] top-0" style="animation: floatLeft 20s linear infinite;">
      <svg viewBox="0 0 800 128" class="w-[140%] h-full">
        <ellipse cx="80" cy="60" rx="80" ry="50" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="200" cy="40" rx="90" ry="55" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="340" cy="70" rx="75" ry="45" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="480" cy="50" rx="85" ry="50" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="640" cy="65" rx="80" ry="50" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
      </svg>
    </div>

    <!-- Katman 2: Üst-orta kısımda yoğun sis-bulut -->
    <div class="absolute w-full h-[60%] top-[10%]" style="animation: floatRight 25s linear infinite; opacity: 0.95;">
      <svg viewBox="0 0 800 128" class="w-[140%] h-full">
        <ellipse cx="100" cy="70" rx="75" ry="45" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="240" cy="50" rx="85" ry="50" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="400" cy="80" rx="70" ry="40" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="560" cy="60" rx="80" ry="50" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
      </svg>
    </div>

    <!-- Katman 3: Orta-alt kısımda daha hafif sis-bulut -->
    <div class="absolute w-full h-[70%] top-[20%]" style="animation: floatLeft 30s linear infinite; opacity: 0.75;">
      <svg viewBox="0 0 800 128" class="w-[140%] h-full">
        <ellipse cx="120" cy="80" rx="70" ry="40" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
        <ellipse cx="280" cy="60" rx="80" ry="45" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
        <ellipse cx="460" cy="85" rx="75" ry="40" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
        <ellipse cx="620" cy="70" rx="80" ry="45" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
      </svg>
    </div>

    <!-- Katman 4: Alt kısımda en hafif sis-bulut -->
    <div class="absolute w-full h-[80%] top-[30%]" style="animation: floatRight 35s linear infinite; opacity: 0.5;">
      <svg viewBox="0 0 800 128" class="w-[140%] h-full">
        <ellipse cx="150" cy="90" rx="65" ry="35" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
        <ellipse cx="300" cy="70" rx="75" ry="40" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
        <ellipse cx="500" cy="80" rx="70" ry="35" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
        <ellipse cx="680" cy="85" rx="75" ry="40" fill="url(#lightCloudGradient)" filter="url(#lightCloudBlur)" />
      </svg>
    </div>

    <!-- Ön planda küçük, yoğun bulut kümeleri (üstte) -->
    <div class="gentle-bob absolute -top-5 -left-12 w-80" style="animation-duration: 7s;">
      <svg viewBox="0 0 200 100">
        <ellipse cx="60" cy="50" rx="55" ry="35" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="100" cy="40" rx="65" ry="40" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="140" cy="60" rx="50" ry="30" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
      </svg>
    </div>
    <div class="gentle-bob absolute -top-8 -right-12 w-88 -scale-x-100" style="animation-duration: 6.5s;">
      <svg viewBox="0 0 200 100">
        <ellipse cx="50" cy="60" rx="45" ry="30" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="90" cy="40" rx="65" ry="40" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
        <ellipse cx="150" cy="50" rx="55" ry="35" fill="url(#denseCloudGradient)" filter="url(#denseCloudBlur)" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
@keyframes floatLeft {
    0% { transform: translateX(0); }
    100% { transform: translateX(-20%); }
  }
  @keyframes floatRight {
    0% { transform: translateX(0); }
    100% { transform: translateX(20%); }
  }
  @keyframes gentleBob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(10px); }
  }
</style>
