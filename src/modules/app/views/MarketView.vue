<script setup>
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import ColorCard from "@/components/ColorCard.vue";
import { useShopStore } from "@/store/shopStore";
import { usePlayerStore } from "@/store/playerStore";
import { useCoreStore } from "@/store/coreStore";
import { toastService } from "@/core/services/ToastService";
import { soundService } from "@/core/services/SoundService";
import { alertService } from "@/core/services/alertService";
import MultiPurchaseContent from "@/modules/app/components/MultiPurchaseContent.vue";
import { useI18n } from "vue-i18n";

const shopStore = useShopStore();
const playerStore = usePlayerStore();
const coreStore = useCoreStore();
const { t } = useI18n();

// Kenney pack'te kart rengi için karşılık yok (sadece buton/rozet asseti var),
// o yüzden ButtonBig/CurrencyBadge'deki FALLBACK_COLORS deseniyle aynı mantıkla
// her powerup için düz renk paleti tanımlıyoruz.
const CARD_COLORS = {
  dynamite: { bg: "#f2705e", border: "#d84a37", shadow: "#a8382a" },
  brush: { bg: "#5aa9e6", border: "#2f7dc2", shadow: "#215f94" },
  tornado: { bg: "#8b5cf6", border: "#6d28d9", shadow: "#5b21b6" },
};

function cardColor(itemId) {
  return CARD_COLORS[itemId] ?? CARD_COLORS.dynamite;
}

// Tek sayıda ürün olduğunda son kartı referans tasarımdaki gibi
// tam genişlik yerine ortalanmış, dar bir "alt raf" kartı olarak göster.
function isLastOdd(index) {
  return shopStore.powerUps.length % 2 === 1 && index === shopStore.powerUps.length - 1;
}

function goBack() {
  soundService.playEffect("click_effect");
  coreStore.goToHome();
}

async function buyItem(item) {
  soundService.playEffect("click_effect");

  let selectedAmount = 1;

  const confirmed = await alertService.show({
    title: t("are_you_sure") || "Emin misiniz?",
    slotComponent: MultiPurchaseContent,
    slotProps: {
      item,
      'onUpdate:amount': (val) => { selectedAmount = val; }
    },
    confirmButtonText: t("buy") || "Satın Al",
    cancelButtonText: t("no") || "İptal",
  });

  if (confirmed) {
    const result = shopStore.buySinglePowerUp(item.id, selectedAmount);
    toastService.show(t(result.message), result.success ? "success" : "warning");
  }
}
</script>

<template>
  <div
    class="relative h-screen w-full overflow-hidden bg-market-background bg-[#f3c988] bg-cover bg-top flex flex-col"
  >
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
        <h1 class="titre text-left text-lg phone-lg:text-xl phone-xl:text-2xl md:text-3xl">
          {{ t("shop") }}
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

    <div
      class="relative flex-grow flex flex-col items-center px-4 phone-xl:px-5 md:px-6 pt-28 phone-lg:pt-32 phone-xl:pt-36 md:pt-40 pb-6 overflow-y-auto"
    >
      <div class="grid grid-cols-2 gap-3 phone-xl:gap-4 md:gap-5 w-full max-w-md phone-xl:max-w-lg">
        <ColorCard
          v-for="(item, index) in shopStore.powerUps"
          :key="item.id"
          as="div"
          :color="cardColor(item.id)"
          :radius="20"
          :border-width="6"
          elevated
          class="market-card relative flex flex-col items-center gap-1.5 phone-xl:gap-2 p-3 phone-xl:p-4"
          :class="isLastOdd(index) ? 'col-span-2 justify-self-center w-1/2 phone-xl:w-[calc(50%-0.5rem)]' : ''"
        >
          <span class="titre text-sm phone-lg:text-base phone-xl:text-lg text-center uppercase">
            {{ t(item.name) }}
          </span>
          <img
            :src="item.img"
            :alt="t(item.name)"
            class="w-16 h-16 phone-lg:w-[4.5rem] phone-lg:h-[4.5rem] phone-xl:w-20 phone-xl:h-20 object-contain drop-shadow-md"
          />
          <div class="flex items-center gap-1.5 mt-1 mb-0.5">
            <img
              src="/assets/icons/diamond.png"
              alt=""
              class="w-6 h-6 phone-xl:w-7 phone-xl:h-7 object-contain drop-shadow-sm scale-110"
            />
            <span class="titre text-base phone-xl:text-lg text-white button-text-shadow">{{ item.price }}</span>
          </div>
          <button
            class="buy-button buy-button-body relative w-full h-9 phone-lg:h-10 phone-xl:h-11 flex items-center justify-center"
            @click="buyItem(item)"
          >
            <span class="titre text-xs phone-lg:text-sm phone-xl:text-base uppercase">{{ t("buy") }}</span>
          </button>
        </ColorCard>
      </div>
    </div>
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

.buy-button {
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.2));
  transition:
    transform 0.1s ease-out,
    filter 0.1s ease-out;
}

.buy-button-body {
  background-image: url("/assets/Vector/Green/button_rectangle_depth_gloss.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.buy-button:active {
  transform: translateY(3px);
  filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0.2)) brightness(0.96);
}
</style>
