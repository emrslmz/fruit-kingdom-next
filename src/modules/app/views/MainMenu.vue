<script setup>
import { ref } from "vue";
import TheMenuHeader from "@/modules/app/components/TheMenuHeader.vue";
import TheMenuFooter from "@/modules/app/components/TheMenuFooter.vue";
import MainButton from "@/components/MainButton.vue";
import { usePlayerStore } from "@/store/playerStore";
import { useCoreStore } from "@/store/coreStore";
import { purchaseService } from "@/core/services/PurchaseService";
import { toastService } from "@/core/services/ToastService";
import { soundService } from "@/core/services/SoundService";
import { useI18n } from "vue-i18n";

const playerStore = usePlayerStore();
const coreStore = useCoreStore();
const { t } = useI18n();

function playGame() {
  soundService.playEffect("click_effect");
  coreStore.goTo("Game");
}

function openSettings() {
  soundService.playEffect("click_effect");
  coreStore.goTo("Settings");
}

function openChestModal() {
  soundService.playEffect("click_effect");
  coreStore.goTo("Cases");
}

async function removeAds() {
  soundService.playEffect("click_effect");
  const result = await purchaseService.purchase("revenue.remove_ads");
  if (result.success) {
    playerStore.removeAds();
    toastService.show(t("ads_removed"), "success");
  } else if (!result.cancelled) {
    toastService.show(t("purchase_failed"), "warning");
  }
}
</script>

<template>
  <div
    class="relative h-screen w-full overflow-hidden bg-grass-background bg-cover bg-center flex flex-col"
  >
    <TheMenuHeader />

    <div
      class="flex-grow px-4 phone-xl:px-5 md:px-6 lg:px-8 pt-3 phone-xl:pt-3.5 md:pt-4 lg:pt-5 relative flex flex-col items-center justify-between"
    >
      <!-- Üst Butonlar Barı: Sol Ayarlar, Sağ Reklam Kaldır & Kutu Açma -->
      <div class="w-full flex items-center justify-between z-10">
        <button
          class="settings-button settings-button-body relative w-10 h-10 phone-lg:w-11 phone-lg:h-11 phone-xl:w-12 phone-xl:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center cursor-pointer"
          :aria-label="t('settings')"
          @click="openSettings"
        >
          <img
            src="/assets/icons/cog.png"
            alt=""
            class="relative w-5 h-5 phone-lg:w-6 phone-lg:h-6 phone-xl:w-7 phone-xl:h-7 md:w-8 md:h-8 scale-[1.8] object-contain"
          />
        </button>

        <div class="flex items-center gap-2.5">
          <!-- Kutu Açma Butonu -->
          <button
            class="top-action-btn top-action-btn-body relative w-10 h-10 phone-lg:w-11 phone-lg:h-11 phone-xl:w-12 phone-xl:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center cursor-pointer"
            :aria-label="t('open_box')"
            @click="openChestModal"
          >
            <img
              src="/assets/cases/gear_case.png"
              alt=""
              class="relative w-6 h-6 phone-lg:w-7 phone-lg:h-7 phone-xl:w-8 phone-xl:h-8 scale-[1.6] object-contain drop-shadow-md"
            />
          </button>

          <!-- Reklamları Kaldır Butonu (Sağ Üst) -->
          <button
            v-if="!playerStore.settings.adsRemoved"
            class="top-action-btn top-action-btn-body relative w-10 h-10 phone-lg:w-11 phone-lg:h-11 phone-xl:w-12 phone-xl:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center cursor-pointer"
            :aria-label="t('remove_ads')"
            @click="removeAds"
          >
            <img
              src="/assets/icons/remove_ads.png"
              alt=""
              class="relative w-6 h-6 phone-lg:w-7 phone-lg:h-7 phone-xl:w-8 phone-xl:h-8 scale-[1.6] object-contain drop-shadow-md"
            />
          </button>
        </div>
      </div>

      <!-- Ekran Ortasında Seviye Bilgili Oyna Butonu -->
      <div class="my-auto flex flex-col items-center justify-center relative">
        <MainButton
          :text="`${t('play')} - ${playerStore.profile.gameLevel}`"
          icon="/assets/icons/play.png"
          variant="green"
          @click="playGame"
        />
      </div>

      <div></div>
    </div>

    <TheMenuFooter />
  </div>
</template>

<style scoped>
/* Kenney UI Pack asseti: şekil/kontür/derinlik görselin içinde (bkz. CLAUDE.md). */
.settings-button,
.top-action-btn {
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.2));
  transition:
    transform 0.1s ease-out,
    filter 0.1s ease-out;
}

.settings-button-body,
.top-action-btn-body {
  background-image: url("/assets/Vector/Blue/button_square_depth_flat.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.settings-button:active,
.top-action-btn:active {
  transform: translateY(4px);
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.2)) brightness(0.96);
}
</style>
