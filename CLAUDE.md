# Fruit Kingdom — Proje Kuralları

## Mimari: Tüm arayüz Phaser'da

Oyunun **bütün ekranları** (yükleme, ana menü, oyun, ayarlar, market, envanter,
siparişler, kasalar, satın alma) `src/game/` altındaki Phaser sahneleridir.
Vue artık sadece ince bir kabuk: `src/App.vue` tam ekran bir `<div>` açar ve
`createGame()` ile Phaser'ı başlatır; Pinia store'ları, i18n ve Capacitor
servisleri (`src/core/services/*`) eskisi gibi Vue tarafında yaşar.

```
src/game/
  index.js            createGame(): DPR'li tam ekran canvas + resize takibi
  config.js           renk paleti (Kenney), font, tasarım ölçüleri, sahne adları
  assets.js           doku anahtarı → dosya yolu, tembel arka plan yükleme
  core/layout.js      ekran → "tasarım birimi" dönüşümü, safe-area
  core/BaseScene.js   tüm ekranların tabanı (arka plan, üst çubuk, geçiş, geri tuşu)
  core/services.js    store/servis köprüsü: player(), shop(), t(), sfx(), haptic()
  core/banner.js      alttaki banner reklam yuvası (Oyun ve Ana menü)
  logic/Board.js      oyun kuralları — saf model, Phaser'dan bağımsız
  logic/fruits.js     meyve türleri
  logic/timing.js     seviye süresi ve yıldız eşikleri
  ui/                 Button, Modal, CurrencyBadge, Toggle, ScrollView, text, effects
  scenes/             Boot, Preload, Menu, Game, Settings, Shop, Inventory,
                      Orders, Cases, Purchase, Overlay (toast/alert/geçiş — hep en üstte)
```

## Responsive: tasarım birimi ile yaz, piksel değil

- Canvas, CSS boyutu × `devicePixelRatio` (en fazla 3) çözünürlükte çizilir —
  retina ekranlarda metin ve vektörler keskin kalır.
- Her sahne UI'ını `this.root` container'ına **tasarım biriminde** kurar. Referans
  ekran 390×780 bir telefondur; `computeLayout()` her cihaz için ölçeği (`L.s`)
  hesaplar. Bir butona `w: 160` demek her cihazda aynı oranda görünmek demektir.
- Kullanılacak ölçüler `this.L` içinde: `dw/dh` (ekran), `cx/cy` (orta), `top/bottom`
  (çentik/home bar hariç güvenli alan), `colX/colW` (içerik sütunu — tablet ve
  masaüstünde en fazla 560 birim, ortalanır).
- `window.innerWidth`, sabit piksel, `sm:`/`md:` gibi breakpoint mantığı **yok**.
  Ekran boyutu değişince (döndürme, pencere) sahne `getState()` ile aynı durumla
  yeniden kurulur — durum korunması gereken sahneler `getState()`'i override eder
  (bkz. `GameScene`: tahta modeli aynen korunur).
- Uzun çeviriler için metni `fitText(text, maxW, maxH)` ile sığdır; kutuya
  göre büyütme/küçültme yapma.

## UI kiti: Kenney renk ↔ anlam eşlemesi

Butonlar `ui/Button.js` ile prosedürel çizilir (Kenney UI Pack 2.0'ın birebir
renkleriyle, her boyutta keskin, basılma animasyonlu). Renk anlamı değişmedi:

- `yellow` → birincil aksiyon / vurgulanan buton (Play, Buy, Restart)
- `green` → onay / başarı (Confirm, Next Level, Claim, Deliver)
- `red` → tehlike / iptal (Cancel, Home (pause), No Thanks)
- `blue` → ikincil / bilgi (ayarlar, bilgi, yenile)
- `grey` → pasif / nötr (Home, kapalı durum)
- Pack'te olmayanlar `config.js → BTN` içinde: `purple` (devam et), `wood` (pasif sekme).

Diğer yapı taşları: `Modal` (parşömen panel + kurdele başlık, `modal.body`'ye
içerik eklenir), `CurrencyBadge` (sayı animasyonlu), `Toggle`, `ScrollView`
(içindeki butonları `sv.register(btn)` ile kaydet — maskenin dışından
tıklanmasınlar), `makeText`/`inkText` (kontürlü oyun metni / parşömen üstü metin),
`effects.js` (patlama, uçan yazı, konfeti, ışık huzmesi, yay çizerek uçma).
Yeni ekranda bunları kullan; aynı görünümü elle yeniden çizme.

## Yeni sahne eklemek

1. `scenes/XScene.js`: `BaseScene`'den türet, `build(data)` yaz.
2. `config.js → SCENES`'e adını, `index.js`'teki sahne listesine sınıfı ekle
   (`OverlayScene` listenin **sonunda** kalmalı).
3. Büyük arka planı `preload()` içinde `queueBackground(this, 'bg_...')` ile yükle.
4. Gezinme her zaman `this.go(SCENES.X, data)` ile (perde geçişi); geri davranışı
   için `onBack()`'i override et.

## Oyun kuralları

Kurallar `logic/Board.js` modelinde: 4 sütun, görünen her meyveye dokunulabilir,
7 slotluk sepet, aynı türden 3 meyve eşleşir; çalı (dokununca açılır ve meyve
alınır), buz (her dokunuş bir kademe kırar); Balyoz/Süpürge/Rüzgar güçlendirmeleri.
`GameScene` sadece modelin sonuçlarını canlandırır — kural değişikliğini modelde yap.

**Süre ve yıldızlar** (`logic/timing.js`): her seviyenin süresi meyve + buz sayısına,
meyve türüne ve seviyeye göre hesaplanır (`levelTimeLimit`). Yıldız, toplanan
meyve oranından: %40 → 1★ (seviyeyi geçmek için yeterli), %80 → 2★, tamamı → 3★
(`starsFor`). Süre dolunca veya sepet dolunca o ana kadarki yıldızlar gösterilir;
seviye başına bir kez 50 elmasla +20 sn (süre) / son 3 meyveyi tahtaya geri koyma
(sepet) teklif edilir. Yıldızlar `playerStore.completeLevel(level, collected, stars)`
ile `profile.levelData`'ya yazılır; geçilen seviyeye geri dönülmez (yolda sadece
yıldızları görünür).

## Reklamlar

Sadece **banner** reklam var (geçiş ve ödüllü reklamlar kaldırıldı). AdMob mantığı
`core/services/admobService.js`'te (onay formu, ATT, banner gösterme/gizleme,
gerçek yükseklik). Banner yalnızca Oyun ve Ana menüde, ekranın altında kendi
ayrılmış yuvasında durur: sahne `build()` içinde `this.bannerH = setupBannerDock(this)`
(`game/core/banner.js`) çağırır ve alt çubuğunu/rafını o yüksekliğin üstüne kurar —
hiçbir buton banner'ın üstüne binmez. Diğer sahneler açılınca `BaseScene` banner'ı
gizler. Geliştirmede (web) gerçek reklam yok; yuvada "AdMob Banner (test)" yer
tutucusu çizilir. Ayrıntı: `IMPORTANT_SYSTEMS.md` §2.

## Geliştirme / test

- `npm run dev` → `http://localhost:5757`. Geliştirme modunda `?scene=Game` gibi bir
  parametre ile doğrudan bir sahneden başlanabilir, `window.__FK_GAME__` Phaser
  oyun nesnesidir (konsoldan sahnelere erişim için).
- Ses efektlerinin çoğu `.wav` ve `.gitignore`'da; repoda yoksa `soundService`
  sessizce geçer, müzik `calm_music.mp3`'e düşer.
- Import yollarında dosya adının büyük/küçük harfine dikkat
  (`soundService.js`, `notificationService.js`, `alertService.js`) — macOS
  tolere eder ama Linux/CI build'i kırılır.

## i18n / Çeviriler

Yeni metin eklerken veya mevcut key'lerin **değerini** değiştirirken sadece
**`src/i18n/locales/tr.ts`** ve **`src/i18n/locales/en.ts`**'i düzenle. Diğer 11
dili (`ar`, `de`, `es`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `uk`, `zh`) elleme —
onları proje sahibi kendisi çevirip güncelliyor. Yeni bir key eklediğinde diğer
dillerde o key eksik kalır; bu kabul edilebilir (uygulama o key için en metnini
fallback olarak kullanır ya da proje sahibi sonradan çevirir). Phaser tarafında
çeviri `core/services.js → t()` ile alınır.

## State / Store Katmanı

`playerStore` (profil, para birimleri, envanter, siparişler, ayarlar) ve
`shopStore` (ürün kataloğu, kasa/takas mantığı) Pinia'da duruyor ve tüm sahneler
bunları `player()` / `shop()` ile kullanıyor. Hangi sistemin hangi ekrana bağlı
olduğu için bkz. `IMPORTANT_SYSTEMS.md`.
