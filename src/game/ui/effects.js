import Phaser from 'phaser'
import { makeText } from './text'

// Oyun genelindeki "juice" efektleri: patlama parçacıkları, uçan yazılar,
// dönen ışık huzmesi, konfeti. Hepsi verilen container içinde tasarım
// biriminde çalışır.

/** Boot sırasında üretilen efekt dokuları. */
export function createFxTextures(scene) {
  if (!scene.textures.exists('fx_vignette')) {
    // kenarlara doğru koyulaşan beyaz hale (tint ile renklenir, ekrana gerilir)
    const tex = scene.textures.createCanvas('fx_vignette', 128, 128)
    const ctx = tex.getContext()
    const grd = ctx.createRadialGradient(64, 64, 36, 64, 64, 92)
    grd.addColorStop(0, 'rgba(255,255,255,0)')
    grd.addColorStop(0.6, 'rgba(255,255,255,0.35)')
    grd.addColorStop(1, 'rgba(255,255,255,0.85)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 128, 128)
    tex.refresh()
  }
  const g = scene.make.graphics({ add: false })
  if (!scene.textures.exists('fx_dot')) {
    g.clear().fillStyle(0xFFFFFF).fillCircle(16, 16, 16)
    g.generateTexture('fx_dot', 32, 32)
  }
  if (!scene.textures.exists('fx_glow')) {
    g.clear()
    for (let i = 0; i < 16; i++) {
      g.fillStyle(0xFFFFFF, 0.07 + i * 0.012)
      g.fillCircle(32, 32, 32 - i * 2)
    }
    g.generateTexture('fx_glow', 64, 64)
  }
  if (!scene.textures.exists('fx_star')) {
    g.clear().fillStyle(0xFFFFFF)
    const pts = []
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 24 : 10
      const a = -Math.PI / 2 + (Math.PI * i) / 5
      pts.push({ x: 24 + Math.cos(a) * r, y: 24 + Math.sin(a) * r })
    }
    g.fillPoints(pts, true)
    g.generateTexture('fx_star', 48, 48)
  }
  if (!scene.textures.exists('fx_sparkle')) {
    g.clear().fillStyle(0xFFFFFF)
    g.fillPoints([{ x: 24, y: 0 }, { x: 28, y: 20 }, { x: 48, y: 24 }, { x: 28, y: 28 }, { x: 24, y: 48 }, { x: 20, y: 28 }, { x: 0, y: 24 }, { x: 20, y: 20 }], true)
    g.generateTexture('fx_sparkle', 48, 48)
  }
  if (!scene.textures.exists('fx_confetti')) {
    g.clear().fillStyle(0xFFFFFF).fillRect(0, 0, 14, 8)
    g.generateTexture('fx_confetti', 14, 8)
  }
  if (!scene.textures.exists('fx_drop')) {
    g.clear().fillStyle(0xFFFFFF)
    g.fillCircle(12, 18, 10)
    g.fillTriangle(3, 15, 21, 15, 12, 0)
    g.generateTexture('fx_drop', 24, 28)
  }
  if (!scene.textures.exists('fx_shard')) {
    g.clear().fillStyle(0xFFFFFF)
    g.fillTriangle(0, 0, 22, 6, 6, 20)
    g.generateTexture('fx_shard', 22, 20)
  }
  if (!scene.textures.exists('fx_leaf')) {
    g.clear().fillStyle(0xFFFFFF)
    g.fillEllipse(14, 8, 26, 12)
    g.generateTexture('fx_leaf', 28, 16)
  }
  g.destroy()
}

/** Tek seferlik parçacık patlaması. */
export function burst(scene, parent, x, y, o = {}) {
  const emitter = scene.add.particles(x, y, o.texture ?? 'fx_dot', {
    speed: o.speed ?? { min: 80, max: 260 },
    angle: o.angle ?? { min: 0, max: 360 },
    scale: o.scale ?? { start: 0.45, end: 0 },
    alpha: o.alpha ?? { start: 1, end: 0 },
    lifespan: o.lifespan ?? { min: 350, max: 700 },
    gravityY: o.gravityY ?? 300,
    rotate: o.rotate ?? 0,
    tint: o.tint ?? 0xFFFFFF,
    blendMode: o.blendMode ?? Phaser.BlendModes.NORMAL,
    emitting: false,
  })
  parent?.add(emitter)
  emitter.explode(o.count ?? 16)
  scene.time.delayedCall(1600, () => emitter.destroy())
  return emitter
}

/** Meyve sıkma patlaması: meyve renginde damlalar + beyaz parıltılar. */
export function juiceBurst(scene, parent, x, y, color, size = 1) {
  burst(scene, parent, x, y, { texture: 'fx_drop', tint: color, count: 14, speed: { min: 120 * size, max: 320 * size }, scale: { start: 0.7 * size, end: 0.1 }, gravityY: 600, rotate: { min: 0, max: 360 } })
  burst(scene, parent, x, y, { texture: 'fx_dot', tint: color, count: 10, speed: { min: 60, max: 200 * size }, scale: { start: 0.5 * size, end: 0 }, gravityY: 200 })
  burst(scene, parent, x, y, { texture: 'fx_sparkle', tint: 0xFFFFFF, count: 6, speed: { min: 40, max: 140 }, scale: { start: 0.55 * size, end: 0 }, gravityY: 0, lifespan: 500, blendMode: Phaser.BlendModes.ADD })
  const ring = scene.add.circle(x, y, 10 * size, 0xFFFFFF, 0)
  ring.setStrokeStyle(5, color, 0.9)
  parent?.add(ring)
  scene.tweens.add({ targets: ring, radius: 46 * size, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() })
}

/** Yukarı süzülüp kaybolan yazı ("+3", "Harika!" ...). */
export function floatText(scene, parent, x, y, str, o = {}) {
  const t = makeText(scene, x, y, str, { size: o.size ?? 28, color: o.color ?? '#ffffff', stroke: o.stroke ?? '#582E00', strokeW: o.strokeW, shadowY: o.shadowY })
  parent?.add(t)
  t.setScale(0.3)
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' })
  scene.tweens.add({ targets: t, y: y - (o.rise ?? 60), alpha: 0, delay: o.hold ?? 450, duration: 600, ease: 'Cubic.easeIn', onComplete: () => t.destroy() })
  return t
}

/** Arkada dönen ışık huzmeleri (ödül ekranları). */
export function sunburst(scene, parent, x, y, radius, o = {}) {
  const g = scene.add.graphics({ x, y })
  const rays = o.rays ?? 14
  g.fillStyle(o.color ?? 0xFFF3B0, o.alpha ?? 0.35)
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays
    const w = Math.PI / rays * 0.55
    g.fillTriangle(0, 0, Math.cos(a - w) * radius, Math.sin(a - w) * radius, Math.cos(a + w) * radius, Math.sin(a + w) * radius)
  }
  parent?.add(g)
  scene.tweens.add({ targets: g, angle: 360, duration: o.duration ?? 14000, repeat: -1 })
  return g
}

/** Ekranın üstünden yağan renkli konfeti. */
export function confettiRain(scene, parent, width, o = {}) {
  const colors = [0xFF4D6D, 0xFFD60A, 0x4CC9F0, 0x80ED99, 0xC77DFF, 0xFF9F1C]
  const emitter = scene.add.particles(0, o.y ?? -20, 'fx_confetti', {
    x: { min: 0, max: width },
    speedY: { min: 140, max: 320 },
    speedX: { min: -80, max: 80 },
    rotate: { start: 0, end: 720 },
    scaleX: { min: 0.6, max: 1.2 },
    scaleY: { min: 0.6, max: 1.2 },
    lifespan: o.lifespan ?? 4200,
    gravityY: 60,
    tint: colors,
    frequency: o.frequency ?? 30,
    quantity: 2,
  })
  parent?.add(emitter)
  scene.time.delayedCall(o.duration ?? 2200, () => emitter.stop())
  scene.time.delayedCall((o.duration ?? 2200) + 4500, () => emitter.destroy())
  return emitter
}

/** Bir objeyi kısa süre sallar (hata/uyarı). */
export function shake(scene, target, o = {}) {
  const x = target.x
  scene.tweens.killTweensOf(target)
  target.x = x
  scene.tweens.add({
    targets: target,
    x: { from: x - (o.amount ?? 6), to: x + (o.amount ?? 6) },
    duration: 50,
    yoyo: true,
    repeat: o.repeat ?? 3,
    onComplete: () => { target.x = x },
  })
}

/** Hafif "nefes alma" (idle) animasyonu. */
export function breathe(scene, target, amount = 0.04, duration = 1400) {
  const sx = target.scaleX
  const sy = target.scaleY
  return scene.tweens.add({
    targets: target,
    scaleX: sx * (1 + amount),
    scaleY: sy * (1 - amount * 0.6),
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

/** Yukarı-aşağı süzülme. */
export function bob(scene, target, amount = 6, duration = 1600) {
  return scene.tweens.add({
    targets: target,
    y: target.y - amount,
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

/** İkonu bir noktadan diğerine yay çizerek uçurur (ödül toplama). */
export function flyArc(scene, obj, toX, toY, o = {}) {
  const fromX = obj.x
  const fromY = obj.y
  const ctrlX = (fromX + toX) / 2 + (o.curve ?? 0)
  const ctrlY = Math.min(fromY, toY) - (o.lift ?? 80)
  const startScale = obj.scale
  const endScale = o.endScale ?? startScale
  const p = { t: 0 }
  return scene.tweens.add({
    targets: p,
    t: 1,
    delay: o.delay ?? 0,
    duration: o.duration ?? 600,
    ease: o.ease ?? 'Sine.easeInOut',
    onUpdate: () => {
      const t = p.t
      const it = 1 - t
      obj.x = it * it * fromX + 2 * it * t * ctrlX + t * t * toX
      obj.y = it * it * fromY + 2 * it * t * ctrlY + t * t * toY
      obj.setScale(startScale + (endScale - startScale) * t)
      if (o.spin)
        obj.rotation = o.spin * t
    },
    onComplete: () => o.onComplete?.(),
  })
}
