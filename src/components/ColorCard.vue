<script setup>
defineProps({
  // Render edilecek eleman: buton için 'button', panel/kart için 'div' vb.
  as: {
    type: String,
    default: 'div',
  },
  // { bg, border, shadow } hex renkleri.
  color: {
    type: Object,
    required: true,
  },
  radius: {
    type: Number,
    default: 16,
  },
  borderWidth: {
    type: Number,
    default: 6,
  },
  // Market kartı gibi zemin üstünde "yüzen" panellerde yumuşak dış gölge de ekler.
  elevated: {
    type: Boolean,
    default: false,
  },
  // CurrencyBadge gibi tıklanabilir elemanlarda basılma efekti.
  pressable: {
    type: Boolean,
    default: false,
  },
  // "Chunky" alt-kontür + düz gölge tekniği, radius çok büyüdüğünde (tam
  // yuvarlak hap/daire) köşelerde çentik/kesinti oluşturuyor — bu gibi
  // durumlarda depth=false ile düz çerçeve + yumuşak gölgeye düş.
  depth: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <component
    :is="as"
    class="color-card"
    :class="[
      depth ? 'color-card--depth' : 'color-card--flat',
      elevated ? 'color-card--elevated' : '',
      pressable ? 'color-card--pressable' : '',
    ]"
    :style="{
      '--cc-bg': color.bg,
      '--cc-border': color.border,
      '--cc-shadow': color.shadow,
      '--cc-radius': `${radius}px`,
      '--cc-border-width': `${borderWidth}px`,
    }"
  >
    <slot />
  </component>
</template>

<style scoped>
/* Kenney pack'te panel/kart çerçevesi yok (bkz. CLAUDE.md) — bu yüzden düz
   renkli, alt kontürlü "chunky" kart stili kullanılıyor. Para birimi
   rozetleri (CurrencyBadge) ve market kartları (MarketView) bu ortak
   bileşeni paylaşır, sadece renk/oran/basılma davranışı değişir. */
.color-card {
  position: relative;
  border-radius: var(--cc-radius);
  background-color: var(--cc-bg);
  transition:
    transform 0.1s ease-out,
    box-shadow 0.1s ease-out;
}

.color-card--depth {
  border-bottom: var(--cc-border-width) solid var(--cc-border);
  box-shadow: 0 var(--cc-border-width) 0 var(--cc-shadow);
}

.color-card--depth.color-card--elevated {
  box-shadow:
    0 var(--cc-border-width) 0 var(--cc-shadow),
    0 10px 15px -3px rgba(0, 0, 0, 0.25);
}

/* Tam yuvarlak hap/daire gibi çok büyük radius'larda alt-kontür tekniği
   köşelerde bozuluyor — düz çerçeve + yumuşak gölge kullan. */
.color-card--flat {
  border: var(--cc-border-width) solid var(--cc-border);
  box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.35);
}

.color-card--pressable:active {
  transform: translateY(var(--cc-border-width));
  box-shadow: 0 0 0 var(--cc-shadow);
}
</style>
