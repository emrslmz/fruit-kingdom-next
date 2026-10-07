import { defineConfig, loadEnv } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const hash = Math.floor(Math.random() * 90000) + 10000

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

  return defineConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      vue(),
      createHtmlPlugin({
        minify: true,
        inject: {
          data: {
            CROSS_APP_URL: process.env.VITE_CROSS_APP_URL,
            NODE_ENV: process.env.NODE_ENV,
            ROBOTS_INDEX_TYPE: process.env.VITE_ROBOTS_INDEX_TYPE,
          },
        },
      }),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/_variables.scss";`,
        },
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // Phaser ayrı dosyada: uygulama kodu değiştiğinde motor önbellekten gelir
          manualChunks: { phaser: ['phaser'] },
        },
      },
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    },
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.ico', '**/*.webp'],
    publicDir: 'public',
  })
}
