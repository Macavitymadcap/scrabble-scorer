import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

export default defineConfig({
  // Served from https://<user>.github.io/scrabble-scorer/
  base: '/scrabble-scorer/',

  plugins: [
    VitePWA({
      // New versions wait until the player chooses to reload (see main.ts).
      registerType: 'prompt',
      injectRegister: false,
      // Icons are generated once with `npm run generate:icons` and committed.
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/scrabble-scorer/',
        name: 'Scrabble Scorer',
        short_name: 'Scorer',
        description: 'Keep score for a game of Scrabble on a real board.',
        lang: 'en-GB',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#087f5b',
        background_color: '#f8f9fa',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // Take control of the open page as soon as the first service worker
        // activates, so the word list is cached even on a first visit. New
        // versions still wait for the player to choose Reload (no skipWaiting).
        clientsClaim: true,
        // The word list (~1.7 MB) isn't precached; it's cached the first time
        // it's fetched. Its name is content-hashed, so a new list is a new URL.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/en-gb-[\w-]+\.txt$/,
            handler: 'CacheFirst',
            options: { cacheName: 'word-list', expiration: { maxEntries: 2 } },
          },
        ],
      },
    }),
  ],

  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        // Pre-bundle browser-test dependencies, so the first run (e.g. in CI)
        // doesn't fail while Vite optimises them and reloads.
        optimizeDeps: {
          include: [
            'vite-plus/test/browser/context',
            'lit',
            'lit/decorators.js',
            'lit/directives/repeat.js',
            'lit/directives/keyed.js',
          ],
        },
        test: {
          // Component tests in a real browser. Playwright is pinned to the
          // version whose Chromium is already in ~/.cache/ms-playwright.
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          setupFiles: ['src/ui/test-setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'scripts/wordlist.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/testing.ts', 'src/ui/test-setup.ts', 'src/main.ts'],
      thresholds: {
        // The rules and their persistence; keep them fully covered.
        'src/domain/**': { 100: true },
        'src/state/**': { 100: true },
        'src/ui/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },

  lint: {
    ignorePatterns: ['dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },

  fmt: {
    singleQuote: true,
  },
});
