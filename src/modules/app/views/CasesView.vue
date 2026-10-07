<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import ColorCard from "@/components/ColorCard.vue";
import { useShopStore } from "@/store/shopStore";
import { usePlayerStore } from "@/store/playerStore";
import { useCoreStore } from "@/store/coreStore";
import { toastService } from "@/core/services/ToastService";
import { soundService } from "@/core/services/SoundService";
import { alertService } from "@/core/services/alertService";
import CaseInfoContent from "@/modules/app/components/CaseInfoContent.vue";
import { useI18n } from "vue-i18n";

const shopStore = useShopStore();
const playerStore = usePlayerStore();
const coreStore = useCoreStore();
const { t } = useI18n();

// Kenney pack tarzı ColorCard renkleri
const PALETTE = [
  { bg: "#d2b48c", border: "#a68864", shadow: "#8c6b4b" }, // Wood
  { bg: "#c18a56", border: "#9f6a39", shadow: "#7c4e25" }, // Rustic
  { bg: "#b5c1c4", border: "#8c9ba1", shadow: "#6a7b82" }, // Steel
  { bg: "#d9a02c", border: "#b88320", shadow: "#9c6a15" }, // Gear/Gold
];

function colorFor(index) {
  return PALETTE[index % PALETTE.length];
}

function goBack() {
  soundService.playEffect("click_effect");
  coreStore.goToHome();
}

const openingCase = ref(false);
const animationState = ref("idle"); // idle, rolling, revealed
const revealedItem = ref(null);
const activeCaseImg = ref("");

// Info Modal via alertService
function openInfo(box) {
  soundService.playEffect("click_effect");
  alertService.show({
    title: t(box.nameKey) + " - " + (t("detail") || "Details"),
    cancelButtonText: t("close") || "Close",
    slotComponent: CaseInfoContent,
    slotProps: { box },
    size: "lg",
  });
}

function getDropIcon(drop) {
  if (drop.type === "diamond") return "/assets/icons/diamond_singular.png";
  if (drop.type === "powerup" && drop.id === "random") return "/assets/icons/box_gift.png";
  return `/assets/power_ups/${drop.id}.png`;
}

function getDropText(drop) {
  if (drop.type === "powerup" && drop.id === "random") {
    return `${drop.amount}x ${t("random_powerup")}`;
  }
  return `${drop.amount}x`;
}

// CS:GO Roller Animation State
const rollerHolderRef = ref(null);
const rollerItems = ref([]);
const rollerOffset = ref(0);
const rollerTransition = ref("none");
const winningIndex = ref(78);
const pendingBox = ref(null);
const pendingDrop = ref(null);

const freeCaseTimeRemaining = ref("");
let timerInterval = null;

function updateTimer() {
  if (!playerStore.canOpenFreeCase()) {
    const cooldown = 24 * 60 * 60 * 1000;
    const remaining = cooldown - (Date.now() - (playerStore.profile.lastFreeCaseOpenTime || 0));
    if (remaining <= 0) {
      freeCaseTimeRemaining.value = "";
    } else {
      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remaining % (1000 * 60)) / 1000);
      freeCaseTimeRemaining.value = `${h}s ${m}d ${s}sn`;
    }
  } else {
    freeCaseTimeRemaining.value = "";
  }
}

onMounted(() => {
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

function generateRollerItems(box, winningDrop) {
  let items = [];
  for (let i = 0; i < 100; i++) {
    if (i === winningIndex.value) {
      items.push(winningDrop);
    } else {
      let rand = Math.random() * 100;
      let cumulative = 0;
      let visualDrop = box.drops[0];
      for (const d of box.drops) {
        cumulative += d.chance;
        if (rand < cumulative) {
          visualDrop = { ...d };
          break;
        }
      }
      items.push(visualDrop);
    }
  }
  rollerItems.value = items;
}

async function openBox(box) {
  if (openingCase.value) return;

  if (box.priceType === "free" && !playerStore.canOpenFreeCase()) {
    toastService.show(t("free_case_not_ready") || "Ücretsiz kutun henüz hazır değil!", "warning");
    return;
  }
  
  if (box.priceType === "gold" && playerStore.currencies.gold < box.price) {
    toastService.show(t("not_enough_gold"), "warning");
    return;
  }
  if (box.priceType === "diamond" && playerStore.currencies.diamonds < box.price) {
    toastService.show(t("not_enough_diamonds"), "warning");
    return;
  }

  soundService.playEffect("click_effect");

  const proceedOpen = () => {
    // Start animation sequence
    openingCase.value = true;
    animationState.value = "rising";
    activeCaseImg.value = box.image;

    // Perform backend logic instantly so we know what drops
    const result = shopStore.openCase(box.id);
    if (!result.success) {
      toastService.show(t(result.message), "warning");
      openingCase.value = false;
      animationState.value = "idle";
      return;
    }

    pendingBox.value = box;
    pendingDrop.value = result.drop;

    setTimeout(() => {
      animationState.value = "waiting_for_click";
    }, 600); // 0.6s rise animation
  };

  const msg = box.priceType === "free"
    ? (t("free") || "Free")
    : `${box.price} ${t(box.priceType)} ${t("will_be_spent") || "harcanacak."}`;

  const confirmed = await alertService.show({
    title: t("are_you_sure") || "Emin misiniz?",
    message: msg,
    image: box.image,
    confirmButtonText: t("yes") || "Evet",
    cancelButtonText: t("no") || "Hayır"
  });

  if (confirmed) {
    proceedOpen();
  }
}

function handleCaseClick() {
  if (animationState.value !== "waiting_for_click") return;
  soundService.playEffect("click_effect");
  animationState.value = "shaking";

  const box = pendingBox.value;
  const drop = pendingDrop.value;

  generateRollerItems(box, drop);
  rollerOffset.value = 0;
  rollerTransition.value = "none";
  
  // Wait for shaking animation, then start rolling
  setTimeout(async () => {
    animationState.value = "rolling";
    
    await nextTick();
    setTimeout(() => {
      const itemWidth = 88;
      const containerW = rollerHolderRef.value ? rollerHolderRef.value.offsetWidth : 900;
      
      const randomFuzz = (Math.random() - 0.5) * (itemWidth - 10);
      const targetOffset = (containerW / 2) - (winningIndex.value * itemWidth + itemWidth / 2) + randomFuzz;
      
      // Roll for 6s (faster and more exciting)
      rollerTransition.value = "transform 6s cubic-bezier(.08,.6,0,1)";
      rollerOffset.value = targetOffset;

      // After 6.5s show result
      setTimeout(() => {
        soundService.playEffect("success_effect");
        openingCase.value = false;
        animationState.value = "idle";
        
        const isDiamond = drop.type === 'diamond';
        const isPowerupRandom = drop.type === 'powerup' && drop.id === 'random';
        
        let itemName = "";
        if (isDiamond) itemName = t("diamonds") || "Diamonds";
        else if (isPowerupRandom) itemName = t("random_powerup") || "Random Powerup";
        else itemName = t(drop.id) || drop.id;

        alertService.show({
          title: t("congratulations") || "Tebrikler!",
          message: `+${drop.amount} ${itemName}`,
          image: getDropIcon(drop),
          confirmButtonText: t("ok") || "Tamam",
          size: "md"
        });

      }, 6500);
    }, 50);
  }, 1500);
}
</script>

<template>
  <div
    class="relative h-screen w-full overflow-hidden bg-market-background bg-[#5b3c22] bg-cover bg-center flex flex-col"
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
        <h1 class="titre text-left text-lg phone-lg:text-xl phone-xl:text-2xl md:text-3xl text-white drop-shadow-md">
          {{ t("cases") }}
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

    <!-- Kutular Listesi -->
    <div class="relative flex-grow flex flex-col items-center px-4 phone-xl:px-5 md:px-6 pt-4 pb-6 overflow-y-auto w-full max-w-4xl mx-auto space-y-4">
      <ColorCard
        v-for="(box, index) in shopStore.cases"
        :key="box.id"
        as="div"
        :color="colorFor(index)"
        :radius="20"
        :border-width="6"
        elevated
        class="w-full relative flex flex-row items-center gap-3 p-3 phone-xl:p-4"
      >
        <!-- Info Button (Sağ Üst) -->
        <button
          class="absolute top-2 right-2 bg-black/40 hover:bg-black/60 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10"
          @click="openInfo(box)"
        >
          <span class="text-white font-bold text-lg">i</span>
        </button>

        <!-- Kutu Görseli -->
        <div class="flex-shrink-0 w-24 h-24 phone-xl:w-28 phone-xl:h-28 flex items-center justify-center">
          <img :src="box.image" :alt="t(box.nameKey)" class="w-full h-full object-contain drop-shadow-lg" />
        </div>
        
        <!-- Detaylar -->
        <div class="flex-grow flex flex-col justify-center h-full min-w-0">
          <h2 class="titre text-base phone-xl:text-lg text-white mb-1 uppercase tracking-wide truncate drop-shadow-sm">
            {{ t(box.nameKey) }}
          </h2>
          <span class="text-xs phone-xl:text-sm text-white/80">{{ t("click_i_for_details") || "Click 'i' for details" }}</span>
        </div>

        <!-- Aksiyon Butonu -->
        <div class="flex-shrink-0 flex flex-col items-center gap-1">
          <button
            class="buy-button buy-button-body relative w-24 h-10 phone-lg:w-28 phone-lg:h-12 flex items-center justify-center gap-1 mt-2 transition-all"
            :class="{'opacity-60 grayscale': box.priceType === 'free' && freeCaseTimeRemaining}"
            @click="openBox(box)"
          >
            <template v-if="box.priceType === 'free'">
              <span v-if="!freeCaseTimeRemaining" class="titre text-xs phone-lg:text-sm uppercase text-white">{{ t("free") }}</span>
              <span v-else class="titre text-[10px] phone-lg:text-xs uppercase text-white tracking-tighter">{{ freeCaseTimeRemaining }}</span>
            </template>
            <template v-else>
              <img :src="box.priceType === 'gold' ? '/assets/icons/gold_singular.png' : '/assets/icons/diamond.png'" class="w-4 h-4 phone-lg:w-5 phone-lg:h-5 object-contain" />
              <span class="titre text-xs phone-lg:text-sm uppercase text-white">{{ box.price }}</span>
            </template>
          </button>
        </div>
      </ColorCard>
    </div>

    <!-- Animasyon Overlay (CS:GO Roller & Shaking) -->
    <div v-if="openingCase" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#191726]/95 backdrop-blur-md transition-opacity duration-300">
      
      <!-- Başlık (Sadece beklerken, sallanırken veya roller varken) -->
      <h2 v-if="animationState !== 'rising'" class="titre text-3xl text-white mb-8 drop-shadow-lg" :class="{'animate-pulse': animationState === 'waiting_for_click'}">
        <template v-if="animationState === 'waiting_for_click'">
          {{ t('tap_to_open') || 'Açmak İçin Tıkla' }}
        </template>
        <template v-else>
          {{ t("opening") || "Açılıyor" }}...
        </template>
      </h2>

      <!-- Roller Container -->
      <transition name="fade-slide">
        <div v-show="animationState === 'rolling'" class="w-full max-w-4xl relative overflow-hidden h-32 border-y-4 border-[#3c3759] bg-[#0e1a23] shadow-[0_0_30px_rgba(0,0,0,0.8)] mb-8" ref="rollerHolderRef">
          <!-- Center Red Line -->
          <div class="absolute left-1/2 top-0 bottom-0 w-1 bg-[#d16266] z-50 -translate-x-1/2 drop-shadow-[0_0_5px_rgba(209,98,102,0.8)]"></div>
          
          <!-- Moving Strip -->
          <div
            class="flex items-center h-full absolute top-0 left-0"
            :style="{
              transition: rollerTransition,
              transform: `translateX(${rollerOffset}px)`
            }"
          >
            <div
              v-for="(item, index) in rollerItems"
              :key="index"
              class="flex-shrink-0 w-20 h-24 mx-1 flex flex-col items-center justify-center relative border border-[#70677c] bg-[#14202b]"
              :class="{
                'border-b-4 border-b-[#EB4B4B]': item.type === 'diamond',
                'border-b-4 border-b-[#66b233]': item.type === 'powerup'
              }"
            >
              <img :src="getDropIcon(item)" class="w-12 h-12 object-contain" />
              <span class="absolute bottom-1 right-1 text-white text-[10px]">{{ getDropText(item) }}</span>
            </div>
          </div>
        </div>
      </transition>

      <!-- Kutu (Rising, Waiting, Shaking) -->
      <div 
        class="flex flex-col items-center justify-center mt-4 transition-transform duration-500 cursor-pointer"
        :class="{
          'translate-y-[100vh] scale-50': animationState === 'rising' && !openingCase,
          'animate-rise-up scale-100': animationState === 'rising',
          'animate-pulse hover:scale-110': animationState === 'waiting_for_click',
          'animate-shake': animationState === 'shaking' || animationState === 'rolling',
        }"
        @click="handleCaseClick"
      >
        <img :src="activeCaseImg" class="w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-2xl pointer-events-none" />
      </div>

    </div>
  </div>
</template>

<style scoped>
.back-button {
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.2));
  transition: transform 0.1s ease-out, filter 0.1s ease-out;
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
  transition: transform 0.1s ease-out, filter 0.1s ease-out;
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

/* Animations */
@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg) scale(1); }
  10% { transform: translate(-1px, -2px) rotate(-1deg) scale(1.05); }
  20% { transform: translate(-3px, 0px) rotate(1deg) scale(1.1); }
  30% { transform: translate(3px, 2px) rotate(0deg) scale(1.15); }
  40% { transform: translate(1px, -1px) rotate(1deg) scale(1.1); }
  50% { transform: translate(-1px, 2px) rotate(-1deg) scale(1.1); }
  60% { transform: translate(-3px, 1px) rotate(0deg) scale(1.15); }
  70% { transform: translate(3px, 1px) rotate(-1deg) scale(1.1); }
  80% { transform: translate(-1px, -1px) rotate(1deg) scale(1.05); }
  90% { transform: translate(1px, 2px) rotate(0deg) scale(1); }
  100% { transform: translate(1px, -2px) rotate(-1deg) scale(1); }
}
.animate-shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite;
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-zoom-in {
  animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@keyframes riseUp {
  0% {
    transform: translateY(50vh) scale(0.5);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
.animate-rise-up {
  animation: riseUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
</style>
