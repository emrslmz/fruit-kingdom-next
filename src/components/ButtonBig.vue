<script setup lang="ts">
import { computed, ref } from "vue";
import { soundService } from "@/core/services/SoundService";
import vibrationService from "@/core/services/VibrationService";

// --- PROPS ---
interface Props {
  variant?:
    | "primary"
    | "success"
    | "danger"
    | "warning"
    | "violet"
    | "gray"
    | "secondary";
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "success",
  text: "PLAY",
});

// --- EMITS ---
const emits = defineEmits(["click"]);

// --- REFS ---
// OPTIMIZASYON: GSAP yerine animasyon durumunu yönetecek bir boolean ref kullanıyoruz.
const isAnimating = ref(false);

// Varyant -> Kenney UI Pack rengi (bkz. CLAUDE.md "UI Bileşenleri" kuralı).
// `violet` bu pack'te yok, o yüzden eski CSS-gradient stiline düşer.
const KENNEY_COLOR_BY_VARIANT: Record<string, string> = {
  primary: "Blue",
  success: "Green",
  warning: "Yellow",
  danger: "Red",
  gray: "Grey",
  secondary: "Grey",
};

const FALLBACK_COLORS: Record<
  string,
  { bg: string; border: string; shadow: string }
> = {
  violet: { bg: "#8b5cf6", border: "#6d28d9", shadow: "#5b21b6" },
};

const kenneyColor = computed(() => KENNEY_COLOR_BY_VARIANT[props.variant]);
const fallback = computed(() => FALLBACK_COLORS[props.variant]);
const backgroundImage = computed(() => {
  if (!kenneyColor.value) return null;
  return `url('/assets/Vector/${kenneyColor.value}/Double/button_rectangle_depth_gloss.png')`;
});

// --- METOTLAR ---
async function handleClick(event: MouseEvent) {
  // Ses ve titreşim efektleri
  soundService.playEffect("put_effect");
  vibrationService.vibrate("click");

  // Eğer animasyon zaten çalışmıyorsa, animasyonu başlat
  if (!isAnimating.value) {
    isAnimating.value = true;
  }

  // Parent component'e click event'ini iletiyoruz
  emits("click", event);
}

// Animasyon bittiğinde bu fonksiyon tetiklenir ve animasyon durumunu sıfırlar.
function onAnimationEnd() {
  isAnimating.value = false;
}
</script>

<template>
  <button
    class="font-puzzle text-4xl big-button"
    :class="[
      { 'elastic-effect': isAnimating },
      backgroundImage ? 'big-button--asset' : 'big-button--fallback',
    ]"
    :style="
      backgroundImage
        ? { backgroundImage }
        : {
            '--bg-color': fallback.bg,
            '--border-color': fallback.border,
            '--shadow-color': fallback.shadow,
          }
    "
    @click="handleClick"
    @animationend="onAnimationEnd"
  >
    <slot name="default">
      {{ text }}
    </slot>
  </button>
</template>

<style scoped>
.big-button {
  min-width: 250px;
  height: 80px;
  padding: 0 40px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  line-height: 1;
  position: relative;
  color: white;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.1s ease-out,
    filter 0.1s ease-out;
}

/* Kenney UI Pack asseti: şekil/kontür/derinlik zaten görselin içinde,
   burada sadece görseli kutuya germek yeterli. */
.big-button--asset {
  background-size: 100% 100%;
  background-repeat: no-repeat;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.2));
}

.big-button--asset:active {
  transform: translateY(4px);
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.2)) brightness(0.96);
}

/* Pack'te karşılığı olmayan varyantlar (örn. violet) için eski CSS-gradient stili. */
.big-button--fallback {
  border-bottom-width: 8px;
  border-radius: 25px;
  background-color: var(--bg-color);
  border-color: var(--border-color);
  box-shadow:
    0 6px 0 var(--shadow-color),
    0 10px 15px -3px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.1s ease-out,
    border-bottom-width 0.1s ease-out,
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.big-button--fallback:active {
  transform: translateY(4px);
  border-bottom-width: 4px;
}

/* Saf CSS ile elastik basma efekti (GSAP'e ihtiyaç yok). */
.elastic-effect {
  animation: elastic-effect 0.8s;
}

@keyframes elastic-effect {
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(0.95) translateY(2px);
  }
  45% {
    transform: scale(1.1);
  }
  65% {
    transform: scale(0.98);
  }
  85% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}
</style>
