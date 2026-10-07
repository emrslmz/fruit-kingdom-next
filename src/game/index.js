import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import CasesScene from './scenes/CasesScene'
import GameScene from './scenes/GameScene'
import InventoryScene from './scenes/InventoryScene'
import MenuScene from './scenes/MenuScene'
import OrdersScene from './scenes/OrdersScene'
import OverlayScene from './scenes/OverlayScene'
import PreloadScene from './scenes/PreloadScene'
import PurchaseScene from './scenes/PurchaseScene'
import SettingsScene from './scenes/SettingsScene'
import ShopScene from './scenes/ShopScene'

/**
 * Oyunu verilen DOM elemanını tamamen kaplayacak şekilde başlatır.
 *
 * Canvas, CSS boyutu × devicePixelRatio çözünürlükte oluşturulur ve
 * `zoom = 1/dpr` ile ekrana sığdırılır: telefon, tablet ve masaüstünde
 * bulanıklık olmadan, her boyutta tam ekran çalışır.
 *
 * @param {HTMLElement} parent
 * @param {{ appReady?: Promise<unknown> }} [options]
 */
export function createGame(parent, options = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const measure = () => ({
    w: Math.max(1, Math.round(parent.clientWidth * dpr)),
    h: Math.max(1, Math.round(parent.clientHeight * dpr)),
  })
  const { w, h } = measure()

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: w,
    height: h,
    backgroundColor: '#1d1006',
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / dpr,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
    input: {
      activePointers: 2,
    },
    disableContextMenu: true,
    banner: false,
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      GameScene,
      SettingsScene,
      ShopScene,
      InventoryScene,
      OrdersScene,
      CasesScene,
      PurchaseScene,
      OverlayScene, // listenin sonunda: her zaman en üstte çizilir
    ],
  })
  game.registry.set('dpr', dpr)
  game.registry.set('appReady', options.appReady ?? Promise.resolve())
  if (import.meta.env.DEV)
    window.__FK_GAME__ = game

  let timer = null
  const onResize = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const size = measure()
      if (size.w !== game.scale.width || size.h !== game.scale.height)
        game.scale.resize(size.w, size.h)
    }, 50)
  }
  const observer = new ResizeObserver(onResize)
  observer.observe(parent)
  window.addEventListener('orientationchange', onResize)
  window.visualViewport?.addEventListener('resize', onResize)

  return {
    game,
    destroy() {
      clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('orientationchange', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
      game.destroy(true)
    },
  }
}
