/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app under /carlesso-fotoquad/; local dev uses /.
const base = process.env.GITHUB_PAGES === 'true' ? '/carlesso-fotoquad/' : '/';

export default defineConfig({
  base,
  server: { port: 5173, host: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'card-back.jpg', 'photos/photos.json', 'photos/demo/*.jpg'],
      manifest: {
        name: 'FotoQuad — Il Solitario di Famiglia',
        short_name: 'FotoQuad',
        description: 'Ricomponi le foto di famiglia dai loro 4 pezzi su un tavolo verde da solitario.',
        lang: 'it',
        orientation: 'portrait',
        display: 'standalone',
        theme_color: '#1f6b34',
        background_color: '#123f20',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell and every photo so the game works fully offline (FR-10).
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        // The optional private manifest may not exist: never serve index.html in its place.
        navigateFallbackDenylist: [/\/photos\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/test-helpers.ts', 'src/main.ts', 'src/**/*.d.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
