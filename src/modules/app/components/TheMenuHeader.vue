<script setup>
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import { usePlayerStore } from "@/store/playerStore";
import { useCoreStore } from "@/store/coreStore";
import { soundService } from "@/core/services/SoundService";

const playerStore = usePlayerStore();
const coreStore = useCoreStore();

function goToPurchase(currency) {
  soundService.playEffect("click_effect");
  coreStore.goToParams({ name: "Purchase", params: { currency } });
}
</script>

<template>
  <div
    class="header-bar header-bar-body w-full pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] phone-xl:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+1.75rem)] pb-3 phone-xl:pb-3.5 md:pb-4 px-4 phone-xl:px-5 md:px-6 bg-wooden-background bg-cover bg-center border-b-4 border-[#3b230d] shadow-lg relative z-30"
  >
    <div class="w-full flex items-center justify-between gap-3 phone-xl:gap-4 md:gap-4 lg:gap-5">
      <CurrencyBadge
        icon="energy"
        :amount="playerStore.energy.current"
        :max="playerStore.energy.max"
        @click="goToPurchase('energy')"
      />
      <div class="flex items-center gap-2 phone-xl:gap-2.5 md:gap-3">
        <CurrencyBadge
          icon="gold"
          :amount="playerStore.currencies.gold"
          @click="goToPurchase('gold')"
        />
        <CurrencyBadge
          icon="diamond"
          :amount="playerStore.currencies.diamonds"
          @click="goToPurchase('diamond')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Kenney/oyun asseti: tek görsel, tam kutuya gerdirilir (bkz. CLAUDE.md). */
/* .header-bar-body {
  background-image: url("/assets/icons/wooden_sign.png");
  background-size: 100% 100%;
  background-repeat: no-repeat;
} */
</style>
