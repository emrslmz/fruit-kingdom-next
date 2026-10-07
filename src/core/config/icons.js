/**
 * Tema başına ikon kayıt defteri. Bir tema, kullandığı ikonları kısmen
 * tanımlayabilir — eksik anahtarlar otomatik olarak `default` temaya düşer.
 * Değer bir görsel yoluysa (/ ile başlar) <img>, değilse (emoji/metin) düz
 * metin olarak render edilir — bkz. ThemedIcon.vue.
 *
 * Yeni bir tema eklemek için: aşağıya bir anahtar ekle, sadece o temaya özel
 * görselleri tanımla (gerisi default'tan gelir).
 */
export const ICON_THEMES = {
  default: {
    level: '/assets/icons/star.png',
    diamond: '/assets/icons/diamond_singular.png',
    gold: '/assets/icons/gold_singular.png',
    energy: '/assets/icons/flash.png',
  },
  snow: {
    // TODO: Kara temalı ikonlar eklendiğinde buraya tanımlanacak,
    // tanımlanmayanlar default temadan gelmeye devam eder.
  },
}

export function resolveIcon(theme, name) {
  return ICON_THEMES[theme]?.[name] ?? ICON_THEMES.default[name]
}
