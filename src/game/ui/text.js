import { FONT } from '../config'

/**
 * Oyun tarzı (kontürlü + gölgeli) metin. Tasarım biriminde boyutlanır ve
 * sahnenin ölçeğinde (L.s) render edilir, böylece retina ekranda da keskindir.
 *
 * @param {Phaser.Scene & {L: object}} scene
 * @param {number} x
 * @param {number} y
 * @param {string} str
 * @param {object} [o]
 */
export function makeText(scene, x, y, str, o = {}) {
  const size = o.size ?? 22
  const stroke = o.stroke === undefined ? '#582E00' : o.stroke
  const strokeW = stroke ? (o.strokeW ?? Math.max(2, size * 0.16)) : 0
  const shadowY = o.shadow === false ? 0 : (o.shadowY ?? Math.max(1, size * 0.1))
  const style = {
    fontFamily: o.font ?? FONT,
    fontSize: `${size}px`,
    color: o.color ?? '#ffffff',
    align: o.align ?? 'center',
    resolution: Math.max(1, Math.min(scene.L?.s ?? 1, 5)),
    padding: { x: Math.ceil(strokeW + 2), y: Math.ceil(strokeW + shadowY + 2) },
  }
  if (stroke) {
    style.stroke = stroke
    style.strokeThickness = strokeW
  }
  if (shadowY && (o.shadowColor || stroke)) {
    style.shadow = {
      offsetX: 0,
      offsetY: shadowY,
      color: o.shadowColor ?? stroke,
      blur: 0,
      stroke: true,
      fill: true,
    }
  }
  if (o.wrap)
    style.wordWrap = { width: o.wrap, useAdvancedWrap: true }
  if (o.lineSpacing !== undefined)
    style.lineSpacing = o.lineSpacing

  const text = scene.add.text(x, y, str, style)
  text.setOrigin(o.originX ?? 0.5, o.originY ?? 0.5)
  if (o.maxWidth)
    fitText(text, o.maxWidth, o.maxHeight)
  return text
}

/** Koyu mürekkep renginde, kontürsüz gövde metni (parşömen paneller için). */
export function inkText(scene, x, y, str, o = {}) {
  return makeText(scene, x, y, str, {
    color: '#3b230d',
    stroke: null,
    shadow: false,
    ...o,
  })
}

/** Metni verilen genişliğe (ve isteğe bağlı yüksekliğe) sığacak şekilde küçültür. */
export function fitText(text, maxWidth, maxHeight) {
  text.setScale(1)
  const w = text.width
  const h = text.height
  let scale = 1
  if (maxWidth && w > maxWidth)
    scale = Math.min(scale, maxWidth / w)
  if (maxHeight && h > maxHeight)
    scale = Math.min(scale, maxHeight / h)
  text.setScale(scale)
  return text
}

/** Metni değiştirip yeniden sığdırır. */
export function setFitText(text, str, maxWidth, maxHeight) {
  text.setText(str)
  return fitText(text, maxWidth, maxHeight)
}
