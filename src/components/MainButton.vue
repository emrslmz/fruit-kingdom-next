<script setup>
import { computed } from "vue";
import { soundService } from "@/core/services/SoundService";
import vibrationService from "@/core/services/VibrationService";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: "", // optional icon path
  },
  variant: {
    type: String,
    default: "green", // green or red
  }
});

const emits = defineEmits(["click"]);

function handleClick(event) {
  soundService.playEffect("click_effect");
  vibrationService.vibrate("click");
  emits("click", event);
}
</script>

<template>
  <button
    class="main-button relative flex items-center justify-center gap-3 active:scale-95 transition-all duration-150 cursor-pointer"
    :class="variant === 'red' ? 'main-button-red' : 'main-button-green'"
    @click="handleClick"
  >
    <img
      v-if="icon"
      :src="icon"
      alt=""
      class="w-8 h-8 phone-lg:w-10 phone-lg:h-10 phone-xl:w-12 phone-xl:h-12 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] scale-[1.2]"
    />
    <span
      class="titre text-white text-xl phone-lg:text-2xl phone-xl:text-3xl md:text-4xl font-black uppercase tracking-wider button-text-shadow"
      :class="variant === 'red' ? 'text-shadow-red' : 'text-shadow-green'"
    >
      {{ text }}
    </span>
  </button>
</template>

<style scoped>
.main-button {
  min-width: 200px;
  height: 70px;
  padding: 0 30px;
  @media (min-width: 400px) {
    min-width: 250px;
    height: 80px;
  }
  @media (min-width: 768px) {
    min-width: 300px;
    height: 100px;
  }
}

/* Green Variant */
.main-button-green {
  background-image: url("/assets/Vector/Green/button_rectangle_depth_gradient.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  filter: drop-shadow(0 10px 0 #1b4718) drop-shadow(0 14px 12px rgba(0, 0, 0, 0.4));
}
.main-button-green:active {
  transform: translateY(6px);
  filter: drop-shadow(0 4px 0 #1b4718) drop-shadow(0 6px 6px rgba(0, 0, 0, 0.4)) brightness(0.95);
}

/* Red Variant */
.main-button-red {
  background-image: url("/assets/Vector/Red/button_rectangle_depth_gradient.svg");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  filter: drop-shadow(0 10px 0 #4a0000) drop-shadow(0 14px 12px rgba(0, 0, 0, 0.4));
}
.main-button-red:active {
  transform: translateY(6px);
  filter: drop-shadow(0 4px 0 #4a0000) drop-shadow(0 6px 6px rgba(0, 0, 0, 0.4)) brightness(0.95);
}

.button-text-shadow {
  font-family: "LuckiestGuy", sans-serif;
  color: #ffffff;
  paint-order: stroke fill;
}
.text-shadow-green {
  -webkit-text-stroke: 2px #144012;
  text-shadow: 0 4px 0 #144012, 0 6px 8px rgba(0, 0, 0, 0.4);
}
.text-shadow-red {
  -webkit-text-stroke: 2px #4a0000;
  text-shadow: 0 4px 0 #4a0000, 0 6px 8px rgba(0, 0, 0, 0.4);
}
</style>
