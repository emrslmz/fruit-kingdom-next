<script setup>
import { useCoreStore } from "@/store/coreStore";
import { usePlayerStore } from "@/store/playerStore";
import { toastService } from "@/core/services/ToastService";
import { soundService } from "@/core/services/SoundService";
import { useI18n } from "vue-i18n";

const coreStore = useCoreStore();
const playerStore = usePlayerStore();
const { t } = useI18n();

function showComingSoon() {
  soundService.playEffect("click_effect");
  toastService.show(t("coming_soon"), "info");
}

function playGame() {
  soundService.playEffect("click_effect");
  coreStore.goTo("Game");
}

function openMarket() {
  soundService.playEffect("click_effect");
  coreStore.goTo("Market");
}

const bottomButtons = [
  {
    key: "inventory",
    icon: "/assets/icons/backpack.png",
    labelKey: "inventory",
    action: () => {
      soundService.playEffect("click_effect");
      coreStore.goTo("Inventory");
    },
  },
  {
    key: "shop",
    icon: "/assets/icons/shop.png",
    labelKey: "shop",
    action: openMarket,
  },
  {
    key: "tasks",
    icon: "/assets/icons/order.png",
    labelKey: "orders",
    action: () => {
      soundService.playEffect("click_effect");
      coreStore.goTo("Orders");
    },
  },
];
</script>

<template>
  <div
    class="w-full flex justify-center items-center gap-4 phone-xl:gap-5 md:gap-6 lg:gap-8 px-4 phone-xl:px-5 md:px-6 pt-3 phone-xl:pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] phone-xl:pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] md:pb-[calc(env(safe-area-inset-bottom,0px)+1.75rem)] lg:pb-[calc(env(safe-area-inset-bottom,0px)+2.25rem)] bg-wooden-background bg-cover bg-center border-t-4 border-[#3b230d] shadow-lg relative z-30"
  >
    <div
      v-for="btn in bottomButtons"
      :key="btn.key"
      class="relative flex-1 max-w-20 phone-lg:max-w-24 phone-xl:max-w-28 md:max-w-32 lg:max-w-36"
    >
      <button
        class="footer-item footer-item-body relative w-full aspect-square flex flex-col items-center justify-center gap-1 p-2"
        @click="btn.action"
      >
        <img
          :src="btn.icon"
          :alt="t(btn.labelKey)"
          class="relative w-8 h-8 phone-lg:w-9 phone-lg:h-9 phone-xl:w-10 phone-xl:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 scale-[2.5] phone-xl:scale-[2.6] md:scale-[2.8] lg:scale-[3] object-contain drop-shadow-sm"
        />
        <span
          class="footer-item-label relative text-white titre text-xs phone-xl:text-sm md:text-base lg:text-lg font-extrabold uppercase tracking-wide"
          >{{ t(btn.labelKey) }}</span
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.footer-item {
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.2));
  transition:
    transform 0.1s ease-out,
    filter 0.1s ease-out;
}

.footer-item-body {
  background-image: url("/assets/Vector/Grey/button_round_depth_flat.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.footer-item:active {
  transform: translateY(4px);
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.2)) brightness(0.96);
}

.footer-item-label {
  text-shadow:
    -1px -1px 0 #7a4a00,
    1px -1px 0 #7a4a00,
    -1px 1px 0 #7a4a00,
    1px 1px 0 #7a4a00;
}
</style>
