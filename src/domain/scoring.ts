import { letterPoints } from './tiles.ts';
import type { TilePlay, TurnInput, WordPlay } from './types.ts';

export const BINGO_BONUS = 50;

const LETTER_MULTIPLIER = { none: 1, DL: 2, TL: 3 } as const;

/** Points for one tile, after any letter premium. Blanks score 0. */
export function tileScore(tile: TilePlay): number {
  if (tile.blank) {
    return 0;
  }
  return letterPoints(tile.letter) * LETTER_MULTIPLIER[tile.premium];
}

/** Word multiplier from the word squares covered: DW x2 and TW x3 each, stacking. */
export function wordMultiplier(word: Pick<WordPlay, 'doubleWords' | 'tripleWords'>): number {
  return 2 ** word.doubleWords * 3 ** word.tripleWords;
}

/** Points for one word: letter premiums first, then word multipliers. */
export function wordScore(word: WordPlay): number {
  const letters = word.tiles.reduce((sum, tile) => sum + tileScore(tile), 0);
  return letters * wordMultiplier(word);
}

/** The word as text: upper case, with blanks shown in lower case. */
export function wordText(word: WordPlay): string {
  return word.tiles
    .map((tile) => (tile.blank ? tile.letter.toLowerCase() : tile.letter.toUpperCase()))
    .join('');
}

export interface TurnScore {
  /** Score of each word, in the order entered. */
  words: number[];
  /** 50 for a bingo, otherwise 0. */
  bingo: number;
  total: number;
}

/** Score breakdown for a turn. Passes, exchanges and withdrawn words score 0. */
export function scoreTurn(turn: TurnInput): TurnScore {
  if (turn.kind !== 'play') {
    return { words: [], bingo: 0, total: 0 };
  }
  const words = turn.words.map(wordScore);
  const bingo = turn.bingo ? BINGO_BONUS : 0;
  return { words, bingo, total: words.reduce((sum, w) => sum + w, 0) + bingo };
}
