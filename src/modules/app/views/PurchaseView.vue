<script setup>
import { computed, ref } from "vue";
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import ColorCard from "@/components/ColorCard.vue";
import { useShopStore } from "@/store/shopStore";
import { usePlayerStore } from "@/store/playerStore";
import { useCoreStore } from "@/store/coreStore";
import { toastService } from "@/core/services/ToastService";
import { soundService } from "@/core/services/SoundService";
import { useI18n } from "vue-i18n";

// Enerji/altın/elmas satın alma ekranları tasarım olarak aynı, sadece renk
// (tint) ve içerik farklı — bkz. CLAUDE.md ve TheMenuHeader.vue -> goToPurchase.
const props = defineProps({
  currency: {
    type: String,
    required: true,
  },
});

const CURRENCY_CONFIG = {
  energy: {
    titleKey: "purchase_energy_title",
    tint: "rgba(76, 149, 255, 0.55)",
  },
  gold: {
    titleKey: "purchase_gold_title",
    tint: "rgba(255, 196, 40, 0.5)",
  },
  diamond: {
    titleKey: "purchase_diamond_title",
    tint: "rgba(139, 92, 246, 0.5)",
  },
};

// Kenney pack'te kart rengi için karşılık yok, o yüzden ColorCard'a (bkz.
// ButtonBig/CurrencyBadge FALLBACK_COLORS deseni) sırayla dönen bir palet veriyoruz.
const PALETTE = [
  { bg: "#f2c14e", border: "#d9a02c", shadow: "#a97d1f" },
  { bg: "#5aa9e6", border: "#2f7dc2", shadow: "#215f94" },
  { bg: "#8b5cf6", border: "#6d28d9", shadow: "#5b21b6" },
];

function colorFor(index) {
  return PALETTE[index % PALETTE.length];
}

function isLastOdd(list, index) {
  return list.length % 2 === 1 && index === list.length - 1;
}

const shopStore = useShopStore();
const playerStore = usePlayerStore();
const coreStore = useCoreStore();
const { t } = useI18n();

const config = computed(() => CURRENCY_CONFIG[props.currency] ?? CURRENCY_CONFIG.gold);

// Başlıktaki para birimi rozetleri: hangi para biriminin harcanıp hangisinin
// kazanılacağını gösterir, hepsi eşit sabit genişlikte (bkz. MarketView.vue).
const headerBadges = computed(() => {
  if (props.currency === "gold") {
    return [
      { icon: "diamond", amount: playerStore.currencies.diamonds },
      { icon: "gold", amount: playerStore.currencies.gold },
    ];
  }
  if (props.currency === "energy") {
    return [
      { icon: "gold", amount: playerStore.currencies.gold },
      { icon: "energy", amount: playerStore.energy.current, max: playerStore.energy.max },
    ];
  }
  return [{ icon: "diamond", amount: playerStore.currencies.diamonds }];
});

function isFullRefill(offer) {
  return offer.energy >= playerStore.energy.max;
}

function goBack() {
  soundService.playEffect("click_effect");
  coreStore.goToHome();
}

const purchasingId = ref(null);

async function buyGoldPackage(pkg) {
  if (purchasingId.value) return;
  soundService.playEffect("click_effect");
  purchasingId.value = pkg.id;
  try {
    const result = await shopStore.buyGoldPackage(pkg.id);
    if (result.message) toastService.show(t(result.message), result.success ? "success" : "warning");
  } finally {
    purchasingId.value = null;
  }
}

function buyGoldWithDiamonds(offer) {
  soundService.playEffect("click_effect");
  const result = shopStore.buyGoldWithDiamonds(offer.id);
  toastService.show(t(result.message), result.success ? "success" : "warning");
}

function buyEnergyWithGold(offer) {
  soundService.playEffect("click_effect");
  const result = shopStore.buyEnergyWithGold(offer.id);
  toastService.show(t(result.message), result.success ? "success" : "warning");
}

async function buyDiamondPackage(pkg) {
  if (purchasingId.value) return;
  soundService.playEffect("click_effect");
  purchasingId.value = pkg.id;
  try {
    const result = await shopStore.buyDiamondPackage(pkg.id);
    if (result.message) toastService.show(t(result.message), result.success ? "success" : "warning");
  } finally {
    purchasingId.value = null;
  }
}
</script>

<template>
  <div
    class="relative h-screen w-full overflow-hidden bg-purchase-background bg-[#e8c766] bg-cover bg-center flex flex-col"
  >
    <div class="absolute inset-0 pointer-events-none currency-tint" :style="{ backgroundColor: config.tint }" />

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
          {{ t(config.titleKey) }}
        </h1>
      </div>

      <div class="flex items-center gap-2 phone-xl:gap-2.5 md:gap-3 flex-shrink-0">
        <CurrencyBadge
          v-for="badge in headerBadges"
          :key="badge.icon"
          :icon="badge.icon"
          :amount="badge.amount"
          :max="badge.max"
          class="!w-20 phone-lg:!w-24 phone-xl:!w-28 md:!w-32 lg:!w-36"
        />
      </div>
    </div>

    <div class="relative flex-grow flex flex-col items-center gap-6 px-4 phone-xl:px-5 md:px-6 py-6 overflow-y-auto">
      <!-- ALTIN: gerçek para (IAP) veya elmas ile satın alınır. -->
      <template v-if="currency === 'gold'">
        <section class="w-full max-w-md phone-xl:max-w-lg flex flex-col gap-2 phone-xl:gap-3">
          <h2 class="titre text-base phone-lg:text-lg phone-xl:text-xl">{{ t("purchase") }}</h2>
          <div class="grid grid-cols-2 gap-3 phone-xl:gap-4 md:gap-5 w-full">
            <ColorCard
              v-for="(pkg, i) in shopStore.products.goldPackages"
              :key="pkg.id"
              as="div"
              :color="colorFor(i)"
              :radius="20"
              :border-width="6"
              elevated
              class="market-card relative flex flex-col items-center gap-1.5 phone-xl:gap-2 p-3 phone-xl:p-4"
              :class="isLastOdd(shopStore.products.goldPackages, i) ? 'col-span-2 justify-self-center w-1/2 phone-xl:w-[calc(50%-0.5rem)]' : ''"
            >
              <img
                :src="pkg.image"
                :alt="t(pkg.nameKey)"
                class="w-16 h-16 phone-lg:w-[4.5rem] phone-lg:h-[4.5rem] phone-xl:w-20 phone-xl:h-20 object-contain drop-shadow-md"
              />
              <div class="flex items-center gap-1">
                <img src="/assets/icons/gold_singular.png" alt="" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 object-contain" />
                <span class="titre text-sm phone-xl:text-base">{{ pkg.gold.toLocaleString() }}</span>
              </div>
              <button
                class="buy-button buy-button-body relative w-full h-9 phone-lg:h-10 phone-xl:h-11 flex items-center justify-center px-1"
                :disabled="purchasingId === pkg.id"
                @click="buyGoldPackage(pkg)"
              >
                <span class="titre text-xs phone-lg:text-sm phone-xl:text-base uppercase">
                  {{ purchasingId === pkg.id ? "..." : pkg.price }}
                </span>
              </button>
            </ColorCard>
          </div>
        </section>

        <section class="w-full max-w-md phone-xl:max-w-lg flex flex-col gap-2 phone-xl:gap-3">
          <h2 class="titre text-base phone-lg:text-lg phone-xl:text-xl">{{ t("exchange_with_diamonds") }}</h2>
          <div class="grid grid-cols-2 gap-3 phone-xl:gap-4 md:gap-5 w-full">
            <ColorCard
              v-for="(offer, i) in shopStore.exchangeOffers.diamondToGold"
              :key="offer.id"
              as="div"
              :color="colorFor(i)"
              :radius="20"
              :border-width="6"
              elevated
              class="market-card relative flex flex-col items-center gap-1 phone-xl:gap-1.5 p-3 phone-xl:p-4"
              :class="isLastOdd(shopStore.exchangeOffers.diamondToGold, i) ? 'col-span-2 justify-self-center w-1/2 phone-xl:w-[calc(50%-0.5rem)]' : ''"
            >
              <div class="flex items-center gap-1">
                <img src="/assets/icons/diamond.png" alt="" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 object-contain" />
                <span class="titre text-sm phone-xl:text-base">{{ offer.diamonds }}</span>
              </div>
              <img src="/assets/icons/arrow_left.png" alt="" class="w-4 h-4 -rotate-90 opacity-70" />
              <div class="flex items-center gap-1">
                <img src="/assets/icons/gold_singular.png" alt="" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 object-contain" />
                <span class="titre text-sm phone-xl:text-base">{{ offer.gold }}</span>
              </div>
              <button
                class="buy-button buy-button-body relative w-full h-9 phone-lg:h-10 phone-xl:h-11 flex items-center justify-center"
                @click="buyGoldWithDiamonds(offer)"
              >
                <span class="titre text-xs phone-lg:text-sm phone-xl:text-base uppercase">{{ t("buy") }}</span>
              </button>
            </ColorCard>
          </div>
        </section>
      </template>

      <!-- ENERJİ: altın ile satın alınır. -->
      <template v-else-if="currency === 'energy'">
        <section class="w-full max-w-md phone-xl:max-w-lg flex flex-col gap-2 phone-xl:gap-3">
          <h2 class="titre text-base phone-lg:text-lg phone-xl:text-xl">{{ t("exchange_with_gold") }}</h2>
          <div class="grid grid-cols-2 gap-3 phone-xl:gap-4 md:gap-5 w-full">
            <ColorCard
              v-for="(offer, i) in shopStore.exchangeOffers.goldToEnergy"
              :key="offer.id"
              as="div"
              :color="colorFor(i)"
              :radius="20"
              :border-width="6"
              elevated
              class="market-card relative flex flex-col items-center gap-1 phone-xl:gap-1.5 p-3 phone-xl:p-4"
              :class="isLastOdd(shopStore.exchangeOffers.goldToEnergy, i) ? 'col-span-2 justify-self-center w-1/2 phone-xl:w-[calc(50%-0.5rem)]' : ''"
            >
              <div class="flex items-center gap-1">
                <img src="/assets/icons/gold_singular.png" alt="" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 object-contain" />
                <span class="titre text-sm phone-xl:text-base">{{ offer.gold }}</span>
              </div>
              <img src="/assets/icons/arrow_left.png" alt="" class="w-4 h-4 -rotate-90 opacity-70" />
              <div class="flex items-center gap-1">
                <img src="/assets/icons/flash.png" alt="" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 object-contain" />
                <span class="titre text-sm phone-xl:text-base">{{ isFullRefill(offer) ? t("full_refill") : `+${offer.energy}` }}</span>
              </div>
              <button
                class="buy-button buy-button-body relative w-full h-9 phone-lg:h-10 phone-xl:h-11 flex items-center justify-center"
                @click="buyEnergyWithGold(offer)"
              >
                <span class="titre text-xs phone-lg:text-sm phone-xl:text-base uppercase">{{ t("buy") }}</span>
              </button>
            </ColorCard>
          </div>
        </section>
      </template>

      <!-- ELMAS: gerçek para ile IAP. -->
      <template v-else>
        <!-- Özel Teklifler (Örn: Starter Offer) -->
        <section v-if="shopStore.products.specialOffers.length" class="w-full max-w-md phone-xl:max-w-lg flex flex-col gap-2 phone-xl:gap-3 mb-4">
          <h2 class="titre text-base phone-lg:text-lg phone-xl:text-xl">{{ t("special_offers") }}</h2>
          <div class="flex flex-col gap-3 phone-xl:gap-4 w-full">
            <ColorCard
              v-for="(offer, i) in shopStore.products.specialOffers"
              :key="offer.id"
              as="div"
              :color="colorFor(i + 2)"
              :radius="20"
              :border-width="6"
              elevated
              class="market-card relative flex flex-col items-center gap-2 p-4 w-full"
            >
              <h3 class="titre text-sm phone-xl:text-base text-center">{{ t(offer.nameKey) }}</h3>
              <img :src="offer.image" class="w-20 h-20 phone-xl:w-24 phone-xl:h-24 object-contain drop-shadow-lg" />
              
              <!-- İçerik -->
              <div class="flex items-center justify-center gap-4 my-2">
                <div class="flex flex-col items-center gap-1">
                  <img src="/assets/icons/diamond.png" class="w-6 h-6 phone-xl:w-8 phone-xl:h-8 object-contain" />
                  <span class="titre text-sm phone-xl:text-base">{{ offer.content.diamonds }}</span>
                </div>
                <div v-for="pu in offer.content.powerUps" :key="pu.id" class="flex flex-col items-center gap-1">
                  <img :src="`/assets/power_ups/${pu.id}.png`" class="w-6 h-6 phone-xl:w-8 phone-xl:h-8 object-contain" />
                  <span class="titre text-sm phone-xl:text-base">{{ pu.quantity }}</span>
                </div>
              </div>

              <button
                class="buy-button buy-button-body relative w-3/4 h-10 phone-lg:h-12 flex items-center justify-center"
                :disabled="purchasingId === offer.id"
                @click="buyDiamondPackage(offer)"
              >
                <span class="titre text-sm phone-xl:text-base uppercase">{{ purchasingId === offer.id ? "..." : offer.price }}</span>
              </button>
            </ColorCard>
          </div>
        </section>

        <!-- Standart Elmas Paketleri -->
        <section class="w-full max-w-md phone-xl:max-w-lg flex flex-col gap-2 phone-xl:gap-3">
          <h2 class="titre text-base phone-lg:text-lg phone-xl:text-xl">{{ t("diamonds") }}</h2>
          <div class="grid grid-cols-2 gap-3 phone-xl:gap-4 md:gap-5 w-full">
            <ColorCard
              v-for="(pkg, i) in shopStore.products.diamondPackages"
              :key="pkg.id"
              as="div"
              :color="colorFor(i)"
              :radius="20"
              :border-width="6"
              elevated
              class="market-card relative flex flex-col items-center gap-1.5 p-3 phone-xl:p-4"
              :class="isLastOdd(shopStore.products.diamondPackages, i) ? 'col-span-2 justify-self-center w-1/2' : ''"
            >
              <!-- Bonus Badge -->
              <div v-if="pkg.bonusPercentage" class="absolute -top-2 -left-2 bg-green-500 text-white titre text-[10px] phone-lg:text-xs px-1.5 py-0.5 rounded-md transform -rotate-12 shadow-md border-2 border-white z-10">
                +{{ pkg.bonusPercentage }}%
              </div>
              
              <img :src="pkg.image" class="w-16 h-16 phone-lg:w-[4.5rem] phone-lg:h-[4.5rem] phone-xl:w-20 phone-xl:h-20 object-contain drop-shadow-md" />
              
              <div class="flex items-center gap-1">
                <img src="/assets/icons/diamond.png" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 object-contain" />
                <span class="titre text-sm phone-xl:text-base">{{ pkg.diamonds }}</span>
              </div>

              <button
                class="buy-button buy-button-body relative w-full h-9 phone-lg:h-10 phone-xl:h-11 flex items-center justify-center mt-1"
                :disabled="purchasingId === pkg.id"
                @click="buyDiamondPackage(pkg)"
              >
                <span class="titre text-xs phone-lg:text-sm phone-xl:text-base uppercase">{{ purchasingId === pkg.id ? "..." : pkg.price }}</span>
              </button>
            </ColorCard>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Kenney UI Pack asseti: şekil/kontür/derinlik görselin içinde (bkz. CLAUDE.md). */
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

/* Üç para birimi ekranı da aynı arkaplan görselini paylaşıyor, sadece bu
   renk katmanı (mix-blend-mode) farklı — bkz. CLAUDE.md "aynı img, farklı renk". */
.currency-tint {
  mix-blend-mode: color;
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

.buy-button:disabled {
  opacity: 0.7;
}
</style>
