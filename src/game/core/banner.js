import { admobService } from '@/core/services/admobService'
import { mobileService } from '@/core/services/MobileService'
import { drawVerticalFade } from '../ui/draw'
import { makeText } from '../ui/text'
import { player } from './services'

// Banner reklam alanı ("dock"): ekranın en altında, banner'ın gerçek yüksekliği
// kadar ayrılmış koyu ahşap bir şerit. Native banner bu şeridin üstüne oturur;
// ekranın geri kalanı (butonlar, tahta) bu alanın üstünde kalır.

const DEFAULT_HEIGHT = 60 // CSS px — gerçek yükseklik reklam yüklenince gelir
const MOCK_HEIGHT = 56

/** 'native' | 'mock' (geliştirme, web) | null (reklam yok) */
export function bannerMode() {
  if (player().settings.adsRemoved)
    return null
  if (mobileService.isNative)
    return 'native'
  return import.meta.env.DEV ? 'mock' : null
}

function cssHeight(mode) {
  if (!mode)
    return 0
  if (mode === 'mock')
    return MOCK_HEIGHT
  if (admobService.bannerStatus === 'failed')
    return 0
  return admobService.bannerHeight || DEFAULT_HEIGHT
}

/**
 * Banner'ı gösterir, alttaki şeridi çizer ve yüksekliğini (tasarım birimi) döner.
 * Banner'ın gerçek yüksekliği gelince (veya yüklenemezse) sahne yeniden kurulur.
 * @param {import('./BaseScene').default} scene
 */
export function setupBannerDock(scene) {
  const mode = bannerMode()
  const css = cssHeight(mode)
  if (!mode || !css)
    return 0
  const L = scene.L
  const h = css / L.ui
  const top = L.bottom - h

  const g = scene.add.graphics()
  g.fillStyle(0x1D1006).fillRect(0, top, L.dw, L.dh - top)
  drawVerticalFade(g, 0, top, L.dw, 10, 0x000000, 0.45, 0)
  g.fillStyle(0x3B230D).fillRect(0, top - 3, L.dw, 3)
  g.fillStyle(0xC18A56, 0.35).fillRect(0, top - 4, L.dw, 1)
  scene.root.addAt(g, 0)

  if (mode === 'mock') {
    const w = Math.min(L.dw - 16, 360)
    const box = scene.add.graphics()
    box.lineStyle(1.5, 0x8A5A2B, 0.9).strokeRoundedRect(L.cx - w / 2, top + 5, w, h - 10, 6)
    const label = makeText(scene, L.cx, top + h / 2, 'AdMob Banner (test)', { size: 14, color: '#c9a678', stroke: '#1d1006', strokeW: 3, shadowY: 1 })
    scene.root.add([box, label])
    return h
  }

  admobService.showBanner()
  const off = admobService.onBannerHeight((height, status) => {
    if (status === 'loading' || !scene.sys.isActive())
      return
    const next = status === 'failed' ? 0 : height
    if (Math.abs(next - css) > 3)
      scene.onResize()
  })
  scene.events.once('shutdown', off)
  return h
}
