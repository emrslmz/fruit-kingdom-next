<script setup>
import { computed, ref } from "vue";
import CurrencyBadge from "@/components/CurrencyBadge.vue";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { useCoreStore } from "@/store/coreStore";
import { soundService } from "@/core/services/SoundService";
import { useI18n } from "vue-i18n";

const playerStore = usePlayerStore();
const gameStore = useGameStore();
const coreStore = useCoreStore();
const { t } = useI18n();

const activeTab = ref("all"); // 'all' | 'fruits' | 'powerups'

const tabs = [
  { key: "all", labelKey: "all" },
  { key: "fruits", labelKey: "fruits" },
  { key: "powerups", labelKey: "powerups" },
];

function goBack() {
  soundService.playEffect("click_effect");
  coreStore.goToHome();
}

function selectTab(tabKey) {
  soundService.playEffect("click_effect");
  activeTab.value = tabKey;
}

const allItems = computed(() => {
  const items = [];

  // Power-ups / Boosters
  playerStore.inventory.powerUps.forEach((p) => {
    if (p.quantity > 0) {
      let imgPath = "/assets/icons/backpack.png";
      let nameKey = p.id;
      if (p.id === "dynamite") imgPath = "/assets/power_ups/dynamite.png";
      else if (p.id === "brush") imgPath = "/assets/power_ups/brush.png";
      else if (p.id === "tornado") imgPath = "/assets/power_ups/tornado.png";
      else if (p.id === "rainbow") imgPath = "/assets/power_ups/rainbow.png";

      items.push({
        id: p.id,
        category: "powerups",
        nameKey,
        count: p.quantity,
        img: imgPath,
      });
    }
  });

  // Fruits
  const fruitTypes = gameStore.fruitTypes || [];
  Object.entries(playerStore.inventory.fruitInventory).forEach(([fruitId, count]) => {
    if (count > 0) {
      const typeInfo = fruitTypes.find((f) => f.id === fruitId);
      items.push({
        id: fruitId,
        category: "fruits",
        nameKey: fruitId,
        count,
        img: typeInfo ? typeInfo.imgPath : "/assets/fruits/apple.png",
      });
    }
  });

  return items;
});

const filteredItems = computed(() => {
  if (activeTab.value === "fruits") {
    return allItems.value.filter((item) => item.category === "fruits");
  }
  if (activeTab.value === "powerups") {
    return allItems.value.filter((item) => item.category === "powerups");
  }
  return allItems.value;
});

// En az 9 slot gösterelim ki 3x3 grid dolu ve düzenli gözüksün
const displayedSlots = computed(() => {
  const list = [...filteredItems.value];
  const minSlots = 9;
  const targetLength = Math.max(minSlots, Math.ceil(list.length / 3) * 3);
  while (list.length < targetLength) {
    list.push(null);
  }
  return list;
});
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
          {{ t("inventory") }}
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

    <!-- Envanter Paneli Kapsayıcısı -->
    <div class="relative flex-grow flex flex-col items-center justify-center px-4 pt-10 pb-6 overflow-hidden">
      <!-- Sekmeler (Görseldeki Gibi SVG Şeklinde Kusursuz Birleşen Yapı) -->
      <div class="w-full max-w-sm phone-xl:max-w-md flex items-end gap-1.5 px-2 z-10 -mb-[3px]">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="relative flex-1 flex items-center justify-center cursor-pointer transition-all duration-150 group"
          :class="activeTab === tab.key ? 'h-11 phone-xl:h-12 z-20' : 'h-9 phone-xl:h-10 z-0'"
          @click="selectTab(tab.key)"
        >
          <!-- Aktif Sekme Arka Plan SVG -->
          <svg
            v-if="activeTab === tab.key"
            class="absolute inset-0 w-full h-full drop-shadow-[0_-2px_0_rgba(0,0,0,0.15)]"
            viewBox="0 0 100 48"
            preserveAspectRatio="none"
          >
            <path
              d="M 4,2 
                 L 96,2 
                 A 4,4 0 0 1 100,6 
                 L 100,40 
                 L 56,40 
                 L 50,46 
                 L 44,40 
                 L 0,40 
                 L 0,6 
                 A 4,4 0 0 1 4,2 Z"
              fill="#ffb82a"
              stroke="#4a2e1b"
              stroke-width="4"
              stroke-linejoin="round"
            />
          </svg>

          <!-- Pasif Sekme Arka Plan SVG -->
          <svg
            v-else
            class="absolute inset-0 w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <path
              d="M 4,2 
                 L 96,2 
                 A 4,4 0 0 1 100,6 
                 L 100,40 
                 L 0,40 
                 L 0,6 
                 A 4,4 0 0 1 4,2 Z"
              fill="#c6a67f"
              stroke="#4a2e1b"
              stroke-width="4"
              stroke-linejoin="round"
            />
          </svg>

          <!-- Sekme Yazısı -->
          <span
            class="titre text-xs phone-lg:text-sm phone-xl:text-base font-extrabold uppercase tracking-wide relative z-10 text-white button-text-shadow"
            :class="activeTab === tab.key ? '-translate-y-1' : ''"
          >
            {{ t(tab.labelKey) }}
          </span>
        </button>
      </div>

      <!-- Krem/Ahşap Kart Konteyneri -->
      <div
        class="w-full max-w-sm phone-xl:max-w-md flex-1 max-h-[580px] main-board-card bg-[#fbf3d8] border-[3px] border-[#3b230d] shadow-2xl flex flex-col overflow-hidden relative p-3.5 phone-xl:p-5 pt-4"
      >
        <!-- Scroll Edilebilir 3 Sütunlu Grid Alanı -->
        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar pt-1">
          <div class="grid grid-cols-3 gap-2.5 phone-xl:gap-3.5">
            <div
              v-for="(slot, idx) in displayedSlots"
              :key="idx"
              class="aspect-square bg-[#eedaa6] border-[2px] border-[#cbb076] rounded-2xl flex items-center justify-center relative shadow-inner p-2 hover:border-[#8b5e2b] transition-all"
            >
              <template v-if="slot">
                <img
                  :src="slot.img"
                  :alt="slot.nameKey"
                  class="w-4/5 h-4/5 object-contain drop-shadow-md transition-transform duration-150 hover:scale-105"
                />
                <!-- Miktar Rozeti -->
                <div
                  class="absolute -bottom-1 -right-1 bg-[#6a4928] text-[#fbf3d8] border-[1.5px] border-[#3b230d] rounded-full w-6 h-6 flex items-center justify-center text-[11px] phone-xl:text-xs font-black shadow-md titre"
                >
                  {{ slot.count }}
                </div>
              </template>
            </div>
          </div>
        </div>
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

/* Ana Kart Köşeleri */
.main-board-card {
  border-radius: 20px;
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
