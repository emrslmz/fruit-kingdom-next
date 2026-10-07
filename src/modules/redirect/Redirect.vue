<script setup>
import { onMounted } from 'vue'
// vue-router'a bu sayfada gerek kalmıyor, çünkü window.location.href kullanıyoruz.
// import { useRouter } from 'vue-router'

// const router = useRouter() // Web içi yönlendirme yapmayacağımız için buna gerek yok.

/**
 * Tarayıcının User-Agent bilgisini kullanarak mobil işletim sistemini tespit eder.
 * @returns {'ios' | 'android' | 'other'}
 */
function getMobileOperatingSystem() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera

  // iOS tespiti (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios'
  }

  // Android tespiti
  if (/android/i.test(userAgent)) {
    return 'android'
  }

  // Diğer durumlar (Windows Phone, web vb.)
  return 'other'
}

async function redirectToPlatformSpecificPage() {
  try {
    const platform = getMobileOperatingSystem()
    console.log('Tespit edilen platform:', platform)

    if (platform === 'android') {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.goalguessr.app'
    }
    else if (platform === 'ios') {
      window.location.href = 'https://apps.apple.com/us/app/goalguessr-football-quiz/id6745755558'
    }
    else {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.goalguessr.app'
    }
  }
  catch (error) {
    console.error('Yönlendirme sırasında bir hata oluştu:', error)
    // Hata durumunda bir hata sayfasına yönlendirebilirsiniz
    // router.replace({ name: 'errorPage' });
  }
}

// Component (sayfa) yüklendiği anda yönlendirme fonksiyonunu çağır
onMounted(() => {
  redirectToPlatformSpecificPage()
})
</script>

<template>
  <div class="redirect-container" @click="redirectToPlatformSpecificPage()">
    <div class="content-card">
      <img src="/assets/images/logos/fruit_kingdom_text_logo.png" alt="Logo" class="h-48 w-48 ">
      <img src="/assets/icons/arrow_down.png" alt="Logo" class="h-64 w-64 -my-10 -mt-16">

      <div class="spinner" />
    </div>
  </div>
</template>

<style scoped>
.redirect-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f3f4f6; /* Hafif gri bir arka plan */
    padding: 1rem;
  }

  .content-card {
    text-align: center;
    max-width: 400px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Spinner Animasyonu */
  .spinner {
    width: 48px;
    height: 48px;
    border: 5px solid #e5e7eb; /* Spinner'ın halkası */
    border-bottom-color: #4f46e5; /* Spinner'ın dönen kısmı için marka rengi */
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
    margin-top: 1.5rem; /* Üstündeki elemanla arasına boşluk koy */
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
