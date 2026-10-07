<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps({
  box: {
    type: Object,
    required: true,
  },
});

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
</script>

<template>
  <div class="w-full mt-2">
    <ul class="w-full space-y-2">
      <li v-for="(drop, i) in box.drops" :key="i" class="flex items-center justify-between bg-black/5 p-3 rounded-xl border border-black/10 shadow-sm">
        <div class="flex items-center gap-3">
          <img :src="getDropIcon(drop)" class="w-8 h-8 object-contain drop-shadow-sm" />
          <span class="text-sky-900 text-lg sm:text-xl font-bold titre">{{ getDropText(drop) }}</span>
        </div>
        <span class="text-sky-600 font-extrabold text-xl sm:text-2xl titre drop-shadow-sm">%{{ drop.chance }}</span>
      </li>
    </ul>
  </div>
</template>
