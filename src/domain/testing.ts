import type { Premium, TilePlay, TurnInput, WordPlay } from './types.ts';

/** Notation markers that put the previous letter on a premium square. */
const PREMIUM_MARKERS: Readonly<Record<string, Premium>> = { '2': 'DL', '3': 'TL' };

const addPremium = (tiles: TilePlay[], premium: Premium, notation: string): void => {
  const last = tiles.at(-1);
  if (!last) {
    throw new Error(`Premium marker with no letter in ${notation}`);
  }
  last.premium = premium;
};

const toTile = (char: string): TilePlay => ({
  letter: char.toUpperCase(),
  blank: char !== char.toUpperCase(),
  premium: 'none',
});

/**
 * Test helper: builds a word from compact notation.
 *
 * - Upper case letter: normal tile. Lower case: blank standing for that letter.
 * - A `2` or `3` after a letter: that tile is on a double or triple letter square.
 *
 * `word('ZA3P')` is Z, A on a TL, P. `word('qUIZ', { dw: 1 })` is a blank Q
 * with the word on one double word square.
 */
export const word = (notation: string, { dw = 0, tw = 0 } = {}): WordPlay => {
  const tiles: TilePlay[] = [];
  for (const char of notation) {
    const premium = PREMIUM_MARKERS[char];
    if (premium) {
      addPremium(tiles, premium, notation);
      continue;
    }
    tiles.push(toTile(char));
  }
  return { tiles, doubleWords: dw, tripleWords: tw };
};

export const play = (words: WordPlay[], bingo = false): TurnInput => ({
  kind: 'play',
  words,
  bingo,
});
