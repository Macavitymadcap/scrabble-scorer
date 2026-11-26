import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Served from https://<user>.github.io/scrabble-scorer/
  base: '/scrabble-scorer/',

  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/domain/testing.ts'],
      thresholds: {
        // The rules live here; keep them fully covered.
        'src/domain/**': { 100: true },
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
