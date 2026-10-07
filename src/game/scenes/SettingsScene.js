import { languageService } from '@/core/services/LanguageService'
import { mobileService } from '@/core/services/MobileService'
import notificationService from '@/core/services/notificationService'
import { soundService } from '@/core/services/soundService'
import { toastService } from '@/core/services/ToastService'
import { queueBackground } from '../assets'
import { SCENES } from '../config'
import BaseScene from '../core/BaseScene'
import { player, t } from '../core/services'
import Button from '../ui/Button'
import { drawCard, drawPanel } from '../ui/draw'
import { drawGlyph } from '../ui/glyphs'
import Modal from '../ui/Modal'
import { confirmModal } from '../ui/purchase'
import ScrollView from '../ui/ScrollView'
import { fitText, inkText } from '../ui/text'
import Toggle from '../ui/Toggle'

/** Ayarlar: müzik, ses, titreşim, bildirim, ipucu, dil, gizlilik. */
export default class SettingsScene extends BaseScene {
  constructor() {
    super(SCENES.Settings)
  }

  preload() {
    queueBackground(this, 'bg_grass')
  }

  build() {
    const L = this.L
    const p = player()
    this.addBackground('bg_grass', { rotate: true })
    const top = this.addTopBar({ title: t('settings'), currencies: ['gold', 'diamond'] })

    const panelW = Math.min(L.colW - 24, 420)
    const rowH = 62
    const rows = [
      { key: 'music', icon: 'badge_music', type: 'toggle', value: () => p.settings.musicEnabled, set: v => this.setMusic(v) },
      { key: 'sound', icon: 'badge_sound', type: 'toggle', value: () => p.settings.soundEnabled, set: v => p.updateSettings({ soundEnabled: v }) },
      { key: 'vibration', icon: 'badge_vibration', type: 'toggle', value: () => p.settings.vibration, set: v => p.updateSettings({ vibration: v }) },
      { key: 'notifications', icon: 'badge_announcement', type: 'toggle', value: () => p.settings.notifications, set: (v, toggle) => this.setNotifications(v, toggle) },
      { key: 'hints', label: t('hints', null, 'Hints'), icon: 'badge_question', type: 'toggle', value: () => p.settings.hintEnabled !== false, set: v => p.updateSettings({ hintEnabled: v }) },
      { key: 'language', icon: 'ic_earth', type: 'language' },
      { key: 'privacy_policy', icon: 'badge_info', type: 'link', action: () => this.openPrivacy() },
    ]
    const contentH = rows.length * (rowH + 10) + 20
    const avail = L.bottom - top - 30
    const panelH = Math.min(contentH + 40, avail)
    const panelY = top + 16 + panelH / 2

    const panel = this.add.container(L.cx, panelY)
    const pg = this.add.graphics()
    drawPanel(pg, panelW, panelH)
    panel.add(pg)
    this.root.add(panel)

    const sv = new ScrollView(this, panel, -panelW / 2 + 14, -panelH / 2 + 16, panelW - 28, panelH - 34)
    const items = []
    rows.forEach((row, i) => {
      const y = 10 + rowH / 2 + i * (rowH + 10)
      const c = this.add.container((panelW - 28) / 2, y)
      const g = this.add.graphics()
      drawCard(g, 0, 0, panelW - 40, rowH)
      const iconImg = this.add.image(-(panelW - 40) / 2 + 32, 0, row.icon)
      iconImg.setScale(42 / iconImg.width)
      const label = inkText(this, -(panelW - 40) / 2 + 62, 0, row.label ?? t(row.key), { size: 20, originX: 0 })
      fitText(label, panelW - 210)
      c.add([g, iconImg, label])

      const rightX = (panelW - 40) / 2 - 46
      if (row.type === 'toggle') {
        const toggle = new Toggle(this, rightX, 0, { value: row.value(), onChange: v => row.set(v, toggle) })
        sv.register(toggle)
        c.add(toggle)
      }
      else if (row.type === 'language') {
        const lang = languageService.getCurrentLanguage()
        const btn = new Button(this, rightX - 30, 0, {
          w: 116,
          h: 44,
          color: 'blue',
          label: lang.label,
          labelSize: 17,
          icon: this.textures.exists(`flag_${lang.code}`) ? `flag_${lang.code}` : undefined,
          iconSize: 28,
          onClick: () => this.openLanguages(),
        })
        sv.register(btn)
        c.add(btn)
      }
      else {
        const btn = new Button(this, rightX + 6, 0, { w: 46, h: 44, color: 'blue', glyph: 'info', onClick: row.action })
        sv.register(btn)
        c.add(btn)
      }
      sv.content.add(c)
      items.push(c)
    })
    sv.setContentHeight(contentH)
    this.popIn(items, { delay: 120, stagger: 50 })

    const version = import.meta.env.VITE_APP_VERSION
    if (version) {
      const v = inkText(this, L.cx, Math.min(L.bottom - 14, panelY + panelH / 2 + 18), `v${version}`, { size: 14, color: '#ffffff' })
      v.setAlpha(0.7)
      this.root.add(v)
    }
    this.popIn(panel, { delay: 60, dy: 40, scale: 0.95 })
  }

  setMusic(enabled) {
    player().updateSettings({ musicEnabled: enabled })
    if (enabled)
      soundService.startInitialMusic()
    else
      soundService.stopMusic()
  }

  async setNotifications(enabled, toggle) {
    const p = player()
    if (!enabled) {
      p.updateSettings({ notifications: false })
      return
    }
    if (!mobileService.isNative) {
      p.updateSettings({ notifications: true })
      return
    }
    const granted = await notificationService.requestPermission()
    if (granted)
      return
    toggle?.set(false)
    const go = await confirmModal(this, {
      title: t('permission_required'),
      message: t('notifications_denied_text'),
      confirmText: t('go_to_settings'),
      cancelText: t('close'),
    })
    if (go)
      mobileService.openAppSettings()
  }

  openLanguages() {
    const L = this.L
    const langs = languageService.getSupportedLanguages()
    const current = languageService.getCurrentLanguage().code
    const cols = 2
    const rows = Math.ceil(langs.length / cols)
    const cellH = 56
    const modal = new Modal(this, { w: 360, h: Math.min(L.dh - 60, rows * (cellH + 8) + 110), title: t('select_language'), color: 'blue' })
    const innerW = modal.w - 44
    const listTop = modal.innerTop + 6
    const listH = modal.innerBottom - listTop + 6
    const sv = new ScrollView(this, modal.body, -innerW / 2, listTop, innerW, listH)
    const cellW = (innerW - 10) / cols
    langs.forEach((lang, i) => {
      const x = (i % cols) * (cellW + 10) + cellW / 2
      const y = Math.floor(i / cols) * (cellH + 8) + cellH / 2 + 4
      const selected = lang.code === current
      const b = new Button(this, x, y, {
        w: cellW,
        h: cellH,
        color: selected ? 'green' : 'grey',
        label: lang.label,
        labelSize: 18,
        icon: this.textures.exists(`flag_${lang.code}`) ? `flag_${lang.code}` : undefined,
        iconSize: 30,
        onClick: () => {
          if (lang.code !== current) {
            languageService.changeLanguage(lang.code)
            toastService.show(lang.label, 'success', 1500)
          }
          modal.close(true)
          this.time.delayedCall(220, () => this.scene.restart({ instant: true }))
        },
      })
      sv.register(b)
      sv.content.add(b)
      if (selected) {
        const check = this.add.graphics()
        check.fillStyle(0xFFFFFF).fillCircle(0, 0, 11)
        check.fillStyle(0x16BB77).fillCircle(0, 0, 9)
        drawGlyph(check, 'check', 16)
        check.setPosition(x + cellW / 2 - 8, y - cellH / 2 + 6)
        sv.content.add(check)
      }
    })
    sv.setContentHeight(rows * (cellH + 8) + 8)
  }

  openPrivacy() {
    const L = this.L
    const modal = new Modal(this, { w: 380, h: L.dh - 80, title: t('privacy_policy'), color: 'wood' })
    const innerW = modal.w - 50
    const listTop = modal.innerTop + 4
    const sv = new ScrollView(this, modal.body, -innerW / 2, listTop, innerW, modal.innerBottom - listTop + 6)
    let y = 4
    for (let i = 1; i <= 6; i++) {
      if (i > 1) {
        const title = inkText(this, 0, y, t(`privacyPolicyTitle${i - 1}`), { size: 19, originX: 0, originY: 0, wrap: innerW - 8, color: '#6b3d17', align: 'left' })
        sv.content.add(title)
        y += title.height + 4
      }
      const body = inkText(this, 0, y, t(`privacyPolicyText${i}`), { size: 15, originX: 0, originY: 0, wrap: innerW - 8, lineSpacing: 3, color: '#4a2e1b', align: 'left', font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' })
      sv.content.add(body)
      y += body.height + 14
    }
    sv.setContentHeight(y)
  }
}
