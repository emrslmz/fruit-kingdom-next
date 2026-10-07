module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Gerçek telefon genişlikleri için ek breakpoint'ler. Varsayılan `sm`
      // (640px) ve üzeri, hiçbir telefonun genişliğine girmiyor (en büyük
      // telefonlar bile ~430px) — bu yüzden telefon ekranları arasında
      // orantılı büyüme için bu ek adımlar var. `sm`/`md`/`lg`/`xl` mevcut
      // haliyle korunuyor (tablet/masaüstü önizleme için).
      screens: {
        'phone-lg': '393px', // iPhone 14/15/16 standart, Pixel vb. büyük telefonlar
        'phone-xl': '428px', // iPhone Pro Max/Plus, Galaxy Ultra gibi en büyük telefonlar
      },
      backgroundImage: {
        'island-background': 'url(\'/assets/backgrounds/island1.png\')',
        'clouds-background': 'url(\'/assets/backgrounds/cloud2.png\')',
        'grass-background': 'url(\'/assets/backgrounds/grass_side.png\')',
        'marble-background': 'url(\'/assets/backgrounds/marble_side.png\')',
        'forest-background': 'url(\'/assets/backgrounds/forest_side.png\')',
        'wooden-background': 'url(\'/assets/backgrounds/wooden.png\')',
        'home-background': 'url(\'/assets/backgrounds/home.png\')',
        'order-background': 'url(\'/assets/backgrounds/order_side_clear.png\')',
        'lawn-background': 'url(\'/assets/backgrounds/lawn.png\')',
        'leaf-background': 'url(\'/assets/backgrounds/leaf.png\')',
        'sand-background': 'url(\'/assets/backgrounds/sand.png\')',
        'green-deco-background': 'url(\'/assets/backgrounds/green_deco.png\')',
        'black-grid-background': 'url(\'/assets/backgrounds/black_grid.png\')',
        'market-background': 'url(\'/assets/backgrounds/market_background.jpeg\')',
        'purchase-background': 'url(\'/assets/backgrounds/purchase_background.jpg\')',
      },
      keyframes: {
        textBounce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
      animation: {
        textBounce: 'textBounce 1s infinite',
      },
    },
  },
  plugins: [
  ],
}
