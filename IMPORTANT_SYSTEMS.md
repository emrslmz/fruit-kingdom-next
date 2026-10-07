# Önemli Sistemler (Redesign Öncesi Notlar)

Bu dosya, tasarımı en baştan yapmaya başlarken **kaybetmememiz gereken** iş mantığının bir envanteridir.
Uygulama şu an sadece 2 ekrana indirildi: **MainMenu** (basit Play ekranı) ve **Game** (oyun alanı).
Aşağıdaki sistemlerin UI'ları (sayfa/modal) silindi, ama alttaki servis/store kodu duruyor —
yeni tasarımda bunları yeniden bir arayüze bağlamamız gerekecek.

## Şu an ayakta olan yapı

- `MainMenu.vue` (route: `/`) — logo + tek "Play" butonu, `coreStore.goTo('Game')` ile oyuna gider.
- `Game.vue` (route: `/game`) — oyun alanı: `PhaserGame` (meyve tahtası), `TheGameHeader`
  (seviye + kalan meyveler), `TheGameFooter` (seçim barı + 3 güçlendirme butonu + banner reklam),
  `LevelEndModal` (kazandın/kaybettin/devam et), `GameLoading`.
- Alt yapı (silinmedi, hepsi çalışıyor): `playerStore`, `gameStore`, `shopStore`, tüm
  `core/services/*`, `AlertModal`/`ToastContainer` (global, `Index.vue` üzerinden).

## 1. Satın Alma (RevenueCat / IAP)

- Kütüphane: `@revenuecat/purchases-capacitor`. API key'ler ve ürün ayarları
  `revenuecat/ios` ve `revenuecat/android` klasörlerinde (keystore, StoreKit config vb.).
- Ürün kataloğu `src/store/shopStore.js` içinde duruyor (`products.diamondPackages`,
  `products.specialOffers`, `products.utilities.remove_ads`).
- Satın alma akışının UI'sı silindi: **PurchaseDiamondModal.vue** (elmas paketleri + starter
  offer + reklam kaldırma teklifi) ve **PurchaseItemModal.vue** (elmas ile power-up satın alma).
  RevenueCat `configure`/`getOfferings`/`purchasePackage` çağrıları buradaydı — yeni tasarımda
  bu akışı yeniden kurman gerekecek (mantık basit: local ürün ↔ `revenueCatId` eşleştir, satın
  alınca `playerStore.addCurrency('diamonds', ...)` / `playerStore.removeAds()` / `playerStore.addPowerUp(...)`).
- Web'de (native olmayan platformda) satın alma sahte/mock olarak simüle ediliyordu — bunu da
  koru, test için gerekli.

## 2. Reklamlar (AdMob)

- Servis: `src/core/services/admobService.js` (banner / interstitial / rewarded), reklam
  birimi ID'leri `src/core/services/adIds.js` içinde — **şu an test ID'leri**, yayına almadan
  önce gerçek AdMob ID'leriyle değiştirilmeli.
- **Banner** — `TheGameFooter.vue` içinde hâlâ aktif, oyun ekranında gösteriliyor
  (`playerStore.settings.adsRemoved` false ise).
- **Interstitial** — eski akışta, MainMenu'deki Orders/Home/Settings slaytları arası geçişte
  her 10 navigasyonda bir gösteriliyordu (`playerStore.handleNavigation()` sayaçı). O ekranlar
  silindiği için bu tetikleyici şu an devre dışı; yeni tasarımda nereye bağlanacağına karar
  vermek gerekiyor.
- **Rewarded (ödüllü reklam)** — "reklam izle, elmas kazan" butonu Home.vue'daydı, silindi.
  `admobService.showRewardedAd()` hâlâ çalışır durumda, sadece çağıran UI yok.

## 3. Reklam Kaldırma (Remove Ads)

- `playerStore.settings.adsRemoved` bayrağı satın alma sistemiyle birlikte çalışıyor.
  `true` olduğunda banner reklam gösterilmiyor (`TheGameFooter.vue`) ve interstitial akışı
  atlanıyor (`playerStore.handleNavigation()`).
- Satın alma UI'sı (**RemoveAdsModal.vue**) silindi — yeni tasarımda tek bir "reklamları
  kaldır" kartı/butonu yeterli, mantığı `playerStore.removeAds()` + RevenueCat `remove_ads`
  ürünü.

## 4. Ses & Titreşim

- `src/core/services/SoundService.js`, `VibrationService.js` — tamamen aktif, oyun içinde
  müzik/efekt/titreşim çalışıyor.
- Açma/kapama ayarları `playerStore.settings.soundEnabled / musicEnabled / vibration` içinde
  duruyor ama bunları değiştirecek bir ekran yok artık (**Settings.vue** silindi). Yeni
  tasarımda basit bir ayarlar ekranı/modalı gerekecek.

## 5. Bildirimler (Local Notifications)

- `src/core/services/notificationService.js` — hareketsizlik hatırlatmaları (3s/24s/3g/1h),
  "geri dön" bildirimi, ve (artık kullanılmayan) sipariş hazır bildirimleri.
- İlk açılışta izin isteme `App.vue` üzerinden hâlâ çalışıyor. Açma/kapama anahtarı
  **Settings.vue**'daydı, silindi.

## 6. Ekonomi / Para Birimleri

- İki para birimi var: `diamonds` (premium/IAP) ve `gold` (siparişlerden kazanılan —
  bu session'da eklendi). Mantık `playerStore.js` içinde duruyor.
- Bu para birimlerini harcayacak/kazandıracak tüm ekranlar (Market, Orders, Envanter) silindi.
  Yani şu an oyuncu meyve topluyor (`playerStore.completeLevel` her seviye sonunda
  `inventory.fruitInventory`'e yazıyor) ama bunu harcayacağı bir yer yok — bu, yeni tasarımın
  ana işi olacak.
- `playerStore.characters` (sipariş müşterileri) ve `playerStore.orders` veri modeli de duruyor,
  şu an kullanılmıyor.

## 7. Güçlendirmeler (Power-ups)

- 3 güçlendirme oyunda hâlâ tam çalışıyor: **Balyoz** (eski dynamite), **Süpürge** (eski brush),
  **Rüzgar** (eski tornado) — `TheGameFooter.vue` / `PowerUp.vue` / `gameStore.js`.
- Elmasla satın alma ekranı (**ShopModal.vue**) silindi — fiyatlar hâlâ `shopStore.powerUps`
  içinde duruyor, yeni market tasarımında buraya bağlanacak.

## 8. Kaldırılan / Hiç Bağlanmamış Diğer Sistemler

- **Seviye Haritası** (`Map.vue`) — yıldız/kilit/ödül mekanikli bir "level path" ekranı
  vardı ama zaten navigasyona bağlı değildi (kod'da yorum satırıydı). Tamamen silindi.
- **Tutorial overlay** (`TutorialService.js`, `TutorialOverlay.vue`) — hiçbir yerden
  çağrılmıyordu, tamamen ölü kod olduğu için silindi.
- **Dil seçici** (`LanguageModal.vue`) — Home.vue'daydı, silindi. `languageService.js` ve
  13 dilin çevirileri (`src/i18n/locales/*.ts`) duruyor, sadece seçim ekranı yok.

## Silinen dosyalar (referans için)

```
src/modules/app/views/Home.vue
src/modules/app/views/Orders.vue
src/modules/app/views/Map.vue
src/modules/app/views/Settings.vue
src/components/TheFooter.vue
src/components/TheHeader.vue
src/components/Balance.vue
src/components/ShopModal.vue
src/components/PurchaseItemModal.vue
src/components/PurchaseDiamondModal.vue
src/components/RemoveAdsModal.vue
src/components/LanguageModal.vue
src/components/OrderDetail.vue
src/components/CharacterSprite.vue
src/components/GameSettingsModal.vue   (zaten kullanılmıyordu)
src/modules/app/components/DebugPanel.vue      (zaten kullanılmıyordu)
src/modules/app/components/OldGameLoading.vue  (zaten kullanılmıyordu)
src/components/FruitPhysicsAnimation.vue       (zaten kullanılmıyordu)
src/components/TutorialOverlay.vue
src/core/services/TutorialService.js
src/components/ClashButton.vue
```

Bu commit'lenmediği sürece `git diff` / `git log` ile eski halleri her zaman geri
çağrılabilir — hiçbir şey kalıcı olarak kaybolmadı, sadece aktif uygulamadan çıkarıldı.
