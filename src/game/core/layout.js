import Phaser from 'phaser'
import { DESIGN } from '../config'

// Ekran ölçüleri → tasarım birimi dönüşümü.
//
// Canvas, cihaz piksel oranında (devicePixelRatio) çizilir; bu yüzden metin
// ve vektör çizimler retina ekranlarda bile keskin kalır. Sahneler UI'ı
// `root` adlı, `L.s` ile ölçeklenmiş bir container içine tasarım biriminde
// kurar — yani bir butona "120 genişlik" demek her cihazda aynı fiziksel
// oranda görünmek demektir.

let safeAreaCache = null

/** CSS env(safe-area-inset-*) değerlerini (CSS px) okur. */
export function readSafeArea(force = false) {
  if (safeAreaCache && !force)
    return safeAreaCache
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
  ].join(';')
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  safeAreaCache = {
    top: Number.parseFloat(cs.paddingTop) || 0,
    right: Number.parseFloat(cs.paddingRight) || 0,
    bottom: Number.parseFloat(cs.paddingBottom) || 0,
    left: Number.parseFloat(cs.paddingLeft) || 0,
  }
  probe.remove()
  return safeAreaCache
}

/**
 * @typedef {object} Layout
 * @property {number} W  canvas genişliği (cihaz pikseli)
 * @property {number} H  canvas yüksekliği (cihaz pikseli)
 * @property {number} dpr devicePixelRatio (en fazla 3)
 * @property {number} s  1 tasarım biriminin cihaz pikseli karşılığı
 * @property {number} dw ekran genişliği (tasarım birimi)
 * @property {number} dh ekran yüksekliği (tasarım birimi)
 * @property {number} cx ekran ortası x (tasarım birimi)
 * @property {number} cy ekran ortası y (tasarım birimi)
 * @property {number} top     güvenli alan üst sınırı (tasarım birimi)
 * @property {number} bottom  güvenli alan alt sınırı (tasarım birimi)
 * @property {number} colW    içerik sütunu genişliği
 * @property {number} colX    içerik sütununun sol kenarı
 * @property {boolean} landscape ekran yatay mı
 */

/** @returns {Layout} sahnenin o anki ekran düzeni */
export function computeLayout(scene) {
  const dpr = scene.game.registry.get('dpr') || 1
  const W = scene.scale.width
  const H = scene.scale.height
  const cssW = W / dpr
  const cssH = H / dpr
  const ui = Phaser.Math.Clamp(Math.min(cssW / DESIGN.width, cssH / DESIGN.height), 0.6, 1.6)
  const s = ui * dpr
  const dw = W / s
  const dh = H / s
  const safe = readSafeArea()

  const safeTop = safe.top / ui
  const safeBottom = safe.bottom / ui
  const safeLeft = safe.left / ui
  const safeRight = safe.right / ui
  const colW = Math.min(dw - safeLeft - safeRight, DESIGN.maxColumn)

  return {
    W,
    H,
    dpr,
    ui,
    s,
    dw,
    dh,
    cx: dw / 2,
    cy: dh / 2,
    safeTop,
    safeBottom,
    top: safeTop,
    bottom: dh - safeBottom,
    colW,
    colX: (dw - colW) / 2,
    landscape: cssW > cssH * 1.15,
  }
}
