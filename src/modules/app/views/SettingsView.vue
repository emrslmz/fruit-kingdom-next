<script setup>
import { computed, ref } from "vue";
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import GameCheckbox from "@/components/GameCheckbox.vue";
import { usePlayerStore } from "@/store/playerStore";
import { useCoreStore } from "@/store/coreStore";
import { soundService } from "@/core/services/SoundService";
import { languageService } from "@/core/services/LanguageService";
import { useI18n } from "vue-i18n";

const playerStore = usePlayerStore();
const coreStore = useCoreStore();
const { t } = useI18n();

const showLanguageModal = ref(false);

const currentLanguage = computed(() => {
  return languageService.getCurrentLanguage();
});

function goBack() {
  soundService.playEffect("click_effect");
  coreStore.goToHome();
}

function toggleMusic(enabled) {
  soundService.playEffect("click_effect");
  playerStore.updateSettings({ musicEnabled: enabled });
  if (enabled) {
    soundService.startInitialMusic();
  } else {
    soundService.stopMusic();
  }
}

function toggleSound(enabled) {
  soundService.playEffect("click_effect");
  playerStore.updateSettings({ soundEnabled: enabled });
}

function toggleVibration(enabled) {
  soundService.playEffect("click_effect");
  playerStore.updateSettings({ vibration: enabled });
}

function toggleNotifications(enabled) {
  soundService.playEffect("click_effect");
  playerStore.updateSettings({ notifications: enabled });
}

function changeLanguage(langCode) {
  soundService.playEffect("click_effect");
  languageService.changeLanguage(langCode);
  showLanguageModal.value = false;
}
</script>

<template>
  <div
    class="relative h-screen w-full overflow-hidden bg-grass-background bg-cover bg-center flex flex-col"
  >
    <!-- Header (Wooden Background) -->
    <div
      class="relative w-full flex items-center justify-between gap-3 phone-xl:gap-4 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] phone-xl:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+1.75rem)] pb-3 phone-xl:pb-3.5 md:pb-4 px-4 phone-xl:px-5 md:px-6 bg-wooden-background bg-cover bg-center border-b-4 border-[#3b230d] shadow-lg z-30"
    >
      <div class="flex items-center gap-2 phone-xl:gap-3 flex-shrink-0">
        <button
          class="back-button back-button-body relative w-10 h-10 phone-lg:w-11 phone-lg:h-11 phone-xl:w-12 phone-xl:h-12 flex-shrink-0 flex items-center justify-center"
          :aria-label="t('back')"
          @click="goBack"
        >
          <img
            src="/assets/icons/arrow_left.png"
            alt=""
            class="relative w-5 h-5 phone-lg:w-6 phone-lg:h-6 scale-[1.7] object-contain"
          />
        </button>
        <h1 class="titre text-left text-lg phone-lg:text-xl phone-xl:text-2xl md:text-3xl drop-shadow-md text-white">
          {{ t("settings") }}
        </h1>
      </div>

      <div class="flex items-center gap-2 phone-xl:gap-2.5 md:gap-3 flex-shrink-0">
        <CurrencyBadge
          icon="gold"
          :amount="playerStore.currencies.gold"
          class="!w-20 phone-lg:!w-24 phone-xl:!w-28 md:!w-32 lg:!w-36"
        />
        <CurrencyBadge
          icon="diamond"
          :amount="playerStore.currencies.diamonds"
          class="!w-20 phone-lg:!w-24 phone-xl:!w-28 md:!w-32 lg:!w-36"
        />
      </div>
    </div>

    <!-- Ayarlar Paneli Kapsayıcısı -->
    <div class="relative flex-grow flex flex-col items-center justify-center px-4 pb-6 overflow-hidden">
      <!-- Ana Ahşap / Krem Temalı Kart -->
      <div
        class="w-full max-w-sm phone-xl:max-w-md flex-1 max-h-[580px] main-board-card bg-[#fbf3d8] border-[3px] border-[#3b230d] shadow-2xl flex flex-col overflow-hidden relative p-4 phone-xl:p-5"
      >
        <!-- Ayarlar Listesi -->
        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-3.5">
          
          <!-- Müzik Ayarı -->
          <div class="setting-card relative bg-[#fceec9] border-[2.5px] border-[#3b230d] rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
              <!-- Kenney 3D Vector Icon Kutusu -->
              <div class="icon-box relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                <img src="/assets/icons/wooden_sign2.png" class="absolute inset-0 w-full h-full object-cover rounded-xl" />
                <span class="relative z-10 text-xl drop-shadow-md">🎵</span>
              </div>
              <span class="titre text-sm phone-xl:text-base font-black text-[#3b230d] uppercase tracking-wide">
                {{ t("music") }}
              </span>
            </div>
            <GameCheckbox 
              :model-value="playerStore.settings.musicEnabled" 
              @update:model-value="toggleMusic" 
            />
          </div>

          <!-- Ses Efektleri Ayarı -->
          <div class="setting-card relative bg-[#fceec9] border-[2.5px] border-[#3b230d] rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
              <div class="icon-box relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                <img src="/assets/icons/speech_ballon.png" class="w-8 h-8 object-contain drop-shadow-sm" />
              </div>
              <span class="titre text-sm phone-xl:text-base font-black text-[#3b230d] uppercase tracking-wide">
                {{ t("sound") }}
              </span>
            </div>
            <GameCheckbox 
              :model-value="playerStore.settings.soundEnabled" 
              @update:model-value="toggleSound" 
            />
          </div>

          <!-- Titreşim Ayarı -->
          <div class="setting-card relative bg-[#fceec9] border-[2.5px] border-[#3b230d] rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
              <div class="icon-box relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                <img src="/assets/icons/rotate.png" class="w-7 h-7 object-contain drop-shadow-sm" />
              </div>
              <span class="titre text-sm phone-xl:text-base font-black text-[#3b230d] uppercase tracking-wide">
                {{ t("vibration") }}
              </span>
            </div>
            <GameCheckbox 
              :model-value="playerStore.settings.vibration" 
              @update:model-value="toggleVibration" 
            />
          </div>

          <!-- Bildirimler Ayarı -->
          <div class="setting-card relative bg-[#fceec9] border-[2.5px] border-[#3b230d] rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
              <div class="icon-box relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                <img src="/assets/icons/announcement.png" class="w-8 h-8 object-contain drop-shadow-sm" />
              </div>
              <span class="titre text-sm phone-xl:text-base font-black text-[#3b230d] uppercase tracking-wide">
                {{ t("notifications") }}
              </span>
            </div>
            <GameCheckbox 
              :model-value="playerStore.settings.notifications" 
              @update:model-value="toggleNotifications" 
            />
          </div>

          <!-- Dil Seçimi -->
          <div class="setting-card relative bg-[#fceec9] border-[2.5px] border-[#3b230d] rounded-2xl p-3 flex flex-col gap-2.5 shadow-md">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="icon-box relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                  <img src="/assets/icons/compass.png" class="w-8 h-8 object-contain drop-shadow-sm" />
                </div>
                <span class="titre text-sm phone-xl:text-base font-black text-[#3b230d] uppercase tracking-wide">
                  {{ t("select_language") }}
                </span>
              </div>
            </div>
            
            <button 
              class="relative mt-1 py-2.5 px-4 rounded-xl border-2 border-[#3b230d] flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 active:scale-95 shadow-md bg-[#edd7a6] hover:bg-[#e4ce9c]"
              @click="showLanguageModal = true"
            >
              <div class="flex items-center gap-3">
                <img :src="currentLanguage.flag" class="w-7 h-7 rounded-full border border-black/20 object-cover shadow-sm" />
                <span class="titre text-sm font-black text-[#3b230d] uppercase tracking-wider">{{ currentLanguage.label }}</span>
              </div>
              <svg class="w-6 h-6 text-[#3b230d]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Language Selection Modal -->
    <transition name="modal-bounce">
      <div v-if="showLanguageModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" @click.self="showLanguageModal = false">
        
        <div class="relative w-full max-w-sm text-center" @click.stop>
          <div
            class="relative bg-wooden-background bg-cover bg-center border-[#3b230d] rounded-t-[2.5rem] rounded-b-[3rem] p-2 sm:p-4 border-[5px] shadow-2xl flex flex-col max-h-[85vh]"
          >
            <!-- Close Button -->
            <button @click="showLanguageModal = false" class="absolute top-0 right-0 sm:top-2 sm:right-2 w-10 h-10 sm:w-12 sm:h-12 bg-[#e74c3c] border-[3px] border-[#3b230d] rounded-full flex items-center justify-center text-white shadow-inner active:scale-90 transition-transform z-30 translate-x-2 -translate-y-2 sm:translate-x-0 sm:translate-y-0">
               <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <!-- Başlık -->
            <h2 class="titre text-2xl sm:text-3xl font-black text-white z-20 pb-4 pt-3 drop-shadow-lg">
              {{ t("select_language") }}
            </h2>

            <!-- İçerik Kartı -->
            <div
              class="border-[#3b230d] bg-[#fdf6e3] rounded-t-[2rem] rounded-b-[2.5rem] border-[4px] shadow-inner flex flex-col overflow-hidden"
            >
              <div class="overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar max-h-[50vh]">
                <button
                  v-for="lang in languageService.getSupportedLanguages()"
                  :key="lang.code"
                  class="flex items-center gap-4 p-3 rounded-2xl border-[3px] border-[#3b230d] cursor-pointer transition-all active:scale-95 shadow-md"
                  :class="playerStore.settings.language === lang.code ? 'bg-[#4cd964] text-white' : 'bg-[#e4ce9c] text-[#3b230d] hover:bg-[#edd7a6]'"
                  @click="changeLanguage(lang.code)"
                >
                  <img :src="lang.flag" class="w-10 h-10 rounded-full border-[3px] border-black/20 object-cover shadow-sm" />
                  <span class="titre text-base phone-xl:text-lg font-black uppercase tracking-wider flex-1 text-left">{{ lang.label }}</span>
                  <svg v-if="playerStore.settings.language === lang.code" class="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </transition>
  </div>
</template>

<style scoped>
.back-button {
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.2));
  transition:
    transform 0.1s ease-out,
    filter 0.1s ease-out;
}

.back-button-body {
  background-image: url("/assets/Vector/Grey/button_square_depth_flat.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.back-button:active {
  transform: translateY(4px);
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.2)) brightness(0.96);
}

.main-board-card {
  border-radius: 20px;
}

.icon-box {
  background-color: #edd7a6;
  border: 2px solid #3b230d;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
}

/* Modal Transitions */
.modal-bounce-enter-active {
  animation: bounce-in 0.4s ease-out both;
}
.modal-bounce-leave-active {
  animation: bounce-in 0.25s ease-in reverse both;
}

@keyframes bounce-in {
  0% {
    transform: scale(0.5) translateY(50px);
    opacity: 0;
  }
  60% {
    transform: scale(1.05) translateY(-10px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(59, 35, 13, 0.06);
  border-radius: 8px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbb076;
  border-radius: 8px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6a4928;
}
</style>
