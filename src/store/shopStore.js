import { defineStore } from 'pinia'
import { purchaseService } from '@/core/services/PurchaseService'
import { usePlayerStore } from './playerStore'

export const useShopStore = defineStore('shop', {
  state: () => ({
    /**
     * Gerçek para ile satın alınabilecek ürünler.
     * GÜNCELLEME: Ürün listesi sadeleştirildi ve RevenueCat ID'leri güncellendi.
     */
    products: {
      diamondPackages: [
        {
          id: 'diamond_pack_small',
          revenueCatId: 'revenue.smallpack', // GÜNCELLENDİ
          nameKey: 'small_package',
          diamonds: 400,
          bonusPercentage: 20,
          image: '/assets/diamond_packages/dia1.png',
          gradient: 'from-purple-500 to-indigo-600',
          badgeKey: 'offer',
          price: '₺299.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
        {
          id: 'diamond_pack_medium',
          revenueCatId: 'revenue.mediumpack', // GÜNCELLENDİ
          nameKey: 'medium_package',
          diamonds: 700,
          bonusPercentage: 20,
          image: '/assets/diamond_packages/dia3.png',
          gradient: 'from-purple-500 to-indigo-600',
          badgeKey: 'offer',
          price: '₺299.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
      ],
      specialOffers: [
        {
          id: 'starter_offer',
          revenueCatId: 'revenue.special_package', // GÜNCELLENDİ
          nameKey: 'starter_offer',
          descriptionKey: 'starter_offer_description',
          content: {
            diamonds: 500,
            powerUps: [{ id: 'dynamite', quantity: 10 }],
          },
          image: '/assets/icons/box_gift.png',
          gradient: 'from-teal-400 to-cyan-600',
          price: '₺49.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
      ],
      utilities: [
        {
          id: 'remove_ads',
          revenueCatId: 'revenue.remove_ads', // GÜNCELLENDİ
          nameKey: 'remove_ads',
          descriptionKey: 'remove_ads_description',
          image: '/assets/icons/remove_ads.png',
          gradient: 'from-gray-700 via-gray-800 to-black',
          price: '₺89.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
      ],
      // YENİ: Gerçek para ile altın paketleri. NOT: Bu revenueCatId'ler için
      // App Store Connect / Play Console + RevenueCat dashboard'da henüz
      // ürün/offering oluşturulmadı — canlıya almadan önce eklenmesi gerekiyor.
      goldPackages: [
        {
          id: 'gold_pack_small',
          revenueCatId: 'revenue.goldpack_small',
          nameKey: 'gold_pack_small',
          gold: 1000,
          image: '/assets/gold_packages/gold1.png',
          price: '₺49.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
        {
          id: 'gold_pack_medium',
          revenueCatId: 'revenue.goldpack_medium',
          nameKey: 'gold_pack_medium',
          gold: 3000,
          image: '/assets/gold_packages/gold2.png',
          price: '₺99.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
        {
          id: 'gold_pack_large',
          revenueCatId: 'revenue.goldpack_large',
          nameKey: 'gold_pack_large',
          gold: 7000,
          image: '/assets/gold_packages/gold3.png',
          price: '₺199.99', // Varsayılan fiyat, RevenueCat'ten gelenle güncellenecek
        },
      ],
    },

    /**
     * YENİ: Oyun içi para birimleri arasında değişim teklifleri
     * (altın ← elmas, enerji ← altın). Değerler ilk sürüm için varsayılan —
     * ekonomi dengesine göre ayarlanmalı.
     */
    exchangeOffers: {
      diamondToGold: [
        { id: 'gold_x_small', diamonds: 50, gold: 500 },
        { id: 'gold_x_medium', diamonds: 100, gold: 1200 },
        { id: 'gold_x_large', diamonds: 250, gold: 3500 },
      ],
      goldToEnergy: [
        { id: 'energy_x_small', gold: 500, energy: 20 },
        { id: 'energy_x_medium', gold: 1000, energy: 50 },
        { id: 'energy_x_full', gold: 2000, energy: 100 },
      ],
    },

    /**
     * Oyun içi para birimi (elmas) ile alınabilen güçlendirmeler.
     */
    powerUps: [
      {
        id: 'dynamite',
        name: 'dynamite',
        description: 'dynamite_description',
        icon: '🔨',
        img: '/assets/power_ups/dynamite.png',
        price: 25, // Elmas cinsinden fiyat
      },
      {
        id: 'brush', 
        name: 'brush',
        description: 'brush_description', 
        icon: '🧹',
        img: '/assets/power_ups/brush.png', 
        price: 35,
      },
      {
        id: 'tornado', 
        name: 'tornado',
        description: 'tornado_description', 
        icon: '💨',
        img: '/assets/power_ups/tornado.png',
        price: 50,
      },
    ],

    /**
     * YENİ: Kutu açma (Cases) sistemi ürünleri.
     */
    cases: [
      {
        id: 'daily_free',
        nameKey: 'daily_free_case',
        image: '/assets/cases/wood_case.png',
        priceType: 'free',
        price: 0,
        drops: [
          { type: 'diamond', amount: 25, chance: 2 },
          { type: 'diamond', amount: 10, chance: 8 },
          { type: 'diamond', amount: 5, chance: 15 },
          { type: 'diamond', amount: 1, chance: 25 },
          { type: 'powerup', id: 'random', amount: 1, chance: 50 },
        ],
      },
      {
        id: 'bronze_case',
        nameKey: 'bronze_case',
        image: '/assets/cases/rustic_case.png',
        priceType: 'gold',
        price: 1000,
        drops: [
          { type: 'diamond', amount: 50, chance: 2 },
          { type: 'diamond', amount: 20, chance: 13 },
          { type: 'diamond', amount: 5, chance: 25 },
          { type: 'powerup', id: 'random', amount: 2, chance: 10 },
          { type: 'powerup', id: 'random', amount: 1, chance: 50 },
        ],
      },
      {
        id: 'silver_case',
        nameKey: 'silver_case',
        image: '/assets/cases/steel_case.png',
        priceType: 'gold',
        price: 2500,
        drops: [
          { type: 'diamond', amount: 150, chance: 2 },
          { type: 'diamond', amount: 50, chance: 13 },
          { type: 'diamond', amount: 20, chance: 25 },
          { type: 'powerup', id: 'random', amount: 5, chance: 10 },
          { type: 'powerup', id: 'random', amount: 2, chance: 50 },
        ],
      },
      {
        id: 'gold_case',
        nameKey: 'gold_case',
        image: '/assets/cases/gear_case.png',
        priceType: 'gold',
        price: 6000,
        drops: [
          { type: 'diamond', amount: 500, chance: 2 },
          { type: 'diamond', amount: 200, chance: 13 },
          { type: 'diamond', amount: 75, chance: 25 },
          { type: 'powerup', id: 'random', amount: 15, chance: 10 },
          { type: 'powerup', id: 'random', amount: 5, chance: 50 },
        ],
      },
    ],
  }),

  actions: {
    /**
     * YENİ: Belirli bir güçlendirmeden istenen adette satın alma işlemini yönetir.
     * @param {string} itemId - Satın alınacak ürünün ID'si.
     * @param {number} quantity - Satın alınacak miktar.
     * @returns {{success: boolean, message: string}} - İşlem sonucu.
     */
    buySinglePowerUp(itemId, quantity) {
      if (quantity <= 0) {
        return { success: false, message: 'invalid_quantity' }
      }

      const playerStore = usePlayerStore()
      const item = this.powerUps.find(p => p.id === itemId)

      if (!item) {
        return { success: false, message: 'product_not_found' }
      }

      const totalCost = item.price * quantity
      const hasEnoughDiamonds = playerStore.currencies.diamonds >= totalCost

      if (!hasEnoughDiamonds) {
        return { success: false, message: 'not_enough_diamonds' }
      }

      const spendSuccess = playerStore.spendCurrency('diamonds', totalCost)
      if (spendSuccess) {
        playerStore.addPowerUp(itemId, quantity)
        return { success: true, message: 'purchased_powerup' }
      }

      return { success: false, message: 'payment_error' }
    },

    /**
     * YENİ: Gerçek para ile elmas/özel paket satın alır (RevenueCat üzerinden).
     */
    async buyDiamondPackage(packageId) {
      const pkg = this.products.diamondPackages.find(p => p.id === packageId) || this.products.specialOffers.find(p => p.id === packageId)
      if (!pkg) {
        return { success: false, message: 'product_not_found' }
      }

      const result = await purchaseService.purchase(pkg.revenueCatId)
      if (!result.success) {
        return { success: false, message: result.cancelled ? null : (result.message ?? 'purchase_failed') }
      }

      const playerStore = usePlayerStore()
      if (pkg.content) { // Special offer (diamonds + powerups)
        if (pkg.content.diamonds) playerStore.addCurrency('diamonds', pkg.content.diamonds)
        if (pkg.content.powerUps) {
          pkg.content.powerUps.forEach(pu => {
            playerStore.addPowerUp(pu.id, pu.quantity)
          })
        }
      } else if (pkg.diamonds) { // Diamond package
        playerStore.addCurrency('diamonds', pkg.diamonds)
      }
      return { success: true, message: 'purchased_diamond' }
    },

    /**
     * YENİ: Gerçek para ile bir altın paketi satın alır (RevenueCat üzerinden).
     * @param {string} packageId
     * @returns {Promise<{success: boolean, message: string|null}>}
     */
    async buyGoldPackage(packageId) {
      const pkg = this.products.goldPackages.find(p => p.id === packageId)
      if (!pkg) {
        return { success: false, message: 'product_not_found' }
      }

      const result = await purchaseService.purchase(pkg.revenueCatId)
      if (!result.success) {
        // Kullanıcı satın almayı iptal ettiyse toast göstermeye gerek yok.
        return { success: false, message: result.cancelled ? null : (result.message ?? 'purchase_failed') }
      }

      const playerStore = usePlayerStore()
      playerStore.addCurrency('gold', pkg.gold)
      return { success: true, message: 'purchased_gold' }
    },

    /**
     * YENİ: Elmas harcayarak altın satın alır.
     * @param {string} offerId
     * @returns {{success: boolean, message: string}}
     */
    buyGoldWithDiamonds(offerId) {
      const offer = this.exchangeOffers.diamondToGold.find(o => o.id === offerId)
      if (!offer) {
        return { success: false, message: 'product_not_found' }
      }

      const playerStore = usePlayerStore()
      if (playerStore.currencies.diamonds < offer.diamonds) {
        return { success: false, message: 'not_enough_diamonds' }
      }

      playerStore.spendCurrency('diamonds', offer.diamonds)
      playerStore.addCurrency('gold', offer.gold)
      return { success: true, message: 'purchased_gold' }
    },

    /**
     * YENİ: Altın harcayarak enerji satın alır.
     * @param {string} offerId
     * @returns {{success: boolean, message: string}}
     */
    buyEnergyWithGold(offerId) {
      const offer = this.exchangeOffers.goldToEnergy.find(o => o.id === offerId)
      if (!offer) {
        return { success: false, message: 'product_not_found' }
      }

      const playerStore = usePlayerStore()
      if (playerStore.currencies.gold < offer.gold) {
        return { success: false, message: 'not_enough_gold' }
      }

      playerStore.spendCurrency('gold', offer.gold)
      playerStore.addEnergy(offer.energy)
      return { success: true, message: 'purchased_energy' }
    },

    /**
     * YENİ: Kutu açma işlemi.
     * @param {string} caseId
     * @returns {{success: boolean, drop: Object, message: string}}
     */
    openCase(caseId) {
      const playerStore = usePlayerStore()
      const box = this.cases.find(c => c.id === caseId)

      if (!box) {
        return { success: false, message: 'product_not_found' }
      }

      if (box.priceType === 'free') {
        if (!playerStore.canOpenFreeCase()) {
          return { success: false, message: 'free_case_not_ready' }
        }
        playerStore.recordFreeCaseOpen()
      } else if (box.priceType === 'gold') {
        if (playerStore.currencies.gold < box.price) {
          return { success: false, message: 'not_enough_gold' }
        }
        playerStore.spendCurrency('gold', box.price)
      } else if (box.priceType === 'diamond') {
        if (playerStore.currencies.diamonds < box.price) {
          return { success: false, message: 'not_enough_diamonds' }
        }
        playerStore.spendCurrency('diamonds', box.price)
      }

      // Rastgele eşya belirleme
      let drop = null
      let rand = Math.random() * 100
      let cumulative = 0
      for (const d of box.drops) {
        cumulative += d.chance
        if (rand < cumulative) {
          drop = { ...d }
          break
        }
      }
      
      // Hata koruması
      if (!drop) drop = { ...box.drops[0] }

      // Eşyayı envantere ekleme
      if (drop.type === 'diamond') {
        playerStore.addCurrency('diamonds', drop.amount)
      } else if (drop.type === 'powerup') {
        let powerupId = drop.id
        if (powerupId === 'random') {
          const randomIdx = Math.floor(Math.random() * this.powerUps.length)
          powerupId = this.powerUps[randomIdx].id
          drop.id = powerupId // drop referansı UI'a dönecek, id'yi güncelleyelim.
        }
        playerStore.addPowerUp(powerupId, drop.amount)
      }

      return { success: true, drop, message: 'case_opened' }
    },
  },
})
