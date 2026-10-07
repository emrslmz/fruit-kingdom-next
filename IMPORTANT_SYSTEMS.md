# Önemli Sistemler

Bu dosya, oyunun iş mantığının (satın alma, reklam, ekonomi, bildirim…) hangi
ekrana bağlı olduğunun envanteridir. Arayüz tamamen Phaser'a taşındı (bkz.
`CLAUDE.md`); servis/store kodu yerinde duruyor ve sahneler onları çağırıyor.

## Ekranlar (Phaser sahneleri)

| Sahne | Dosya | İçerik |
| --- | --- | --- |
| Yükleme | `scenes/PreloadScene.js` | logo, rastgele ipucu, ilerleme çubuğu |
| Ana menü | `scenes/MenuScene.js` | para birimleri, seviye yolu (harita) + maskot, ayarlar, bedava elmas, reklam kaldır, alt çubuk (Envanter, Market, OYNA, Siparişler, Kasalar) |
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

## 2. Reklamlar (AdMob) — `core/services/admobService.js`, oyun tarafı yardımcıları `game/core/ads.js`

- **Açılış:** `App.vue` önce bildirim iznini, ardından `admobService.initialize()`'ı çağırır:
  GDPR/UMP onay formu (gerekiyorsa) → iOS takip izni (ATT) → `AdMob.initialize` →
  geçiş ve ödüllü reklamlar **önden yüklenir** (istenince anında açılır, gösterilince
  bir sonraki hemen yüklenir; yükleme başarısız olursa 30 sn sonra tekrar denenir).
- **Reklam ID'leri** (`adIds.js`): production build'de gerçek birimler
  (`ca-app-pub-3304037628561493/...`), `npm run dev`'de ve `VITE_ADMOB_TEST=true` ile
  alınan build'lerde **Google'ın test birimleri**. Eski dosyada gerçek ID'ler "Test ID"
  diye yorumlanmıştı; geliştirirken kendi reklamlarını göstermek/tıklamak hesabı
  kısıtlatabilir.
- **Banner:** sadece oyun ekranında, native + reklamlar kaldırılmadıysa. Uyarlanabilir
  banner'ın **gerçek yüksekliği** (`bannerAdSizeChanged`) dinlenir ve oyun alanı tam o
  kadar yer bırakır; banner yüklenemezse alan geri alınır. Seviyeler arası banner
  kapanıp açılmaz, menüye dönünce kaldırılır. Geliştirmede (web) altta "AdMob Banner
  (test)" yer tutucusu çizilir.
- **Geçiş reklamı:** sadece seviye sonunda (Sonraki Seviye / Tekrar Dene / Ana Sayfa
  butonlarında): seviye ≥ 4, her 3 seviye sonunda bir, iki reklam arası ≥ 90 sn,
  açılıştan sonraki ilk 1 dk yok. Kurallar `admobService.js` başındaki sabitlerde.
  (Eski "her 10 ekran geçişinde bir" kuralı kaldırıldı.)
- **Ödüllü reklam yerleşimleri** (reklamlar kaldırılmış olsa da isteğe bağlı olarak durur):
  - Kaybedince: "Reklam İzle, Devam Et" (50 elmasa alternatif, bedava devam)
  - Kazanınca: "x2 Meyve" — o seviyede toplanan meyveler bir kez daha envantere eklenir
  - Güçlendirme bitince: satın alma penceresinde "Reklamla Bedava +1"
  - Ana menü sağ ray + elmas satın alma: "Bedava Elmas" (+10, günde 5 hak)
  - Enerji satın alma: "Bedava Enerji" (+20)
  Ödül miktarları `game/core/ads.js → AD_REWARDS`.
- **Olay adları düzeltildi:** eski kod v7'de var olmayan `rewardedVideoAdRewarded` /
  `rewardedVideoAdDismissed` olaylarını dinliyordu; telefonda ödül hiç verilmiyordu.
  Artık `onRewardedVideoAdReward` / `onRewardedVideoAdDismissed` kullanılıyor
  (`showRewardVideoAd()` sadece ödül kazanılınca resolve olduğu için kapanış olaydan
  yakalanıyor).
- **Gizlilik:** GDPR bölgesinde Ayarlar'da "Reklam Gizliliği" satırı çıkar (UMP onay
  formunu yeniden açar).
- **Native yapılandırma (repoda değil, `android/` ve `ios/` gitignore'da):** Android
  `AndroidManifest.xml` içinde `com.google.android.gms.ads.APPLICATION_ID` meta-data;
  iOS `Info.plist` için örnek `src/Info.plist` (GADApplicationIdentifier,
  SKAdNetworkItems, NSUserTrackingUsageDescription).

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

- Oyun ekranının altındaki ahşap rafta: Balyoz (`dynamite`), Süpürge (`brush`),
  Rüzgar (`tornado`) — isim etiketi ve adet rozetiyle.
- **Balyoz nişan modu:** butona basınca tahta kararır, "Bir meyveye dokun" şeridi çıkar;
  dokunulan meyvenin türünden bir 3'lü patlatılıp toplanır. **Sepetteki aynı tür
  meyveler önce kullanılır**, yani sepette de yer açar (çalı/buz engel değildir).
  Model: `Board.smash()`. Şeritteki X, butona tekrar basmak veya geri tuşu iptal eder.
- Süpürge tüm çalıları, Rüzgar tüm çalı + buzları temizler; önce etkilenen karolar
  işaretlenir, sonra ikon tahtanın üstünden geçer.
- O an işe yaramayan güçlendirme soluk görünür ve **harcanmaz**; işe yarayacak olan
  parlar (sepet dolmak üzereyse Balyoz, çok çalı varsa Süpürge, buz varsa Rüzgar).
- İlk kullanımda tanıtım penceresi açılır (`playerStore.profile.seenTips`), uzun
  basınca bilgi balonu çıkar.
- Adet 0 ise yeşil "+": elmasla satın alma veya reklam izleyip 1 tane bedava
  (`ui/purchase.js → openPowerUpPurchase`, Market'te de aynı pencere).

## 8. Ana Ekran

Orman yolunda seviye haritası (`MenuScene.buildRoad`): tamamlanan seviyeler yeşil ✓,
mevcut seviye altın + maskot, sonrakiler kilitli, her 10 seviyede taç. Seviye kazanıp
menüye dönünce kilit kırılır ve maskot yeni seviyeye zıplar (`registry.levelUpFrom`).
Sol ray: Ayarlar. Sağ ray: Bedava Elmas (reklam), Reklamları Kaldır. Alt çubuk:
Envanter, Market, **OYNA**, Siparişler, Kasalar (ücretsiz kasa hazırsa "!").

## Yeniden tasarımda değişen oyun davranışları

- Sepete giren meyve aynı türün yanına yerleşir (eşleşmeler görsel olarak gruplanır).
- Sadece çalı/buzlu meyve kaldığında oyun artık "kaybettin" saymıyor (bunlara hâlâ
  dokunulabiliyor) — kayıp sadece sepet dolunca.
- "Devam et" sepetteki son 3 meyveyi silmek yerine tahtaya geri koyar; böylece
  seviye çözülebilir kalır (silmek 3'lü eşleşme sayısını bozuyordu).
- Balyoz artık nişan alarak çalışır ve kırdığı 3'lü "toplanan meyveler"e sayılır.
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
