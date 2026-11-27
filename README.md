# Scrabble Scorer

A client-side web app (PWA) for keeping score in a real-world game of Scrabble.

Live at https://macavitymadcap.github.io/scrabble-scorer/ (deployed from `main`).
See [docs/DESIGN.md](docs/DESIGN.md) for the design.

## Development

Requires Node.js (version in `.nvmrc`) and npm.

```bash
nvm use
npm install
npm run dev
```

Component tests (`*.browser.test.ts`) run in headless Chromium through
Playwright. If Playwright's Chromium for the pinned version isn't already in
`~/.cache/ms-playwright`, install it once with `npx playwright install chromium`.

| Script                                      | What it does                                    |
| ------------------------------------------- | ----------------------------------------------- |
| `npm run dev`                               | Start the dev server                            |
| `npm run build`                             | Production build to `dist/`                     |
| `npm run preview`                           | Serve the production build                      |
| `npm run check`                             | Format check, lint and type check (`vp check`)  |
| `npm run fix`                               | Format and apply safe lint fixes                |
| `npm test`                                  | Run the tests once                              |
| `npm run test:watch`                        | Run the tests in watch mode                     |
| `npm run test:coverage`                     | Run the tests once with coverage                |
| `npm run generate:icons`                    | Regenerate the app icons from `public/icon.svg` |
| `npm run build:wordlist -- --enable <file>` | Rebuild the word list (see `docs/DESIGN.md`)    |
