<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { useCoreStore } from "@/store/coreStore";
import { soundService } from "@/core/services/SoundService";
import { toastService } from "@/core/services/ToastService";
import { alertService } from "@/core/services/alertService";
import { useI18n } from "vue-i18n";

const playerStore = usePlayerStore();
const gameStore = useGameStore();
const coreStore = useCoreStore();
const { t } = useI18n();

const currentTime = ref(Date.now());
let timer = null;

onMounted(() => {
  playerStore.generateOrders();
  timer = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function goBack() {
  soundService.playEffect("click_effect");
  coreStore.goToHome();
}

function getCharacter(characterId) {
  return playerStore.characters.find((c) => c.id === characterId) || { name: "Customer" };
}

function getFruitImage(fruitId) {
  const typeInfo = gameStore.fruitTypes.find((f) => f.id === fruitId);
  return typeInfo ? typeInfo.imgPath : "/assets/fruits/apple.png";
}

function getOrderProgress(order) {
  if (!order || !order.requirements) return { collected: 0, required: 1, percentage: 0 };
  let totalRequired = 0;
  let totalCollected = 0;
  for (const [fruitId, amount] of Object.entries(order.requirements)) {
    totalRequired += amount;
    totalCollected += Math.min(playerStore.inventory.fruitInventory[fruitId] || 0, amount);
  }
  return {
    collected: totalCollected,
    required: totalRequired,
    percentage: totalRequired > 0 ? Math.floor((totalCollected / totalRequired) * 100) : 0
  };
}

function formatTimeLeft(expiresAt) {
  if (!expiresAt) return "0m 0s";
  const diffMs = expiresAt - currentTime.value;
  if (diffMs <= 0) return "0m 0s";

  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

function speedUpOrder(index) {
  soundService.playEffect("click_effect");
  const result = playerStore.speedUpOrder(index);
  if (result.success) {
    toastService.show(t("order_speeded_up") || "Hızlandırıldı!", "success");
  } else {
    toastService.show(t(result.message), "warning");
  }
}

function hasEnoughFruits(order) {
  if (!order || !order.requirements) return false;
  return Object.entries(order.requirements).every(
    ([fruitId, amount]) => (playerStore.inventory.fruitInventory[fruitId] || 0) >= amount
  );
}

function canFulfill(order) {
  return hasEnoughFruits(order) && playerStore.energy.current >= playerStore.orderEnergyCost;
}

function fulfillOrder(orderId) {
  soundService.playEffect("click_effect");
  const result = playerStore.completeOrder(orderId);
  if (result.success) {
    soundService.playEffect("echopop_effect");
    toastService.show(t(result.message) || "Sipariş tamamlandı!", "success");
  } else {
    toastService.show(t(result.message), "warning");
  }
}

async function confirmDeleteOrder(index) {
  soundService.playEffect("click_effect");
  const confirmed = await alertService.show({
    title: t("are_you_sure") || "Emin misin?",
    message: t("delete_order_message") || "Bu siparişi yenilemek istediğine emin misin?",
    confirmButtonText: t("yes") || "Evet",
    cancelButtonText: t("no") || "İptal",
  });
  if (!confirmed) return;

  const result = playerStore.removeOrder(index);
  if (result.success) {
    toastService.show(t("order_removed") || "Sipariş yenileniyor...", "success");
  } else {
    toastService.show(t(result.message), "warning");
  }
}
</script>

<template>
  <div class="relative h-screen w-full overflow-hidden bg-wooden-background bg-cover bg-center flex flex-col page-enter-animation">
    <!-- Dark Wood Overlay -->
    <div class="absolute inset-0 bg-[#2b1706]/40 pointer-events-none z-0"></div>

    <!-- Header (Market stili) -->
    <div
      class="relative w-full flex items-center justify-between gap-3 phone-xl:gap-4 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] phone-xl:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+1.75rem)] pb-3 phone-xl:pb-3.5 md:pb-4 px-4 phone-xl:px-5 md:px-6 bg-wooden-background bg-cover bg-center border-b-4 border-[#3b230d] shadow-lg z-30 header-anim"
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
          {{ t("orders") || "ORDERS" }}
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

    <!-- Scrollable Orders List -->
    <div class="relative flex-grow flex justify-center w-full px-4 pb-6 overflow-hidden mt-4 z-10">
      <div class="w-full max-w-sm phone-xl:max-w-md overflow-y-auto custom-scrollbar flex flex-col gap-5 pr-2 pb-10">
        
        <!-- We map through exactly 3 slots. playerStore.orders should have 3 items -->
        <template v-for="(order, index) in playerStore.orders" :key="index">
          
          <div class="order-card w-full bg-[#fffae8] border-[3px] border-[#6b4724] rounded-[18px] shadow-lg relative overflow-visible"
               :style="{ animationDelay: `${index * 150}ms` }">
            
            <!-- ACTIVE ORDER STATE (Always directly visible now) -->
            <template v-if="order && order.id">
              <div class="flex flex-col p-4 phone-xl:p-5 w-full">
                
                <!-- Row 1: Header (Name & Refresh) -->
                <div class="flex justify-between items-center w-full mb-3">
                  <span class="cartoon-text text-[#4a2e1b] text-2xl phone-xl:text-3xl tracking-wide leading-none drop-shadow-sm">
                    {{ getCharacter(order.characterId).name }}
                  </span>
                  
                  <!-- Replace/Refresh button -->
                  <button
                    class="refresh-btn w-9 h-9 phone-xl:w-10 phone-xl:h-10 rounded-full bg-[#3b82f6] border-[2px] border-white shadow-md flex items-center justify-center active:scale-95 transition-transform"
                    @click="confirmDeleteOrder(index)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 phone-xl:w-5 phone-xl:h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                  </button>
                </div>
                
                <!-- Row 2 & 3: Fruits + Progress + Fulfill button -->
                <div class="flex flex-row items-end justify-between gap-3 w-full">
                  
                  <!-- Left Side: Fruits List & Wide Progress Bar -->
                  <div class="flex-1 flex flex-col justify-end gap-3 min-w-0">
                    
                    <!-- Fruits Container (Wraps if multiple, scales cleanly) -->
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 w-full max-w-[200px] phone-xl:max-w-[240px]">
                      <template v-for="(reqAmount, fruitId) in order.requirements" :key="fruitId">
                        <div class="flex items-center gap-1">
                          <img :src="getFruitImage(fruitId)" class="w-8 h-8 phone-xl:w-9 phone-xl:h-9 object-contain drop-shadow-md" />
                          <span class="cartoon-text text-[#4a2e1b] text-2xl phone-xl:text-3xl leading-none mt-1 drop-shadow-sm">
                            {{ reqAmount }}
                          </span>
                        </div>
                      </template>
                    </div>

                    <!-- Wide Progress Bar (spanning the left column) -->
                    <div class="w-full max-w-[180px] phone-xl:max-w-[210px] h-5 phone-xl:h-6 bg-[#5a3a22] rounded-full relative overflow-hidden flex items-center justify-center shadow-inner border-[2px] border-[#5a3a22] mt-1">
                      <div 
                        class="absolute left-0 top-0 h-full bg-[#7ec12f] transition-all duration-500 ease-out" 
                        :style="{ width: `${getOrderProgress(order).percentage}%` }">
                      </div>
                      <div class="absolute top-0 left-0 w-full h-[40%] bg-white/20"></div>
                      <span class="relative z-10 cartoon-text text-white text-[12px] phone-xl:text-[14px] tracking-widest leading-none mt-1 progress-shadow">
                        {{ getOrderProgress(order).collected }}/{{ getOrderProgress(order).required }}
                      </span>
                    </div>

                  </div>

                  <!-- Right Side: Fulfill Button -->
                  <div class="flex-shrink-0 relative z-10">
                    <button
                      class="fulfill-btn relative px-4 phone-xl:px-5 py-3 phone-xl:py-3.5 flex items-center justify-center shrink-0 active:translate-y-1 transition-transform"
                      :class="{ 'opacity-60 grayscale': !canFulfill(order) }"
                      @click="fulfillOrder(order.id)"
                    >
                      <!-- Energy Badge -->
                      <span class="absolute -top-3 -left-3 flex items-center gap-1 bg-[#6499c8] border-[2px] border-[#294a6d] rounded-full px-2 py-0.5 shadow-md z-20">
                        <img src="/assets/icons/flash.png" class="w-3 h-3 object-contain" />
                        <span class="cartoon-text text-white text-[11px] leading-none mt-0.5 text-shadow-sm">{{ playerStore.orderEnergyCost }}</span>
                      </span>

                      <!-- Text exactly as requested -->
                      <span class="cartoon-text text-white text-[16px] phone-xl:text-[18px] tracking-widest fulfill-shadow relative z-10 mt-0.5" style="line-height: 1;">
                        TAMAMLA
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            </template>
            
          </div>
        </template>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');

.cartoon-text {
  font-family: "LuckiestGuy", sans-serif;
}

.header-text {
  font-family: "LuckiestGuy", sans-serif;
  -webkit-text-stroke: 2px #4a2e1b;
  paint-order: stroke fill;
  text-shadow: 0 4px 0 #4a2e1b;
}

.back-button {
  background-image: url("/assets/Vector/Grey/button_square_depth_flat.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.2));
  transition: transform 0.1s ease-out, filter 0.1s ease-out;
}
.back-button:active {
  transform: translateY(4px);
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.2)) brightness(0.96);
}

.fulfill-btn {
  background-image: url("/assets/Vector/Green/button_rectangle_depth_gloss.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  filter: drop-shadow(0 4px 0 rgba(42, 26, 15, 0.4));
}
.fulfill-btn:active {
  transform: translateY(4px);
  filter: drop-shadow(0 1px 0 rgba(42, 26, 15, 0.4)) brightness(0.96);
}

.fulfill-shadow {
  -webkit-text-stroke: 1.5px #144012;
  paint-order: stroke fill;
  text-shadow: 0 2px 0 #144012;
}

.progress-shadow {
  -webkit-text-stroke: 1.5px #3a2212;
  paint-order: stroke fill;
  text-shadow: 0 1px 0 #3a2212;
}

.icon-invert {
  filter: brightness(0) invert(1);
}

.text-shadow-sm {
  -webkit-text-stroke: 1px #294a6d;
  paint-order: stroke fill;
  text-shadow: 0 1px 0 #294a6d;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(59, 35, 13, 0.1);
  border-radius: 8px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #6b4724;
  border-radius: 8px;
}

/* Page Entry Animations */
.page-enter-animation {
  animation: fadeIn 0.4s ease-out both;
}
.header-anim {
  animation: slideDown 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.order-card {
  animation: bounceInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes slideDown {
  0% { opacity: 0; transform: translateY(-30px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes bounceInUp {
  0% { opacity: 0; transform: translateY(60px) scale(0.95); }
  70% { opacity: 1; transform: translateY(-5px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
