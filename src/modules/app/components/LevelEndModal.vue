<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import gsap from 'gsap'
import confetti from 'canvas-confetti'
import ButtonBig from '@/components/ButtonBig.vue'
import PButton from '@/components/PButton.vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/store/gameStore.js'

const { t } = useI18n()

const props = defineProps({
  show: Boolean,
  mode: {
    type: String,
    default: 'lose',
    validator: val => ['win', 'lose', 'continue'].includes(val),
  },
  level: {
    type: Number,
    default: 1,
  },
  playerDiamonds: Number,
  collectedFruits: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['nextLevel', 'retryLevel', 'acceptContinue', 'declineContinue', 'mainMenu'])

const modalCard = ref(null)
const gameStore = useGameStore()
const continueCountdown = ref(4)
const progressWidth = ref('100%')
let countdownInterval = null

const collectedFruitsArray = computed(() => {
  return Object.entries(props.collectedFruits).map(([type, count]) => {
    const fruitInfo = gameStore.fruitTypes.find(f => f.id === type)
    return {
      ...fruitInfo,
      count,
    }
  }).filter(f => f.id && f.count > 0)
})

const titleText = computed(() => {
  if (props.mode === 'continue') return t('oh_no')
  return `${t('level')} ${props.level}`
})

const buttonText = computed(() => {
  switch (props.mode) {
    case 'win': return t('next_level')
    case 'lose': return t('try_again')
    case 'continue': return `${t('continue_for')} 50`
    default: return ''
  }
})

const colorClasses = computed(() => {
  switch (props.mode) {
    case 'lose':
      return {
        mainBg: 'bg-rose-600',
        border: 'border-rose-400/80',
        innerBorder: 'border-rose-200',
        textPrimary: 'text-rose-800',
      }
    case 'continue':
      return {
        mainBg: 'bg-violet-600',
        border: 'border-violet-400/80',
        innerBorder: 'border-violet-200',
        textPrimary: 'text-violet-800',
      }
    case 'win':
    default:
      return {
        mainBg: 'bg-sky-600',
        border: 'border-sky-400/80',
        innerBorder: 'border-sky-200',
        textPrimary: 'text-sky-800',
      }
  }
})

function triggerConfetti() {
  const duration = 2 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1001 }

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) {
      return clearInterval(interval)
    }
    const particleCount = 50 * (timeLeft / duration)
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

function startContinueTimer() {
  clearInterval(countdownInterval)
  continueCountdown.value = 7
  progressWidth.value = '100%'
  countdownInterval = setInterval(() => {
    continueCountdown.value -= 1
    progressWidth.value = `${(continueCountdown.value / 7) * 100}%`
    if (continueCountdown.value <= 0) {
      clearInterval(countdownInterval)
      emit('declineContinue')
    }
  }, 1000)
}

watch(() => props.show, (isShown) => {
  if (isShown) {
    if (props.mode === 'continue') {
      startContinueTimer()
    }
    else {
      clearInterval(countdownInterval)
    }
    gsap.fromTo(
      modalCard.value,
      { scale: 0.5, opacity: 0, y: 50 },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
        onComplete: () => {
          if (props.mode === 'win') {
            triggerConfetti()
          }
        },
      },
    )
  }
  else {
    clearInterval(countdownInterval)
  }
})

onUnmounted(() => {
  clearInterval(countdownInterval)
})
</script>

<template>
  <transition name="fade">
    <div v-if="show" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
      <div ref="modalCard" class="relative w-full max-w-sm text-center" @click.stop>
        <div :class="[colorClasses.mainBg, colorClasses.border]" class="relative rounded-t-[2.5rem] rounded-b-[3rem] p-2 pt-8 border-4 shadow-2xl">
          <h2 class="titre text-4xl font-black text-white z-20 pb-6">
            {{ titleText }}
          </h2>
          <div :class="colorClasses.innerBorder" class="bg-[#fdf6e3] rounded-t-[2.5rem] rounded-b-[3rem] border-4 shadow-inner min-h-[250px] flex flex-col items-center justify-center p-4">
            <transition name="mode-swap" mode="out-in">
              <div v-if="mode === 'lose'" key="lose" class="flex flex-col items-center justify-center">
                <img src="/assets/icons/heart_broken.png" alt="Kırık Kalp" class="w-24 h-24 object-contain">
                <p :class="colorClasses.textPrimary" class="text-2xl titre-light mt-4">
                  {{ t('level_failed') }}
                </p>
              </div>

              <div v-else-if="mode === 'win'" key="win" class="flex flex-col items-center justify-center gap-4">
                <p class="text-3xl text-yellow-500 titre">
                  {{ t('level_completed') }}
                </p>
                <div class="w-full max-w-xs bg-black/10 rounded-xl p-3">
                  <p class="text-lg text-slate-600 font-bold mb-2 text-center">
                    {{ t('collected_fruits') }}
                  </p>
                  <div v-if="collectedFruitsArray.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    <div
                      v-for="(fruit, index) in collectedFruitsArray"
                      :key="fruit.id"
                      class="relative flex flex-col items-center justify-center animate-pop-in"
                      :style="{ animationDelay: `${index * 50}ms` }"
                    >
                      <img :src="fruit.imgPath" :alt="fruit.name" class="w-10 h-10 drop-shadow-lg">
                      <span class="text-sm font-bold text-slate-700">x{{ fruit.count }}</span>
                    </div>
                  </div>
                  <p v-else class="text-center text-slate-500 text-sm">
                    {{ t('no_fruits_collected') }}
                  </p>
                </div>
              </div>

              <!-- YENİ: Devam etme modu ekranı -->
              <div v-else-if="mode === 'continue'" key="continue" class="flex flex-col items-center justify-center gap-y-4 px-4">
                <p :class="colorClasses.textPrimary" class="text-xl sm:text-2xl titre-light">
                  {{ t('continue_message') }}
                </p>
                <img src="/assets/icons/reverse.png" alt="Revive" class="w-28 h-28 object-contain my-2">
                <div class="w-full bg-slate-300 rounded-full h-4 overflow-hidden border-2 border-slate-400">
                  <div class="bg-green-500 h-full rounded-full transition-all duration-1000 linear" :style="{ width: progressWidth }" />
                </div>
              </div>
            </transition>
          </div>

          <div class="w-full flex flex-col justify-center items-center gap-4 py-4 px-6">
            <!-- Continue Mode -->
            <template v-if="mode === 'continue'">
              <ButtonBig
                variant="violet"
                class="w-full bg-gradient-to-b from-violet-500 to-violet-700 border-violet-900
             text-white font-extrabold tracking-wider rounded-full py-3 border-b-8
             active:border-b-4 active:mt-1 transition-all duration-100 titre flex items-center justify-center gap-2"
                @click="$emit('acceptContinue')"
              >
                <span class="animate-textBounce flex justify-center items-center gap-2">
                  <span class="text-xl">{{ buttonText }}</span>
                  <img src="/assets/icons/diamond.png" alt="Elmas" class="w-10 h-10 scale-[1.5]">
                </span>
              </ButtonBig>

              <ButtonBig
                variant="danger"
                class="w-full titre flex items-center justify-center gap-2 text-xl"
                @click="$emit('declineContinue')"
              >
                {{ t('no_thanks') }}
              </ButtonBig>
            </template>

            <!-- Lose Mode -->
            <template v-else-if="mode === 'lose'">
              <ButtonBig
                variant="danger"
                class="w-full titre text-2xl"
                @click="$emit('retryLevel')"
              >
                <span class="animate-pulse">
                  {{ t('try_again') }}
                </span>
              </ButtonBig>

              <ButtonBig
                variant="secondary"
                class="w-full titre text-2xl"
                @click="$emit('mainMenu')"
              >
                {{ t('home') }}
              </ButtonBig>
            </template>

            <!-- Win Mode -->
            <template v-else-if="mode === 'win'">
              <ButtonBig
                variant="success"
                class="w-full titre text-2xl"
                @click="$emit('nextLevel')"
              >
                <span class="animate-textBounce">
                  {{ t('next_level') }}
                </span>
              </ButtonBig>

              <ButtonBig
                variant="secondary"
                class="w-full titre text-2xl"
                @click="$emit('mainMenu')"
              >
                {{ t('home') }}
              </ButtonBig>
            </template>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.mode-swap-enter-active, .mode-swap-leave-active { transition: all 0.4s ease; }
.mode-swap-enter-from { opacity: 0; transform: scale(0.8) translateY(20px); }
.mode-swap-leave-to { opacity: 0; transform: scale(0.8) translateY(-20px); }
@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-pop-in {
  animation: pop-in 0.3s ease-out forwards;
}
</style>
