<script setup>
import { ref } from "vue";
import ColorCard from "@/components/ColorCard.vue";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { soundService } from "@/core/services/SoundService";
import { toastService } from "@/core/services/ToastService";
import { useI18n } from "vue-i18n";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const playerStore = usePlayerStore();
const gameStore = useGameStore();
const { t } = useI18n();

const COST = 100; // 100 Altın
const isOpening = ref(false);
const wonItem = ref(null);

function closeModal() {
  soundService.playEffect("click_effect");
  wonItem.value = null;
  emit("close");
}

function openChest() {
  if (isOpening.value) return;

  if (playerStore.currencies.gold < COST) {
    toastService.show(t("not_enough_gold"), "warning");
    return;
  }

  soundService.playEffect("click_effect");
  playerStore.spendCurrency("gold", COST);
  isOpening.value = true;
  wonItem.value = null;

  // Kutu açma animasyonu/beklemesi
  setTimeout(() => {
    soundService.playEffect("echopop_effect");
    isOpening.value = false;

    // Şans Havuzu: Diamond (%40) veya PowerUp (%60)
    const isDiamond = Math.random() < 0.4;
    if (isDiamond) {
      const diamondAmount = [10, 25, 50][Math.floor(Math.random() * 3)];
      playerStore.addCurrency("diamonds", diamondAmount);
      wonItem.value = {
        name: `${diamondAmount} ${t("diamond")}`,
        img: "/assets/icons/diamond_singular.png",
        type: "diamond",
      };
    } else {
      const powerUpList = [
        { id: "dynamite", nameKey: "dynamite", img: "/assets/power_ups/dynamite.png" },
        { id: "brush", nameKey: "brush", img: "/assets/power_ups/brush.png" },
        { id: "tornado", nameKey: "tornado", img: "/assets/power_ups/tornado.png" },
      ];
      const selected = powerUpList[Math.floor(Math.random() * powerUpList.length)];
      playerStore.addPowerUp(selected.id, 1);
      wonItem.value = {
        name: t(selected.nameKey),
        img: selected.img,
        type: "powerup",
      };
    }
  }, 1200);
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
  >
    <ColorCard
      as="div"
      :color="{ bg: '#fbf3d8', border: '#3b230d', shadow: '#211205' }"
      :radius="24"
      :border-width="5"
      class="w-full max-w-sm flex flex-col items-center gap-4 p-5 text-center relative shadow-2xl animate-pop-in"
    >
      <!-- Kapat Butonu -->
      <button
        class="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#e63946] border-2 border-[#3b230d] text-white flex items-center justify-center font-black text-sm shadow-md active:scale-95 transition-transform cursor-pointer"
        @click="closeModal"
      >
        ✕
      </button>

      <!-- Başlık -->
      <h2 class="titre text-xl phone-xl:text-2xl font-black text-[#3b230d] uppercase tracking-wider">
        {{ t("mystery_box") }}
      </h2>

      <!-- Kutu Görseli & Animasyonu -->
      <div class="relative w-32 h-32 flex items-center justify-center py-2">
        <img
          src="/assets/icons/box_gift.png"
          alt=""
          class="w-24 h-24 object-contain drop-shadow-xl transition-all duration-300"
          :class="isOpening ? 'animate-bounce scale-110' : 'hover:scale-105'"
        />
      </div>

      <!-- Ödül Sonucu Gösterimi -->
      <div v-if="wonItem" class="flex flex-col items-center gap-1.5 p-3 bg-[#eedaa6] rounded-2xl border-2 border-[#cbb076] w-full animate-fade-in">
        <span class="titre text-xs font-bold text-[#78350f] uppercase">{{ t("congratulations") }}</span>
        <div class="flex items-center gap-2">
          <img :src="wonItem.img" class="w-8 h-8 object-contain drop-shadow-md" />
          <span class="titre text-base font-black text-[#3b230d]">{{ wonItem.name }}</span>
        </div>
      </div>

      <!-- Aç Açıklaması / Ücret -->
      <div class="flex items-center gap-2 bg-[#edd7a6]/60 px-4 py-1.5 rounded-full border border-[#d6b87d]">
        <span class="titre text-xs font-extrabold text-[#5c3a1d]">{{ t("open_box") }}:</span>
        <div class="flex items-center gap-1">
          <img src="/assets/icons/gold_singular.png" class="w-4 h-4 object-contain" />
          <span class="titre text-xs font-black text-[#3b230d]">{{ COST }}</span>
        </div>
      </div>

      <!-- Aç Butonu -->
      <button
        class="open-btn open-btn-body relative w-full h-11 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        :disabled="isOpening"
        @click="openChest"
      >
        <span class="titre text-white text-base font-black uppercase tracking-wider button-text-shadow">
          {{ isOpening ? "..." : t("open_box") }}
        </span>
      </button>
    </ColorCard>
  </div>
</template>

<style scoped>
.animate-pop-in {
  animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.open-btn {
  filter: drop-shadow(0 3px 0 #1b4718);
}

.open-btn-body {
  background-image: url("/assets/Vector/Green/button_rectangle_depth_gradient.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.open-btn:active {
  transform: translateY(2px);
  filter: drop-shadow(0 1px 0 #1b4718) brightness(0.95);
}

.button-text-shadow {
  font-family: "LuckiestGuy", sans-serif;
  color: #ffffff;
  -webkit-text-stroke: 1px #144012;
  paint-order: stroke fill;
  text-shadow: 0 2px 0 #144012;
}
</style>
