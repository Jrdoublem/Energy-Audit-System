import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service workers only run against a built app (`vite build` +
      // `vite preview`), never `vite dev` — devOptions.enabled would let it
      // run in dev too, but that's more likely to confuse HMR than help.
      manifest: {
        name: 'ENGINSPECT — Energy Audit System',
        short_name: 'ENGINSPECT',
        description: 'Factory energy audit system — SID-EN Co., Ltd.',
        theme_color: '#0F2854',
        background_color: '#0F2854',
        display: 'standalone',
        start_url: '/home',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell (JS/CSS/HTML/fonts) so it loads with
        // zero connectivity, on top of the Firestore offline cache that
        // already handles the data itself.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Equipment/catalog photos in Firebase Storage — cache what's
            // already been viewed so it still renders offline; anything
            // never opened while online just won't have a cached copy yet.
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})