import Phaser from 'phaser'
import { CORE_IMAGES } from '../assets'
import { SCENES } from '../config'
import { createFxTextures } from '../ui/effects'

async function waitForFonts(timeout = 3000) {
  if (!document.fonts?.load)
    return
  const loads = ['Agu', 'LuckiestGuy'].map(f => document.fonts.load(`32px ${f}`).catch(() => null))
  await Promise.race([
    Promise.all(loads),
    new Promise(resolve => setTimeout(resolve, timeout)),
  ])
}

/** En küçük açılış sahnesi: font + yükleme ekranı görselleri. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot)
  }

  preload() {
    for (const [key, path] of Object.entries(CORE_IMAGES))
      this.load.image(key, path)
  }

  create() {
    createFxTextures(this)
    this.scene.launch(SCENES.Overlay)
    waitForFonts().then(() => this.scene.start(SCENES.Preload))
  }
}
