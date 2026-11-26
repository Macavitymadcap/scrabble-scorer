import type { Premium, TilePlay, TurnInput, WordPlay } from './types.ts';

/**
 * Test helper: builds a word from compact notation.
 *
 * - Upper case letter: normal tile. Lower case: blank standing for that letter.
 * - A `2` or `3` after a letter: that tile is on a double or triple letter square.
 *
 * `word('ZA3P')` is Z, A on a TL, P. `word('qUIZ', { dw: 1 })` is a blank Q
 * with the word on one double word square.
 */
export function word(notation: string, { dw = 0, tw = 0 } = {}): WordPlay {
  const tiles: TilePlay[] = [];
  for (const char of notation) {
    if (char === '2' || char === '3') {
      const last = tiles.at(-1);
      if (!last) {
        throw new Error(`Premium marker with no letter in ${notation}`);
      }
      last.premium = (char === '2' ? 'DL' : 'TL') satisfies Premium;
    } else {
      tiles.push({
        letter: char.toUpperCase(),
        blank: char !== char.toUpperCase(),
        premium: 'none',
      });
    }
  }
  return { tiles, doubleWords: dw, tripleWords: tw };
}

export function play(words: WordPlay[], bingo = false): TurnInput {
  return { kind: 'play', words, bingo };
}
