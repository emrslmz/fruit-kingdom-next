import { mobileService } from '@/core/services/MobileService'
import { soundService } from '@/core/services/soundService'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import { usePlayerStore } from '@/store/playerStore.js'

import './style.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
  .use(pinia)
  .use(i18n)

mobileService.boot(pinia)

const playerStore = usePlayerStore()

// Ayar değişikliklerini (ses/müzik) SoundService'e ilet
playerStore.$subscribe((mutation, state) => {
  if (!mutation.events)
    return
  const events = Array.isArray(mutation.events) ? mutation.events : [mutation.events]
  const hasSettingsChange = events.some(event =>
    event.key === 'settings'
    || (typeof event.key === 'string' && event.key.startsWith('settings.')),
  )
  if (hasSettingsChange)
    setTimeout(() => soundService.handleSettingsChange(state.settings), 100)
})

app.mount('#app')
