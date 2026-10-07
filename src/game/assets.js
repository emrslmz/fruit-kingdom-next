// Phaser doku anahtarı → dosya yolu (public/ altından).
// Büyük arka planlar ilgili sahnenin preload'unda tembel (lazy) yüklenir.

export const CORE_IMAGES = {
  logo: 'assets/images/logos/fruit_orders_text_logo.png',
  logo_big: 'assets/images/logos/fruit_kingdom_text_logo.png',
  bg_leaf: 'assets/backgrounds/leaf.png',
}

export const IMAGES = {
  // ikonlar
  ic_diamond: 'assets/icons/diamond_singular.png',
  ic_diamonds: 'assets/icons/diamond.png',
  ic_gold: 'assets/icons/gold_singular.png',
  ic_energy: 'assets/icons/flash.png',
  ic_star: 'assets/icons/star.png',
  ic_cog: 'assets/icons/cog.png',
  ic_shop: 'assets/icons/shop.png',
  ic_backpack: 'assets/icons/backpack.png',
  ic_order: 'assets/icons/order.png',
  ic_lock: 'assets/icons/lock.png',
  ic_home: 'assets/icons/home.png',
  ic_heart_broken: 'assets/icons/heart_broken.png',
  ic_reverse: 'assets/icons/reverse.png',
  ic_remove_ads: 'assets/icons/remove_ads.png',
  ic_gift: 'assets/icons/box_gift.png',
  ic_play: 'assets/icons/play.png',
  ic_announcement: 'assets/icons/announcement.png',
  ic_check: 'assets/icons/green_check.png',
  ic_crown: 'assets/icons2/crown.png',
  ic_cup: 'assets/icons2/cup_gold.png',
  ic_stopwatch: 'assets/icons2/stopwatch.png',
  ic_hand: 'assets/icons2/hand_arrow.png',
  ic_earth: 'assets/icons2/earth.png',
  ic_question: 'assets/icons2/question_box.png',
  sign_wood: 'assets/icons/wooden_sign.png',
  // rozetler
  badge_music: 'assets/badge/music_badge.png',
  badge_sound: 'assets/badge/sound_badge.png',
  badge_vibration: 'assets/badge/vibration_badge.png',
  badge_announcement: 'assets/badge/announcement_badge.png',
  badge_info: 'assets/badge/info_badge.png',
  badge_cog: 'assets/badge/cog_badge.png',
  badge_question: 'assets/badge/question_badge.png',
  badge_star: 'assets/badge/five_star_badge.png',
  // güçlendirmeler
  pu_dynamite: 'assets/power_ups/dynamite.png',
  pu_brush: 'assets/power_ups/brush.png',
  pu_tornado: 'assets/power_ups/tornado.png',
  // kasalar
  case_wood: 'assets/cases/wood_case.png',
  case_rustic: 'assets/cases/rustic_case.png',
  case_steel: 'assets/cases/steel_case.png',
  case_gear: 'assets/cases/gear_case.png',
  // paketler
  dia1: 'assets/diamond_packages/dia1.png',
  dia2: 'assets/diamond_packages/dia2.png',
  dia3: 'assets/diamond_packages/dia3.png',
  dia4: 'assets/diamond_packages/dia4.png',
  dia5: 'assets/diamond_packages/dia5.png',
  gold1: 'assets/gold_packages/gold1.png',
  gold2: 'assets/gold_packages/gold2.png',
  gold3: 'assets/gold_packages/gold3.png',
  // maskot
  mascot_happy: 'assets/mascot/stand_happy.png',
  mascot_thumbs: 'assets/mascot/stand_thumbs_up.png',
  mascot_sad: 'assets/mascot/stand_sad.png',
  mascot_think: 'assets/mascot/think.png',
  mascot_showing: 'assets/mascot/showing.png',
}

export const BACKGROUNDS = {
  bg_home: 'assets/backgrounds/home.png',
  bg_marble: 'assets/backgrounds/marble_side.png',
  bg_grass: 'assets/backgrounds/grass_side.png',
  bg_wood: 'assets/backgrounds/wooden.png',
  bg_market: 'assets/backgrounds/market_background.jpeg',
  bg_level: 'assets/backgrounds/level_side.png',
  bg_sand: 'assets/backgrounds/sand.png',
  bg_water: 'assets/backgrounds/water.png',
  bg_green: 'assets/backgrounds/green_deco.png',
  bg_orders: 'assets/backgrounds/order_side_clear.png',
  bg_forest: 'assets/backgrounds/forest2.png',
}

export const ATLASES = {
  game: { png: 'assets/sprites/game-atlas.png', json: 'assets/sprites/game-atlas.json' },
  chars: { png: 'assets/sprites/character-atlas.png', json: 'assets/sprites/character-atlas.json' },
}

export const FLAGS = ['ar', 'de', 'en', 'es', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'tr', 'uk', 'zh']

/** Karakter kimliği (playerStore.characters[].spriteName) → atlas karesi. */
export function characterFrame(spriteName) {
  return spriteName
}

/** Güçlendirme ikonu anahtarı. */
export function powerUpKey(id) {
  return `pu_${id}`
}

/** Kasa görseli (/assets/cases/xxx_case.png) → doku anahtarı. */
export function caseKey(imagePath) {
  const m = /cases\/(\w+)_case/.exec(imagePath || '')
  return m ? `case_${m[1]}` : 'case_wood'
}

/** Paket görseli (/assets/diamond_packages/dia1.png) → doku anahtarı. */
export function packageKey(imagePath) {
  const m = /\/(dia\d|gold\d)\.png/.exec(imagePath || '')
  if (m)
    return m[1]
  if ((imagePath || '').includes('box_gift'))
    return 'ic_gift'
  if ((imagePath || '').includes('remove_ads'))
    return 'ic_remove_ads'
  return 'ic_diamonds'
}

/** Arka plan anahtarı yüklü değilse sahnenin loader'ına ekler. */
export function queueBackground(scene, key) {
  if (!scene.textures.exists(key) && BACKGROUNDS[key])
    scene.load.image(key, BACKGROUNDS[key])
}
