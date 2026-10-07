# Önemli Sistemler

Bu dosya, oyunun iş mantığının (satın alma, reklam, ekonomi, bildirim…) hangi
ekrana bağlı olduğunun envanteridir. Arayüz tamamen Phaser'a taşındı (bkz.
`CLAUDE.md`); servis/store kodu yerinde duruyor ve sahneler onları çağırıyor.

## Ekranlar (Phaser sahneleri)

| Sahne | Dosya | İçerik |
| --- | --- | --- |
| Yükleme | `scenes/PreloadScene.js` | logo, rastgele ipucu, ilerleme çubuğu |
| Ana menü | `scenes/MenuScene.js` | enerji/altın/elmas, ayarlar, kasalar, reklam kaldır, seviye madalyonu, Oyna, alt menü |
| Oyun | `scenes/GameScene.js` | tahta, sepet, hedef çipleri, güçlendirmeler, duraklat, kazan/kaybet/devam pencereleri |
| Ayarlar | `scenes/SettingsScene.js` | müzik, ses, titreşim, bildirim, ipucu, dil seçimi, gizlilik politikası |
| Market | `scenes/ShopScene.js` | güçlendirmeleri elmasla adet seçerek alma |
| Envanter | `scenes/InventoryScene.js` | meyveler + güçlendirmeler (sekmeli) |
| Siparişler | `scenes/OrdersScene.js` | 3 müşteri siparişi, teslim (enerji harcar, altın kazandırır), yenile |
| Kasalar | `scenes/CasesScene.js` | günlük ücretsiz + altınla açılan kasalar, kayan şeritli açılış |
| Satın alma | `scenes/PurchaseScene.js` | `currency`: `diamond` / `gold` / `energy` |
| Overlay | `scenes/OverlayScene.js` | sahne geçiş perdesi, `toastService`, `alertService`, geri tuşu |

## 1. Satın Alma (RevenueCat / IAP)

- `PurchaseService.purchase(revenueCatId)` — web'de satın alma simüle edilir (test için).
- Elmas paketleri + başlangıç teklifi + reklam kaldırma: `PurchaseScene` (`currency: 'diamond'`)
  → `shopStore.buyDiamondPackage()` / `playerStore.removeAds()`.
- Altın paketleri: `PurchaseScene` (`currency: 'gold'`) → `shopStore.buyGoldPackage()`.
  **Not:** `revenue.goldpack_*` ürünleri App Store / Play Console / RevenueCat'te henüz yok.
- Fiyat metinleri hâlâ `shopStore` içindeki sabit değerler (RevenueCat'ten fiyat çekme yok).

## 2. Reklamlar (AdMob) — `admobService.js`, ID'ler `adIds.js` (şu an test ID'leri)

- **Banner:** oyun ekranında, sadece native + reklamlar kaldırılmadıysa. Ekranın altında
  banner için yer ayrılır (`GameScene.computeGameLayout → bannerH`), oyun alanıyla çakışmaz.
- **Interstitial:** her 10 ekran geçişinde bir (`BaseScene.go` → `playerStore.handleNavigation()`),
  sadece native.
- **Ödüllü reklam:** Elmas satın alma ekranında "Bedava Elmas" kartı — reklam başına
  **10 elmas**, günlük limit `playerStore.ads.dailyAdLimit` (5). Miktar
  `PurchaseScene.js → REWARDED_AD_DIAMONDS`.

## 3. Reklam Kaldırma

`playerStore.settings.adsRemoved`. Ana menüdeki kırmızı "AD" butonu ve elmas
satın alma ekranındaki kart. `true` iken banner ve interstitial gösterilmez.

## 4. Ses & Titreşim

- `soundService` / `VibrationService`. Ayarlar ekranından ve oyundaki duraklatma
  menüsünden açılıp kapatılır.
- Uygulama arka plana geçince müzik durur, öne gelince devam eder
  (`soundService.pauseMusic/resumeMusic`). **Eskiden uygulama öne gelince tamamen
  yeniden yükleniyordu; bu kaldırıldı.** Oyun sırasında arka plana geçilirse oyun
  duraklatma menüsünü açar (önceden ana menüye atıyordu).

## 5. Bildirimler (Local Notifications)

`notificationService.js` — ilk açılışta izin isteme `App.vue`'de. Ayarlar'daki
anahtar native'de izni ister; reddedilirse cihaz ayarlarına yönlendiren bir
pencere açılır.

## 6. Ekonomi / Para Birimleri

- `diamonds` (premium), `gold` (siparişlerden), `energy` (sipariş teslimi 10 harcar).
- Seviye bitince toplanan meyveler `playerStore.completeLevel()` ile envantere yazılır →
  siparişlerde altına çevrilir → altın kasa açmaya ve enerji almaya harcanır.
- Takas oranları `shopStore.exchangeOffers` içinde.

## 7. Güçlendirmeler

- Balyoz (`dynamite`), Süpürge (`brush`), Rüzgar (`tornado`) — oyun ekranının altında.
- Adet 0 ise butonda yeşil "+" görünür; dokununca elmasla satın alma penceresi açılır
  (`ui/purchase.js → openPowerUpPurchase`). Aynı pencere Market'te de kullanılıyor.
- Hedef yoksa (tahtada çalı/buz yoksa, 3'lü yoksa) güçlendirme **harcanmaz**, uyarı gösterilir.

## Yeniden tasarımda değişen oyun davranışları

- Sepete giren meyve aynı türün yanına yerleşir (eşleşmeler görsel olarak gruplanır).
- Sadece çalı/buzlu meyve kaldığında oyun artık "kaybettin" saymıyor (bunlara hâlâ
  dokunulabiliyor) — kayıp sadece sepet dolunca.
- "Devam et" sepetteki son 3 meyveyi silmek yerine tahtaya geri koyar; böylece
  seviye çözülebilir kalır (silmek 3'lü eşleşme sayısını bozuyordu).
- Balyozla kırılan 3 meyve de "toplanan meyveler"e sayılır.
- 7 saniye hamle yapılmazsa bir sonraki iyi hamle hafifçe sallanır (ayarlardan
  "İpuçları" kapatılabilir).

## Kaldırılan dosyalar

Eski Vue/Ionic arayüzü (`src/modules`, `src/components`, `src/router`,
`src/composables`, `coreStore`, `gameStore`, `PowerUpService`, `effectService`,
`core/config`, `core/theme`, `index.css`) silindi; hepsinin karşılığı `src/game`
altında. Git geçmişinden geri çağrılabilir.

Kullanılmayan ama bırakılanlar: `src/assets/vendor` (FontAwesome, artık import
edilmiyor), `package.json`'daki Ionic/Tailwind/Swiper/three gibi bağımlılıklar ve
Tailwind/PostCSS yapılandırması — istenirse ayrı bir temizlikte kaldırılabilir.
