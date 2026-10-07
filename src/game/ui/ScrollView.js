import Phaser from 'phaser'

/**
 * Dikey kaydırılabilir alan (dokunmatik sürükleme + atalet + fare tekerleği).
 * `content` container'ına (0,0 = alanın sol üstü) öğe ekleyip
 * `setContentHeight(h)` çağır. İçerideki butonlar `register(obj)` ile
 * kaydedilirse alanın dışında kalan (maskelenmiş) kısımlarından tıklanamaz.
 */
export default class ScrollView {
  constructor(scene, parent, x, y, w, h) {
    this.scene = scene
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.contentHeight = h
    this.scrollY = 0
    this.velocity = 0
    this.dragging = false

    this.container = scene.add.container(x, y)
    parent.add(this.container)
    this.content = scene.add.container(0, 0)
    this.container.add(this.content)

    this.maskGraphics = scene.make.graphics({ add: false })
    this.updateMask()
    this.content.setMask(this.maskGraphics.createGeometryMask())

    this.onDown = (pointer) => {
      if (!this.containsPointer(pointer))
        return
      this.pointerId = pointer.id
      this.dragging = false
      this.startY = pointer.y
      this.startScroll = this.scrollY
      this.lastY = pointer.y
      this.lastT = scene.time.now
      this.velocity = 0
      this.tracking = true
    }
    this.onMove = (pointer) => {
      if (!this.tracking || pointer.id !== this.pointerId || !pointer.isDown)
        return
      const s = scene.L.s
      const dy = (pointer.y - this.startY) / s
      if (!this.dragging && Math.abs(pointer.y - this.startY) > 8 * (scene.L.dpr || 1))
        this.dragging = true
      if (!this.dragging)
        return
      let next = this.startScroll - dy
      const max = this.maxScroll
      if (next < 0)
        next *= 0.4
      else if (next > max)
        next = max + (next - max) * 0.4
      this.setScroll(next, false)
      const now = scene.time.now
      const dt = Math.max(1, now - this.lastT)
      this.velocity = (-(pointer.y - this.lastY) / s / dt) * 16
      this.lastY = pointer.y
      this.lastT = now
    }
    this.onUp = (pointer) => {
      if (pointer.id !== this.pointerId)
        return
      this.tracking = false
      this.dragging = false
    }
    this.onWheel = (pointer, _objs, _dx, dy) => {
      if (!this.containsPointer(pointer))
        return
      this.velocity = 0
      this.setScroll(this.scrollY + dy * 0.6)
    }

    scene.input.on('pointerdown', this.onDown)
    scene.input.on('pointermove', this.onMove)
    scene.input.on('pointerup', this.onUp)
    scene.input.on('pointerupoutside', this.onUp)
    scene.input.on('wheel', this.onWheel)
    scene.events.on('update', this.update, this)
    scene.events.once('shutdown', () => this.destroy())
  }

  get maxScroll() {
    return Math.max(0, this.contentHeight - this.h)
  }

  updateMask() {
    const s = this.scene.L.s
    const m = this.container.parentContainer?.getWorldTransformMatrix()
    const ox = m ? m.tx : 0
    const oy = m ? m.ty : 0
    this.maskGraphics.clear()
    this.maskGraphics.fillStyle(0xFFFFFF)
    this.maskGraphics.fillRect(ox + this.x * s, oy + this.y * s, this.w * s, this.h * s)
  }

  containsPointer(pointer) {
    const s = this.scene.L.s
    const m = this.container.parentContainer?.getWorldTransformMatrix()
    const ox = m ? m.tx : 0
    const oy = m ? m.ty : 0
    const x = (pointer.x - ox) / s
    const y = (pointer.y - oy) / s
    return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h
  }

  /** İçerideki etkileşimli öğeyi alan dışından tıklanmaya kapat. */
  register(obj) {
    obj.clipTest = pointer => this.containsPointer(pointer) && !this.dragging
    return obj
  }

  setContentHeight(h) {
    this.contentHeight = h
    this.setScroll(Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll), false)
  }

  setScroll(value, clamp = true) {
    this.scrollY = clamp ? Phaser.Math.Clamp(value, 0, this.maxScroll) : value
    this.content.y = -this.scrollY
  }

  scrollTo(value, duration = 300) {
    const target = Phaser.Math.Clamp(value, 0, this.maxScroll)
    const obj = { v: this.scrollY }
    this.scene.tweens.add({ targets: obj, v: target, duration, ease: 'Cubic.easeOut', onUpdate: () => this.setScroll(obj.v, false) })
  }

  update() {
    // ebeveyn hareket edebilir (modal açılış animasyonu vb.) — maskeyi eşitle
    const m = this.container.parentContainer?.getWorldTransformMatrix()
    const key = m ? `${m.tx}|${m.ty}` : '0|0'
    if (key !== this._maskKey) {
      this._maskKey = key
      this.updateMask()
    }
    if (this.tracking && this.dragging)
      return
    const max = this.maxScroll
    if (this.scrollY < 0 || this.scrollY > max) {
      const target = this.scrollY < 0 ? 0 : max
      this.velocity = 0
      const next = this.scrollY + (target - this.scrollY) * 0.2
      this.setScroll(Math.abs(next - target) < 0.5 ? target : next, false)
      return
    }
    if (Math.abs(this.velocity) > 0.05) {
      this.setScroll(this.scrollY + this.velocity, false)
      this.velocity *= 0.94
    }
  }

  destroy() {
    const input = this.scene.input
    input.off('pointerdown', this.onDown)
    input.off('pointermove', this.onMove)
    input.off('pointerup', this.onUp)
    input.off('pointerupoutside', this.onUp)
    input.off('wheel', this.onWheel)
    this.scene.events.off('update', this.update, this)
    this.maskGraphics.destroy()
  }
}
