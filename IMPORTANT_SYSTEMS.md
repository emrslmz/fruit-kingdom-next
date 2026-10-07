# Önemli Sistemler

Bu dosya, oyunun iş mantığının (satın alma, reklam, ekonomi, bildirim…) hangi
ekrana bağlı olduğunun envanteridir. Arayüz tamamen Phaser'a taşındı (bkz.
`CLAUDE.md`); servis/store kodu yerinde duruyor ve sahneler onları çağırıyor.

## Ekranlar (Phaser sahneleri)

| Sahne | Dosya | İçerik |
| --- | --- | --- |
| Yükleme | `scenes/PreloadScene.js` | logo, rastgele ipucu, ilerleme çubuğu |
| Ana menü | `scenes/MenuScene.js` | para birimleri, seviye yolu (harita, kazanılan yıldızlarla) + maskot, ayarlar, toplam yıldız, reklam kaldır, alt çubuk (Envanter, Market, OYNA, Siparişler, Kasalar), banner yuvası |
| Oyun | `scenes/GameScene.js` | tahta, sepet, süre sayacı, yıldız çubuğu, hedef çipleri, güçlendirmeler, duraklat, süre doldu/sepet doldu teklifi, yıldızlı sonuç pencereleri, banner yuvası |
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

## 2. Reklamlar (AdMob) — sadece banner — `core/services/admobService.js`, yuva `game/core/banner.js`

- **Açılış:** `App.vue` önce bildirim iznini, ardından `admobService.initialize()`'ı çağırır:
  GDPR/UMP onay formu (gerekiyorsa) → iOS takip izni (ATT) → `AdMob.initialize`.
- **Reklam ID'leri** (`adIds.js`): production build'de gerçek birimler
  (`ca-app-pub-3304037628561493/...`), `npm run dev`'de ve `VITE_ADMOB_TEST=true` ile
  alınan build'lerde **Google'ın test birimleri**. Geliştirirken kendi reklamlarını
  göstermek/tıklamak hesabı kısıtlatabilir.
- **Banner:** Oyun ekranı ve Ana menüde, native + reklamlar kaldırılmadıysa. Ekranın
  en altında koyu ahşap bir **yuvada** durur: `setupBannerDock(scene)` yuvayı çizer,
  banner'ı açar ve yüksekliği döndürür; sahne alt çubuğunu / güçlendirme rafını o
  yüksekliğin üstüne kurar, yani **hiçbir buton banner'ın altında kalmaz**.
  Uyarlanabilir banner'ın gerçek yüksekliği (`bannerAdSizeChanged`) gelince sahne
  tam o ölçüye göre yeniden yerleşir; yüklenemezse yer geri alınır.
  Banner bir kez yüklenir: Ayarlar/Market vb. ekranlara geçince `BaseScene`
  gizler (`hideBanner`), Oyun/Menü'ye dönünce yeniden yüklenmeden gösterilir
  (`resumeBanner`). Geliştirmede (web) yuvada "AdMob Banner (test)" yazar.
- **Geçiş ve ödüllü reklamlar kaldırıldı** (seviye sonu geçiş reklamı, reklamla devam,
  x2 meyve, bedava elmas/enerji, reklamla bedava güçlendirme). `adIds.js`'te birim
  ID'leri ileride gerekirse diye duruyor.
- **Gizlilik:** GDPR bölgesinde Ayarlar'da "Reklam Gizliliği" satırı çıkar (UMP onay
  formunu yeniden açar).
- **Native yapılandırma (repoda değil, `android/` ve `ios/` gitignore'da):** Android
  `AndroidManifest.xml` içinde `com.google.android.gms.ads.APPLICATION_ID` meta-data;
  iOS `Info.plist` için örnek `src/Info.plist` (GADApplicationIdentifier,
  SKAdNetworkItems, NSUserTrackingUsageDescription).

## 3. Reklam Kaldırma

`playerStore.settings.adsRemoved`. Ana menüdeki kırmızı "AD" butonu ve elmas
satın alma ekranındaki kart. `true` iken banner gösterilmez ve yuvası da çizilmez
(satın alınınca banner kaldırılır, menü yuvasız yeniden kurulur).

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
- Adet 0 ise yeşil "+": elmasla satın alma penceresi
  (`ui/purchase.js → openPowerUpPurchase`, Market'te de aynı pencere).
- Satın alma / tanıtım penceresi açıkken süre durur.

## 8. Ana Ekran

Orman yolunda seviye haritası (`MenuScene.buildRoad`): tamamlanan seviyeler yeşil,
altlarında kazanılan yıldızlar (1–3); mevcut seviye altın + maskot, sonrakiler kilitli,
her 10 seviyede taç. Geçilen seviyelere dokunulunca sadece zıplar — tekrar oynanmaz.
Seviye geçip menüye dönünce kilit kırılır ve maskot yeni seviyeye zıplar
(`registry.levelUpFrom`). Sol ray: Ayarlar + toplam yıldız (`playerStore.totalStars`).
Sağ ray: Reklamları Kaldır. Alt çubuk: Envanter, Market, **OYNA**, Siparişler, Kasalar
(ücretsiz kasa hazırsa "!"); altında banner yuvası.

## 9. Süre ve Yıldızlar — `game/logic/timing.js`

- **Süre** = 10 sn + (meyve sayısı + buz vuruşu) × dokunuş başına süre × tür çarpanı,
  5 sn'ye yuvarlanır. Dokunuş başına süre 1. seviyede 1.6 sn, her seviye 0.011 sn azalır
  (en az 1.0 sn) — oyun gitgide sıkılaşır; 7'den fazla meyve türü olan seviyelere tür
  başına %3.5 ek süre. Örnek: 1. seviye 0:55, 5. → 1:20, 10. → 1:50, 20. → 3:05,
  30. → 4:05, 50. → 5:10.
- Sayaç seviye şeridi geçince (ya da ilk dokunuşta) başlar; duraklatma ve her açık
  pencerede durur. Son 20 sn sarı, son 10 sn kırmızı + tik sesi + ekran kenarında
  kırmızı nabız.
- **Yıldız** toplanan meyve oranına göre: %40 → 1★, %80 → 2★, tamamı → 3★. Üstteki
  çubukta üç yıldız bu eşiklerde yanar. **1 yıldız seviyeyi geçirir**; 0 yıldızda
  "Seviye Başarısız" + Tekrar Dene.
- **Süre dolunca:** o ana kadarki yıldızlar gösterilir; seviye başına bir kez
  **+20 sn = 50 elmas** teklifi (8 sn geri sayım) ya da "Bitir".
  **Sepet dolunca:** aynı pencere, teklif "son 3 meyveyi tahtaya geri koy" (50 elmas,
  seviye başına bir kez).
- Yıldızlar `playerStore.completeLevel(level, collected, stars)` ile
  `profile.levelData[level] = { stars, at }` olarak saklanır (`levelStars`,
  `totalStars` getter'ları). Seviye geçilince toplanan meyveler (kısmi bitişte de) envantere
  eklenir.

## Yeniden tasarımda değişen oyun davranışları

- Sepete giren meyve aynı türün yanına yerleşir (eşleşmeler görsel olarak gruplanır).
- Sadece çalı/buzlu meyve kaldığında oyun artık "kaybettin" saymıyor (bunlara hâlâ
  dokunulabiliyor).
- Seviyeler süreli; sonuç yıldızla (bkz. §9). Sepet dolması artık doğrudan kayıp
  değil: o ana kadar %40 toplandıysa seviye 1 yıldızla geçilir.
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
