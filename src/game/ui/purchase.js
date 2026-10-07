import { toastService } from '@/core/services/ToastService'
import { powerUpKey } from '../assets'
import { player, sfx, shop, t } from '../core/services'
import Button from './Button'
import Modal from './Modal'
import { fitText, inkText, makeText } from './text'

/**
 * Güçlendirme satın alma penceresi (elmas ile, adet seçmeli).
 * Hem oyun içinde (güçlendirme bitince) hem markette kullanılır.
 */
export function openPowerUpPurchase(scene, powerUpId, o = {}) {
  const item = shop().powerUps.find(p => p.id === powerUpId)
  if (!item)
    return null
  let qty = 1
  const modal = new Modal(scene, {
    w: 330,
    h: 430,
    title: t(item.name),
    color: 'blue',
    onClose: o.onClose,
  })
  const top = modal.innerTop

  const glow = scene.add.image(0, top + 70, 'fx_glow').setTint(0x8FD8FF).setAlpha(0.6)
  glow.setScale(170 / 64)
  const icon = scene.add.image(0, top + 70, powerUpKey(item.id))
  icon.setScale(116 / icon.width)
  scene.tweens.add({ targets: icon, y: icon.y - 6, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  const desc = inkText(scene, 0, top + 148, t(item.description), { size: 17, wrap: modal.w - 60, color: '#6b4724' })
  fitText(desc, modal.w - 50, 48)

  const owned = player().getPowerUpQuantity(item.id)
  const ownedText = inkText(scene, 0, top + 182, `${t('inventory')}: ${owned}`, { size: 15, color: '#9a7a52' })

  // adet seçici
  const stepY = top + 228
  const qtyText = makeText(scene, 0, stepY, '1', { size: 34, stroke: '#3b230d', strokeW: 6, shadowY: 3 })
  const totalY = stepY + 50
  const totalIcon = scene.add.image(0, totalY, 'ic_diamond').setScale(30 / 256)
  const totalText = makeText(scene, 0, totalY, '', { size: 24, stroke: '#3b230d', strokeW: 5, shadowY: 2 })
  const buy = new Button(scene, 0, modal.innerBottom - 30, {
    w: modal.w - 70,
    h: 60,
    color: 'green',
    label: t('buy'),
    onClick: () => {
      const result = shop().buySinglePowerUp(item.id, qty)
      toastService.show(t(result.message), result.success ? 'success' : 'warning')
      if (result.success) {
        sfx('success_effect')
        o.onPurchased?.(item.id, qty)
        modal.close(true)
      }
    },
  })

  const refresh = () => {
    qtyText.setText(String(qty))
    const total = item.price * qty
    totalText.setText(String(total))
    const w = totalIcon.displayWidth + 6 + totalText.width
    totalIcon.x = -w / 2 + totalIcon.displayWidth / 2
    totalText.x = totalIcon.x + totalIcon.displayWidth / 2 + 6 + totalText.width / 2
    const affordable = player().currencies.diamonds >= total
    totalText.setColor(affordable ? '#ffffff' : '#ff8a8a')
    buy.setColor(affordable ? 'green' : 'grey')
  }
  const minus = new Button(scene, -86, stepY, {
    w: 50,
    h: 50,
    shape: 'round',
    color: 'red',
    glyph: 'minus',
    onClick: () => {
      qty = Math.max(1, qty - 1)
      refresh()
      scene.tweens.add({ targets: qtyText, scale: { from: 0.8, to: 1 }, duration: 160 })
    },
  })
  const plus = new Button(scene, 86, stepY, {
    w: 50,
    h: 50,
    shape: 'round',
    color: 'green',
    glyph: 'plus',
    onClick: () => {
      qty = Math.min(10, qty + 1)
      refresh()
      scene.tweens.add({ targets: qtyText, scale: { from: 1.25, to: 1 }, duration: 160 })
    },
  })
  refresh()
  modal.body.add([glow, icon, desc, ownedText, minus, qtyText, plus, totalIcon, totalText, buy])
  return modal
}

/** Basit evet/hayır onayı (alertService yerine sahne içinde, aynı görünümde). */
export function confirmModal(scene, o) {
  return new Promise((resolve) => {
    const w = 330
    const probe = inkText(scene, 0, 0, o.message || '', { size: 19, wrap: w - 60 })
    const msgH = o.message ? probe.height : 0
    probe.destroy()
    const modal = new Modal(scene, {
      w,
      h: 170 + msgH + 64,
      title: o.title,
      color: o.color ?? 'wood',
      onClose: result => resolve(!!result),
    })
    if (o.message) {
      const msg = inkText(scene, 0, modal.innerTop + 14, o.message, { size: 19, wrap: w - 60, originY: 0, lineSpacing: 4 })
      modal.body.add(msg)
    }
    const yes = new Button(scene, 0, modal.innerBottom - 94, {
      w: w - 70,
      h: 56,
      color: o.confirmColor ?? 'green',
      label: o.confirmText ?? t('yes'),
      onClick: () => modal.close(true),
    })
    const no = new Button(scene, 0, modal.innerBottom - 30, {
      w: w - 70,
      h: 52,
      color: 'grey',
      label: o.cancelText ?? t('no'),
      onClick: () => modal.close(false),
    })
    modal.body.add([yes, no])
  })
}
