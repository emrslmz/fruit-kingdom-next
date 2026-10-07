// Fruit Kingdom — Phaser tarafının ortak sabitleri (renk paleti, font, tasarım ölçüleri).
//
// Tüm UI "tasarım birimi" (design unit) cinsinden yazılır: referans ekran
// 390x780'lik bir telefon. `core/layout.js` bunu her cihazda gerçek piksele
// (devicePixelRatio dahil) çevirir — bkz. CLAUDE.md "Phaser UI" bölümü.

export const DESIGN = {
  width: 390,
  height: 780,
  maxColumn: 560, // geniş ekranlarda (tablet/masaüstü) içerik sütununun en fazla genişliği
}

export const FONT = 'Agu, LuckiestGuy, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif'
export const FONT_ALT = 'LuckiestGuy, Agu, "Arial Rounded MT Bold", system-ui, sans-serif'

// Kenney UI Pack (2.0) buton paleti — SVG'lerden birebir alınan renkler.
// Anlam eşlemesi CLAUDE.md ile aynı: yellow=birincil, green=onay, red=tehlike,
// blue=ikincil, grey=nötr. purple/wood pack'te yok, tema için eklendi.
export const BTN = {
  yellow: { rim: 0xDEA312, light: 0xFFEA9C, face: 0xFFCC00, depth: 0xB48000, stroke: '#8a5a00' },
  green: { rim: 0x029357, light: 0x2FD792, face: 0x16BB77, depth: 0x046D41, stroke: '#04502f' },
  red: { rim: 0xCD0B2A, light: 0xFF627B, face: 0xEE2747, depth: 0x871023, stroke: '#6b0a1a' },
  blue: { rim: 0x167DA8, light: 0x36BDF7, face: 0x1C9FD7, depth: 0x146587, stroke: '#0e4a63' },
  grey: { rim: 0x989AAF, light: 0xFFFFFF, face: 0xDADCE7, depth: 0x666880, stroke: '#3f4152' },
  purple: { rim: 0x6D28D9, light: 0xB79CFB, face: 0x8B5CF6, depth: 0x4C1D95, stroke: '#3b0f7a' },
  wood: { rim: 0x6B3D17, light: 0xD9A066, face: 0xA8672F, depth: 0x3B230D, stroke: '#3b230d' },
  disabled: { rim: 0x9A9A9A, light: 0xD8D8D8, face: 0xBDBDBD, depth: 0x6F6F6F, stroke: '#555555' },
}

// Ahşap / parşömen tema renkleri (eski Tailwind tasarımıyla aynı tonlar).
export const COLORS = {
  woodDark: 0x3B230D,
  wood: 0x6B4724,
  woodMid: 0x8A5A2B,
  woodLight: 0xC18A56,
  parchment: 0xFFFAE8,
  parchmentMid: 0xFBF3D8,
  parchmentDark: 0xF0DDB0,
  cream: 0xFCEEC9,
  ink: '#3b230d',
  inkSoft: '#7a5a3a',
  white: '#ffffff',
  goldText: '#ffd84a',
  danger: 0xEE2747,
  success: 0x16BB77,
  energy: 0x36BDF7,
}

// Görsel efektlerde (patlama parçacıkları vb.) kullanılan meyve renkleri.
export const FRUIT_COLORS = {
  apple: 0xE53935,
  bamboo: 0x7CB342,
  banana: 0xFFD54F,
  berry: 0xE91E63,
  carrot: 0xFF8F00,
  cherry: 0xD32F2F,
  coconut: 0x8D6E63,
  grape: 0x9CCC65,
  lemon: 0xFFB300,
  orange: 0xFB8C00,
  pear: 0xFFCA28,
  pulm: 0x7B1FA2,
  strawberry: 0xF44336,
  watermelon: 0x43A047,
}

export const SCENES = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Game: 'Game',
  Settings: 'Settings',
  Shop: 'Shop',
  Inventory: 'Inventory',
  Orders: 'Orders',
  Cases: 'Cases',
  Purchase: 'Purchase',
  Overlay: 'Overlay',
}
