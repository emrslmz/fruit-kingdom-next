import router from '@/router'
import { defineStore } from 'pinia'
import { soundService } from '@/core/services/SoundService.js'

export const useCoreStore = defineStore('core', {
  // state içinden alert ve toast kaldırıldı.
  state: () => ({
    isLoading: false,
    previousRoute: null,
    isGamePageActive: false,
    lastActiveTime: null,
  }),

  getters: {
  },

  // actions içinden alert ve toast ile ilgili tüm action'lar kaldırıldı.
  actions: {
    setLoading(status) {
      this.isLoading = status
    },
    goBack() {
      if (this.hasPreviousRoute) {
        router.push(this.previousRoute)
      }
      else {
        router.go(-1)
      }
    },
    goTo(route) {
      // soundService.playEffect('click_effect')
      router.push({ name: route })
    },
    goToParams(route) {
      router.push({ ...route, params: { ...route.params } })
    },
    goToHome() {
      router.push({ name: 'MainMenu' })
    },
  },
})
