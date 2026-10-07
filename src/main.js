import { mobileService } from '@/core/services/MobileService'
import { soundService } from '@/core/services/SoundService'
import router from '@/router'
import { IonicVue } from '@ionic/vue'

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'

// Ionic CSS Imports
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/typography.css'
import 'animate.css'

// Custom CSS Imports
import '@/assets/vendor/@fortawesome/fontawesome-free-6.5.2-web/css/all.css'
import '@/core/theme/variable.css'
import '@/index.css'
import './style.css'

import { usePlayerStore } from '@/store/playerStore.js'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

mobileService.boot(pinia)

const app = createApp(App)
  .use(IonicVue, { mode: 'ios', swipeBackEnabled: false })
  .use(router)
  .use(pinia)
  .use(i18n)

router.isReady().then(async () => {
  const playerStore = usePlayerStore()
  await playerStore.loadFromStorage()

  // PlayerStore'daki ayar değişikliklerini dinle ve SoundService'i bilgilendir
  playerStore.$subscribe((mutation, state) => {
    // Settings değişikliklerini yakala
    if (mutation.events) {
      const events = Array.isArray(mutation.events) ? mutation.events : [mutation.events]
      const hasSettingsChange = events.some(event =>
        event.key === 'settings'
        || (typeof event.key === 'string' && event.key.startsWith('settings.')),
      )

      if (hasSettingsChange) {
        // console.log('🔧 main.js: Settings değişikliği algılandı:', state.settings)
        // Basit gecikme ile SoundService'i bilgilendir
        setTimeout(() => {
          // console.log('🔧 main.js: SoundService.handleSettingsChange çağrılıyor')
          soundService.handleSettingsChange(state.settings)
        }, 100)
      }
    }
  })

  app.mount('#app')
})
