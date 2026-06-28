import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HoneyHive Tasting',
        short_name: 'HoneyTaste',
        description: 'Scan honey straw QR code to taste and rate varietals',
        theme_color: '#D97706',
        background_color: '#FEF3C7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        shortcuts: [{
          name: 'Start Tasting',
          short_name: 'Taste',
          description: 'Begin a new tasting session',
          url: '/?new=1',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
        }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.honeyhive\.com\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 }, networkTimeoutSeconds: 10 }
        }]
      }
    })
  ],
  server: { host: true, port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})
