# Fruit Kingdom — Proje Kuralları

## UI Bileşenleri: Kenney UI Pack kullan

Buton, işaretleme kutusu (checkbox), kaydırıcı (slider), ok/ikon rozeti gibi **oyun
tarzı UI elemanları** için elle CSS gradient/border ile "oyun ikonu" taklit etmek
yerine `public/assets/Vector` altındaki hazır Kenney "UI Pack (2.0)"
assetlerini kullan. CC0 lisanslı (bkz. `kenney_ui-pack/License.txt`), tamamen özgür
kullanım — kredi vermek zorunlu değil.

**Yol yapısı:** `PNG/<Renk>/<Varyant>/<dosya>.png`

- Renk: `Blue`, `Green`, `Grey`, `Red`, `Yellow`
- Varyant: `Default` (ince tek kontür) veya `Double` (kalın çift kontür). **Aksi
  belirtilmedikçe `Double` kullan** — daha oyuncul/kalın kontür hissi veriyor.

**Renk ↔ anlam eşlemesi (tutarlılık için, `ButtonBig.vue`'daki eşlemeyle aynı):**

- `Yellow` → birincil aksiyon / vurgulanan buton (Play, Buy, Complete)
- `Green` → onay / başarı (`success` varyantı — Confirm, Next Level, Claim)
- `Red` → tehlike / iptal (`danger` varyantı — Cancel, Retry, Remove)
- `Blue` → ikincil / bilgi (`primary` varyantı)
- `Grey` → pasif / nötr (`secondary`/`gray` varyantı — Home, Close)
- Pack'te **karşılığı olmayan** bir renk gerekiyorsa (örn. mor/violet), eski
  CSS-gradient yöntemine düş — `ButtonBig.vue`'daki `FALLBACK_COLORS` deseni gibi.

**Nasıl uygulanır:** Bu pack'te 9-slice/XML dilim verisi yok, düz PNG'ler (dikdörtgen
buton 192×64 ≈ 3:1 oranında, yuvarlak/kare 64×64 ≈ 1:1). Bir elemanın boyutu asset'in
oranına yakın tutulduğu sürece `background-image` + `background-size: 100% 100%` ile
germek yeterli, köşe bozulması fark edilmiyor. Şekil/kontür/derinlik zaten görselin
içinde — üstüne **ayrıca** `border`, `border-radius`, `box-shadow`, `bg-gradient-to-*`
gibi class'lar ekleme, bunlar asset'i gizler ya da köşeleri çift katlı bozar. Basılma
efekti için `transform: translateY(4px)` + `filter: drop-shadow(...)` yeterli (bkz.
`ButtonBig.vue` → `.big-button--asset`, `TheMenuFooter.vue` → `.footer-item`).

**Kapsam / henüz yapılmadı:** `ButtonBig.vue` ve `MainMenu.vue`'daki alt menü
butonları bu kurala uyacak şekilde güncellendi. Pack'te panel/pencere çerçevesi
(modal arka planı) **yok** — modal gövdesi (`AlertModal.vue`, `LevelEndModal.vue`)
kendi tasarımında kalıyor, sadece içindeki `ButtonBig` butonları bu kurala uyuyor.
Diğer buton/toggle/slider kullanımlarını da (varsa) aynı kurala göre güncelle.

**İstisna — HUD göstergeleri (seviye/para birimi rozeti gibi):** Bu pack'te ahşap/
kahverengi tonu yok (sadece Blue/Green/Grey/Red/Yellow). `LevelBadge.vue` ve
`CurrencyBadge.vue` gibi salt bilgi gösteren (aksiyon almayan) rozetler, oyunun
ahşap/parşömen temasıyla tutarlı kalmak için bilinçli olarak kendi CSS'inde
kaldı — Kenney'e zorlamıyoruz. Bu ikisinde de "ikon dairesi, pilin sol kenarından
biraz taşıyor" deseni var (`absolute -left-N` + pilin yüksekliğinden büyük ikon
kutusu); yeni bir HUD rozeti eklerken bu deseni tekrar kullan.

## Styling: Oyun alanı dışında Tailwind kullan

Oyun tahtası/canvas'ı **dışındaki** UI (menüler, modallar, HUD, footer/header)
için boyutlandırma (ikon `width`/`height`, `gap`, `padding`, `aspect-ratio` vb.)
Tailwind utility class'larıyla template içinde yapılır — `<style scoped>`
bloğunda sabit piksel/rem değeri **tanımlanmaz**. `<style scoped>` sadece
Tailwind'in ifade edemediği şeyler için kalır: Kenney `background-image` asset
atamaları, çok yönlü `text-shadow` (kontür efekti), `@keyframes` animasyonları.
Örnek: `MainMenu.vue`'daki `.footer-item` — boyut/aralık Tailwind (`aspect-square`,
`gap-1`, `p-2`), görsel efekt (background-image, filter, text-shadow) scoped CSS.

**İkon ölçekleme: `scale-[N]` kullan.** Bir `<img>` ikonu bir Kenney buton/rozet
içinde görsel olarak büyük durması gerekiyorsa, `width`/`height` class'ını
büyütme — `w-8 h-8` gibi küçük bir taban boyutu bırak, görsel büyütmeyi
`scale-[2.5]` gibi bir `transform` class'ı ile yap (bkz. `TheMenuFooter.vue` →
`.footer-item img`). Bu, ikonun kutu içindeki hizalamasını/oranını bozmadan
büyütmeyi sağlıyor; genel kural budur, `clamp()`/`vw` tabanlı boyutlandırmaya
gidilmez.

**Responsive breakpoint'ler: telefon öncelikli (`phone-lg`/`phone-xl`).** Bu
oyun öncelikle telefon ekranı içindir ve gerçek telefon genişlikleri ~360-430px
arasında kalır — Tailwind'in varsayılan `sm` (640px) ve üzeri breakpoint'leri
**hiçbir telefonda tetiklenmez**, sadece tablet/masaüstü tarayıcı penceresinde
görünür olur (bir eleman "büyük ekranlarda orantılı büyüsün" denilip sadece
`sm:`/`md:` eklenirse, telefonda hiçbir şey değişmemiş gibi görünür — bunu
canlıda yaşadık). Hedef telefon ise (ki genelde öyledir), `tailwind.config.js`
→ `theme.extend.screens`'e eklenmiş şu özel breakpoint'leri kullan:

- `phone-lg: 393px` — standart büyük telefonlar (iPhone 14/15/16, Pixel vb.)
- `phone-xl: 428px` — en büyük telefonlar (iPhone Pro Max/Plus, Galaxy Ultra vb.)

Varsayılan `sm`/`md`/`lg`/`xl` (640/768/1024/1280px) olduğu gibi duruyor —
gerçek tablet/masaüstü önizleme senaryoları için ek bir bonus kademe olarak
kullanılabilir, ama telefonlar arası ölçeklemeyi bunlara **bağlama**. Örnek
zincir: `w-10 h-10 phone-lg:w-11 phone-lg:h-11 phone-xl:w-12 phone-xl:h-12
md:w-14 md:h-14 lg:w-16 lg:h-16` (bkz. `TheMenuHeader.vue`, `TheMenuFooter.vue`,
`CurrencyBadge.vue`, `LevelBadge.vue`).

**Kapsam / henüz yapılmadı:** Bu desen şimdilik sadece `TheMenuHeader.vue`,
`TheMenuFooter.vue`, `CurrencyBadge.vue` ve `LevelBadge.vue`'de uygulandı.
`TheGameHeader.vue`, `TheGameFooter.vue`, `SelectionBar.vue` gibi daha eski
dosyalarda hâlâ telefonda hiç tetiklenmeyen `sm:`/`md:` kullanımı var —
onlara dokunurken aynı `phone-lg:`/`phone-xl:` desenine geçir.

## i18n / Çeviriler

Yeni metin eklerken veya mevcut key'lerin **değerini** değiştirirken sadece
**`src/i18n/locales/tr.ts`** ve **`src/i18n/locales/en.ts`**'i düzenle. Diğer 11
dili (`ar`, `de`, `es`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `uk`, `zh`) elleme —
onları proje sahibi kendisi çevirip güncelliyor. Yeni bir key eklediğinde diğer
dillerde o key eksik kalır; bu kabul edilebilir (uygulama o key için tr/en
metnini fallback olarak kullanır ya da proje sahibi sonradan çevirir).

## State / Store Katmanı

Market, Sipariş, Harita, Ayarlar gibi bazı ekranlar aktif tasarım çalışması
sırasında **silindi** ama altlarındaki `playerStore`/`shopStore` verisi (para
birimleri, envanter, sipariş/karakter modeli, powerup fiyatları) **bilerek
duruyor** — yeni tasarımlar buraya bağlanacak. Ayrıntı ve hangi dosyanın nereye
gittiği için bkz. `IMPORTANT_SYSTEMS.md`.
