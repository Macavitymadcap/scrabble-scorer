import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Served from https://<user>.github.io/scrabble-scorer/
  base: '/scrabble-scorer/',

  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/testing.ts'],
      thresholds: {
        // The rules and their persistence; keep them fully covered.
        'src/domain/**': { 100: true },
        'src/state/**': { 100: true },
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
