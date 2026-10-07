import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import Phaser from 'phaser'
import { watch } from 'vue'
import { admobService } from '@/core/services/admobService'
import { alertService } from '@/core/services/alertService'
import { toastService } from '@/core/services/ToastService'
import { SCENES } from '../config'
import { computeLayout } from '../core/layout'
import { bus, t } from '../core/services'
import Button from '../ui/Button'
import { drawPill } from '../ui/draw'
import { drawGlyph } from '../ui/glyphs'
import Modal from '../ui/Modal'
import { fitText, inkText, makeText } from '../ui/text'

const TOAST_COLORS = {
  success: { fill: 0x0F6B45, border: 0x07452C, glyph: 'check', dot: 0x16BB77 },
  error: { fill: 0x8F1426, border: 0x5C0B18, glyph: 'x', dot: 0xEE2747 },
  warning: { fill: 0x8A5A00, border: 0x5A3A00, glyph: 'info', dot: 0xFFCC00 },
  info: { fill: 0x0E4A63, border: 0x07303F, glyph: 'info', dot: 0x1C9FD7 },
}

/**
 * Her zaman en üstte çalışan sahne: sahne geçiş perdesi, toast mesajları,
 * alertService diyalogları, geri tuşu ve uygulama arka plana geçişi.
 */
export default class OverlayScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Overlay)
  }

  create() {
    this.modals = []
    this.layout()
    this.scale.on('resize', () => {
      clearTimeout(this._rt)
      this._rt = setTimeout(() => this.layout(), 100)
    })

    this.stopToastWatch = watch(() => toastService.toast.value, (toast) => {
      if (toast?.isVisible && toast.message)
        this.showToast(toast.message, toast.type)
    }, { deep: true })

    this.stopAlertWatch = watch(() => alertService.alert.isVisible, (visible) => {
      if (visible)
        this.showAlert()
      else
        this.alertModal?.close(false)
    })

    // Geliştirmede (web) gerçek reklam yok: akışları test etmek için sahte reklam ekranı
    if (import.meta.env.DEV)
      admobService.setWebPresenter(kind => this.showMockAd(kind))

    this.input.keyboard?.on('keydown-ESC', () => this.back())
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => this.back())
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive)
          bus.emit('app:pause')
      })
    }
  }

  layout() {
    this.L = computeLayout(this)
    if (!this.root) {
      this.root = this.add.container(0, 0)
      this.modalLayer = this.add.container(0, 0).setDepth(10)
      this.toastLayer = this.add.container(0, 0).setDepth(20)
    }
    this.root.setScale(this.L.s)
    this.modalLayer.setScale(this.L.s)
    this.toastLayer.setScale(this.L.s)
  }

  back() {
    if (this.curtain || this.blocker)
      return
    if (this.alertModal && !this.alertModal.closed) {
      alertService.alert.onCancel?.()
      return
    }
    bus.emit('app:back')
  }

  // ---------------------------------------------------------------------------
  // Sahne geçişi
  // ---------------------------------------------------------------------------
  transition(onCovered) {
    const L = this.L
    if (this.curtain) {
      onCovered()
      return
    }
    const curtain = this.add.container(0, 0).setDepth(30)
    const rect = this.add.rectangle(0, 0, L.W, L.H, 0x1D1006, 1).setOrigin(0).setInteractive()
    curtain.add(rect)
    const icon = this.textures.exists('game-atlas')
      ? this.add.image(L.W / 2, L.H / 2, 'game-atlas', `${Phaser.Utils.Array.GetRandom(['apple', 'strawberry', 'orange', 'grape', 'cherry', 'watermelon'])}.png`)
      : null
    if (icon) {
      icon.setScale((54 * L.s) / icon.width)
      curtain.add(icon)
      this.tweens.add({ targets: icon, angle: 360, duration: 900, repeat: -1 })
    }
    this.curtain = curtain
    curtain.setAlpha(0)
    this.tweens.add({
      targets: curtain,
      alpha: 1,
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onCovered()
        this.time.delayedCall(90, () => {
          this.tweens.add({
            targets: curtain,
            alpha: 0,
            duration: 260,
            ease: 'Quad.easeIn',
            onComplete: () => {
              curtain.destroy()
              this.curtain = null
            },
          })
        })
      },
    })
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
  showToast(message, type = 'info') {
    const L = this.L
    const cfg = TOAST_COLORS[type] || TOAST_COLORS.info
    if (this.toast) {
      const old = this.toast
      this.tweens.add({ targets: old, alpha: 0, y: old.y - 20, duration: 150, onComplete: () => old.destroy() })
    }
    const maxW = Math.min(L.colW - 32, 380)
    const c = this.add.container(L.cx, L.top + 92)
    const text = makeText(this, 0, 0, message, { size: 18, wrap: maxW - 74, stroke: '#1a0d04', strokeW: 3, shadowY: 2 })
    fitText(text, maxW - 74, 80)
    const h = Math.max(48, text.displayHeight + 18)
    const w = Math.min(maxW, Math.max(180, text.displayWidth + 74))
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, h / 2)
    drawPill(g, 0, 0, w, h, { fill: cfg.fill, border: cfg.border })
    const dot = this.add.graphics()
    dot.fillStyle(0xFFFFFF).fillCircle(0, 0, 15)
    dot.fillStyle(cfg.dot).fillCircle(0, 0, 13)
    drawGlyph(dot, cfg.glyph, 22)
    dot.x = -w / 2 + 26
    text.x = 14
    c.add([g, dot, text])
    this.toastLayer.add(c)
    this.toast = c

    c.setScale(0.6).setAlpha(0)
    c.y -= 24
    this.tweens.add({ targets: c, scale: 1, alpha: 1, y: c.y + 24, duration: 320, ease: 'Back.easeOut' })
    this.time.delayedCall(Math.max(1600, Math.min(4000, message.length * 70)), () => {
      if (this.toast !== c)
        return
      this.tweens.add({
        targets: c,
        alpha: 0,
        y: c.y - 16,
        duration: 260,
        onComplete: () => {
          c.destroy()
          if (this.toast === c)
            this.toast = null
        },
      })
    })
  }

  // ---------------------------------------------------------------------------
  // alertService diyalogları
  // ---------------------------------------------------------------------------
  showAlert() {
    const a = alertService.alert
    this.alertModal?.layer?.destroy()
    const L = this.L
    const w = Math.min(340, L.colW - 30)
    const message = a.message || ''
    const probe = inkText(this, 0, 0, message, { size: 19, wrap: w - 60 })
    const msgH = message ? probe.height : 0
    probe.destroy()
    const hasCancel = !!a.cancelButtonText
    const h = Math.min(L.dh - 80, 150 + msgH + (hasCancel ? 70 : 0))

    const modal = new Modal(this, {
      w,
      h,
      title: a.title || t('are_you_sure'),
      color: 'wood',
      closable: hasCancel,
      onClose: (result) => {
        if (this.alertModal === modal)
          this.alertModal = null
        if (!result && alertService.alert.isVisible)
          alertService.alert.onCancel?.()
      },
    })
    this.alertModal = modal
    let y = modal.innerTop + 14
    if (message) {
      const msg = inkText(this, 0, y, message, { size: 19, wrap: w - 60, originY: 0, lineSpacing: 4 })
      modal.body.add(msg)
      y += msg.height + 20
    }
    const btnW = w - 70
    let by = modal.innerBottom - 30 - (hasCancel ? 64 : 0)
    const confirm = new Button(this, 0, by, {
      w: btnW,
      h: 56,
      color: 'green',
      label: a.confirmButtonText || t('ok'),
      onClick: () => {
        modal.close(true)
        alertService.alert.onConfirm?.()
      },
    })
    modal.body.add(confirm)
    if (hasCancel) {
      by += 64
      const cancel = new Button(this, 0, by, {
        w: btnW,
        h: 52,
        color: 'red',
        label: a.cancelButtonText,
        onClick: () => modal.close(false),
      })
      modal.body.add(cancel)
    }
  }

  // ---------------------------------------------------------------------------
  // Reklam yükleniyor göstergesi
  // ---------------------------------------------------------------------------
  showLoading(text) {
    this.hideLoading()
    const L = this.L
    const c = this.add.container(0, 0).setDepth(25)
    const dim = this.add.rectangle(0, 0, L.dw, L.dh, 0x000000, 0.55).setOrigin(0).setInteractive()
    const spinner = this.add.graphics()
    spinner.lineStyle(7, 0xFFFFFF, 0.25).strokeCircle(0, 0, 26)
    spinner.lineStyle(7, 0xFFD84A, 1).beginPath().arc(0, 0, 26, 0, Math.PI * 0.6).strokePath()
    spinner.setPosition(L.cx, L.cy - 10)
    const label = makeText(this, L.cx, L.cy + 44, text, { size: 20, stroke: '#1a0d04', strokeW: 4 })
    c.add([dim, spinner, label])
    c.setScale(L.s)
    this.tweens.add({ targets: spinner, angle: 360, duration: 800, repeat: -1 })
    c.setAlpha(0)
    this.tweens.add({ targets: c, alpha: 1, duration: 150 })
    this.blocker = c
  }

  hideLoading() {
    this.blocker?.destroy()
    this.blocker = null
  }

  // ---------------------------------------------------------------------------
  // Sahte reklam (sadece geliştirme / web)
  // ---------------------------------------------------------------------------
  showMockAd(kind) {
    return new Promise((resolve) => {
      const L = this.L
      const c = this.add.container(0, 0).setDepth(40).setScale(L.s)
      const bg = this.add.rectangle(0, 0, L.dw, L.dh, 0x101418, 1).setOrigin(0).setInteractive()
      const card = this.add.graphics()
      const w = Math.min(320, L.colW - 40)
      card.fillStyle(0x1F2A33).fillRoundedRect(L.cx - w / 2, L.cy - 150, w, 260, 22)
      card.lineStyle(3, 0x36BDF7).strokeRoundedRect(L.cx - w / 2, L.cy - 150, w, 260, 22)
      const title = makeText(this, L.cx, L.cy - 110, kind === 'rewarded' ? 'TEST · Ödüllü Reklam' : 'TEST · Geçiş Reklamı', { size: 20, stroke: '#0e4a63', strokeW: 4 })
      const icon = this.add.image(L.cx, L.cy - 30, 'ic_play').setScale(80 / 256)
      this.tweens.add({ targets: icon, scale: icon.scale * 1.12, duration: 500, yoyo: true, repeat: -1 })
      const counter = makeText(this, L.cx, L.cy + 60, '', { size: 18, color: '#a7d8f0', stroke: '#0b1a22', strokeW: 3 })
      c.add([bg, card, title, icon, counter])
      const total = kind === 'rewarded' ? 3 : 2
      let left = total
      let closeBtn = null
      const finish = (result) => {
        this.tweens.add({ targets: c, alpha: 0, duration: 150, onComplete: () => c.destroy() })
        resolve(result)
      }
      const tick = () => {
        counter.setText(left > 0 ? `${left}…` : (kind === 'rewarded' ? '✓' : ''))
        if (left > 0) {
          left--
          this.time.delayedCall(1000, tick)
          return
        }
        closeBtn = new Button(this, L.cx + w / 2 - 20, L.cy - 150 + 20, { w: 40, h: 40, shape: 'round', color: 'grey', glyph: 'x', sound: null, onClick: () => finish(true) })
        c.add(closeBtn)
      }
      if (kind === 'rewarded') {
        const skip = makeText(this, L.cx, L.cy + 96, 'erken kapat (ödül yok)', { size: 14, color: '#7f97a3', stroke: null, shadow: false })
        skip.setInteractive({ useHandCursor: true }).on('pointerup', () => !closeBtn && finish(false))
        c.add(skip)
      }
      tick()
    })
  }
}
