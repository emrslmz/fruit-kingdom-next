import { COLORS } from '../config'

// Prosedürel çizim yardımcıları. Hepsi (0,0) merkezli çizer ve tasarım
// biriminde çalışır; vektör olduğundan her çözünürlükte keskindir.

function clampRadius(r, w, h) {
  return Math.max(0, Math.min(r, w / 2, h / 2))
}

/**
 * Kenney tarzı derinlikli buton gövdesi.
 * @param {Phaser.GameObjects.Graphics} g
 */
export function drawButtonShape(g, w, h, p, o = {}) {
  const shape = o.shape ?? 'rect'
  const depth = o.depth ?? Math.max(4, Math.round(h * 0.09))
  const d = o.pressed ? Math.max(1, depth * 0.3) : depth
  const faceH = h - depth
  const y0 = -h / 2 + (depth - d)
  const bw = o.border ?? Math.max(2, Math.round(Math.min(w, h) * 0.05))

  g.clear()
  if (shape === 'round') {
    const r = Math.min(w, faceH) / 2
    const cy = y0 + faceH / 2
    if (!o.flat) {
      g.fillStyle(0x000000, 0.18).fillEllipse(0, h / 2 - depth * 0.2, w * 0.92, depth * 2.2)
      g.fillStyle(p.depth).fillCircle(0, cy + d, r)
    }
    g.fillStyle(p.rim).fillCircle(0, cy, r)
    g.fillStyle(p.face).fillCircle(0, cy, r - bw)
    g.fillStyle(p.light, 0.75).fillEllipse(0, cy - r * 0.38, (r - bw) * 1.5, (r - bw) * 0.85)
    g.fillStyle(0xFFFFFF, 0.55).fillEllipse(-r * 0.42, cy - r * 0.5, r * 0.32, r * 0.2)
    return { faceCenterY: cy }
  }

  const r = clampRadius(o.radius ?? Math.min(18, h * 0.32), w, faceH)
  if (!o.flat) {
    g.fillStyle(0x000000, 0.2).fillRoundedRect(-w / 2 + 2, -h / 2 + depth + 2, w - 4, faceH, r)
    g.fillStyle(p.depth).fillRoundedRect(-w / 2, y0, w, faceH + d, r)
  }
  g.fillStyle(p.rim).fillRoundedRect(-w / 2, y0, w, faceH, r)
  const ir = clampRadius(r - bw, w - 2 * bw, faceH - 2 * bw)
  g.fillStyle(p.face).fillRoundedRect(-w / 2 + bw, y0 + bw, w - 2 * bw, faceH - 2 * bw, ir)
  // üst parlaklık bandı
  const glossH = (faceH - 2 * bw) * 0.46
  g.fillStyle(p.light, 0.7).fillRoundedRect(-w / 2 + bw + 2, y0 + bw + 2, w - 2 * bw - 4, glossH, { tl: Math.max(0, ir - 2), tr: Math.max(0, ir - 2), bl: Math.min(6, glossH / 2), br: Math.min(6, glossH / 2) })
  // küçük parıltı
  g.fillStyle(0xFFFFFF, 0.6).fillEllipse(-w / 2 + bw + Math.min(16, w * 0.12), y0 + bw + glossH * 0.45, Math.min(14, w * 0.08), Math.min(7, glossH * 0.35))
  return { faceCenterY: y0 + faceH / 2 }
}

/** Ahşap çerçeveli parşömen panel. */
export function drawPanel(g, w, h, o = {}) {
  const r = clampRadius(o.radius ?? 26, w, h)
  const fill = o.fill ?? COLORS.parchment
  g.clear()
  if (o.shadow !== false)
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 3, -h / 2 + 8, w, h, r)
  g.fillStyle(o.border ?? COLORS.woodDark).fillRoundedRect(-w / 2, -h / 2, w, h, r)
  g.fillStyle(o.inner ?? COLORS.woodMid).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, clampRadius(r - 4, w, h))
  g.fillStyle(o.innerShade ?? COLORS.parchmentDark).fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, clampRadius(r - 8, w, h))
  g.fillStyle(fill).fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 20, clampRadius(r - 8, w, h))
  g.fillStyle(0xFFFFFF, 0.35).fillRoundedRect(-w / 2 + 14, -h / 2 + 12, w - 28, Math.min(18, h * 0.08), 8)
}

/** Panel içindeki açık renkli kart/satır. */
export function drawCard(g, x, y, w, h, o = {}) {
  const r = clampRadius(o.radius ?? 16, w, h)
  g.fillStyle(o.shade ?? 0xD9BF8C, o.shadeAlpha ?? 1).fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, r)
  g.fillStyle(o.border ?? 0x6B4724).fillRoundedRect(x - w / 2, y - h / 2, w, h, r)
  g.fillStyle(o.fill ?? COLORS.cream).fillRoundedRect(x - w / 2 + 2.5, y - h / 2 + 2.5, w - 5, h - 5, clampRadius(r - 2.5, w, h))
}

/** Ahşap tahta (başlık şeridi, sepet zemini). */
export function drawPlank(g, w, h, o = {}) {
  const r = clampRadius(o.radius ?? 16, w, h)
  g.clear()
  if (o.shadow !== false)
    g.fillStyle(0x000000, 0.28).fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, r)
  g.fillStyle(COLORS.woodDark).fillRoundedRect(-w / 2, -h / 2, w, h, r)
  g.fillStyle(0x8A5A2B).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, clampRadius(r - 3, w, h))
  g.fillStyle(0xA8672F).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, (h - 6) * 0.55, { tl: clampRadius(r - 3, w, h), tr: clampRadius(r - 3, w, h), bl: 0, br: 0 })
  // tahta damarları
  g.lineStyle(1.5, 0x6B3D17, 0.45)
  const lines = Math.max(2, Math.floor(h / 14))
  for (let i = 1; i <= lines; i++) {
    const y = -h / 2 + (h / (lines + 1)) * i
    g.beginPath()
    g.moveTo(-w / 2 + 10, y)
    const segs = 6
    for (let s = 1; s <= segs; s++) {
      const x = -w / 2 + 10 + ((w - 20) / segs) * s
      g.lineTo(x, y + Math.sin(s * 1.7 + i) * 1.6)
    }
    g.strokePath()
  }
  g.fillStyle(0xFFFFFF, 0.18).fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, Math.min(5, h * 0.12), 3)
  if (o.nails !== false && w > 80) {
    for (const nx of [-w / 2 + 12, w / 2 - 12]) {
      g.fillStyle(0x3B230D).fillCircle(nx, 0, 3.4)
      g.fillStyle(0xD9A066).fillCircle(nx - 0.6, -0.6, 1.6)
    }
  }
}

/** Yarı saydam koyu hap (pill) — sayaç/rozet zemini. */
export function drawPill(g, x, y, w, h, o = {}) {
  const r = h / 2
  g.fillStyle(o.border ?? 0x2B180A, o.borderAlpha ?? 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, r)
  g.fillStyle(o.fill ?? 0x4A2E1B, o.alpha ?? 1).fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, r - 2)
  if (o.gloss !== false)
    g.fillStyle(0xFFFFFF, 0.12).fillRoundedRect(x - w / 2 + 6, y - h / 2 + 3, w - 12, (h - 6) * 0.4, (h - 6) * 0.2)
}

/** Sepet slotu gibi içe gömük yuva. */
export function drawSlot(g, x, y, size, o = {}) {
  const r = o.radius ?? size * 0.22
  g.fillStyle(o.edge ?? 0x2B180A, 0.9).fillRoundedRect(x - size / 2, y - size / 2, size, size, r)
  g.fillStyle(o.fill ?? 0x5A3A22).fillRoundedRect(x - size / 2 + 2, y - size / 2 + 3, size - 4, size - 5, r - 1)
  g.fillStyle(0x000000, 0.18).fillRoundedRect(x - size / 2 + 2, y - size / 2 + 3, size - 4, size * 0.25, { tl: r - 1, tr: r - 1, bl: 0, br: 0 })
}

/** Tam ekran dikey gradyan karartma (üst/alt kenarlarda okunabilirlik için). */
export function drawVerticalFade(g, x, y, w, h, color, fromAlpha, toAlpha, steps = 16) {
  const stepH = h / steps
  for (let i = 0; i < steps; i++) {
    const a = fromAlpha + (toAlpha - fromAlpha) * (i / (steps - 1))
    g.fillStyle(color, a).fillRect(x, y + i * stepH, w, stepH + 0.5)
  }
}

/** Yıldız şekli (dolgu). */
export function fillStar(g, x, y, points, outer, inner, rotation = -Math.PI / 2) {
  const pts = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = rotation + (Math.PI * i) / points
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r })
  }
  g.fillPoints(pts, true)
}
