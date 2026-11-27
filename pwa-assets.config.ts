import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the favicon, Apple touch icon, PWA icons and a maskable icon from
// one SVG at build time. The maskable icon gets a cream background with the
// tile inside the safe zone.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#fff3bf' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#fff3bf' } },
  },
  images: ['public/icon.svg'],
});
