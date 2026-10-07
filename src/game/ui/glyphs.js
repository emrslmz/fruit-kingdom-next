// Butonların üzerinde kullanılan basit vektör semboller (x, +, -, ‖, ←, ✓, i, ↻).
// (0,0) merkezli, `size` kutusuna sığacak şekilde çizilir.

function bar(g, cx, cy, len, thick, angle) {
  const hw = len / 2
  const ht = thick / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const pts = [[-hw, -ht], [hw, -ht], [hw, ht], [-hw, ht]].map(([x, y]) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos }))
  g.fillPoints(pts, true)
  g.fillCircle(cx + hw * cos, cy + hw * sin, ht)
  g.fillCircle(cx - hw * cos, cy - hw * sin, ht)
}

function shape(g, kind, s) {
  const t = s * 0.2
  switch (kind) {
    case 'x':
      bar(g, 0, 0, s * 0.62, t, Math.PI / 4)
      bar(g, 0, 0, s * 0.62, t, -Math.PI / 4)
      break
    case 'plus':
      bar(g, 0, 0, s * 0.62, t, 0)
      bar(g, 0, 0, s * 0.62, t, Math.PI / 2)
      break
    case 'minus':
      bar(g, 0, 0, s * 0.62, t, 0)
      break
    case 'pause':
      g.fillRoundedRect(-s * 0.26, -s * 0.3, s * 0.18, s * 0.6, s * 0.06)
      g.fillRoundedRect(s * 0.08, -s * 0.3, s * 0.18, s * 0.6, s * 0.06)
      break
    case 'back':
      bar(g, s * 0.06, 0, s * 0.5, t, 0)
      bar(g, -s * 0.1, -s * 0.13, s * 0.34, t, -Math.PI / 4)
      bar(g, -s * 0.1, s * 0.13, s * 0.34, t, Math.PI / 4)
      break
    case 'check':
      bar(g, -s * 0.14, s * 0.08, s * 0.3, t, Math.PI / 4)
      bar(g, s * 0.08, -s * 0.02, s * 0.5, t, -Math.PI / 3.2)
      break
    case 'info':
      g.fillCircle(0, -s * 0.24, t * 0.7)
      g.fillRoundedRect(-t / 2, -s * 0.08, t, s * 0.38, t * 0.4)
      break
    case 'play':
      g.fillTriangle(-s * 0.18, -s * 0.28, -s * 0.18, s * 0.28, s * 0.3, 0)
      break
    case 'refresh': {
      const r = s * 0.26
      for (let i = 0; i <= 18; i++) {
        const a = -Math.PI * 0.15 + (Math.PI * 1.55 * i) / 18
        g.fillCircle(Math.cos(a) * r, Math.sin(a) * r, t / 2)
      }
      const a = -Math.PI * 0.15
      const ax = Math.cos(a) * r
      const ay = Math.sin(a) * r
      g.fillTriangle(ax - s * 0.14, ay - s * 0.02, ax + s * 0.12, ay - s * 0.05, ax + s * 0.02, ay + s * 0.18)
      break
    }
    case 'home':
      g.fillTriangle(-s * 0.32, -s * 0.02, s * 0.32, -s * 0.02, 0, -s * 0.32)
      g.fillRect(-s * 0.22, -s * 0.04, s * 0.44, s * 0.32)
      break
    default:
      break
  }
}

/**
 * @param {Phaser.GameObjects.Graphics} g
 * @param {string} kind
 * @param {number} size
 */
export function drawGlyph(g, kind, size, o = {}) {
  const offset = Math.max(1.2, size * 0.05)
  g.save()
  g.translateCanvas(0, offset)
  g.fillStyle(o.shadow ?? 0x000000, o.shadowAlpha ?? 0.28)
  shape(g, kind, size)
  g.restore()
  g.fillStyle(o.color ?? 0xFFFFFF, 1)
  shape(g, kind, size)
}
