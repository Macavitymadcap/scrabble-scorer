import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

export default defineConfig({
  // Served from https://<user>.github.io/scrabble-scorer/
  base: '/scrabble-scorer/',

  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
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
      include: ['src/**/*.ts'],
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
