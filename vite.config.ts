import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Served from https://<user>.github.io/scrabble-scorer/
  base: '/scrabble-scorer/',

  test: {
    include: ['src/**/*.test.ts'],
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
