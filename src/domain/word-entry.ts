import type { Premium, TilePlay, WordPlay } from './types.ts';
import { BOARD_SIZE, MAX_WORD_SQUARES } from './validation.ts';

/**
 * How a tile is marked during entry. A blank scores 0 whatever square it's
 * on, so its letter premium never matters and "blank" is a single mark.
 */
export type TileMark = 'none' | 'DL' | 'TL' | 'blank';

/** The tile fields each mark sets. */
const MARK_FIELDS: Readonly<Record<TileMark, { premium: Premium; blank: boolean }>> = {
  none: { premium: 'none', blank: false },
  DL: { premium: 'DL', blank: false },
  TL: { premium: 'TL', blank: false },
  blank: { premium: 'none', blank: true },
};

/** Tapping a tile moves it to the next mark: none -> DL -> TL -> blank -> none. */
export const NEXT_MARK: Readonly<Record<TileMark, TileMark>> = {
  none: 'DL',
  DL: 'TL',
  TL: 'blank',
  blank: 'none',
};

/** A tile's current mark. */
export const tileMark = (tile: TilePlay): TileMark => (tile.blank ? 'blank' : tile.premium);

/** The tile with the given mark. */
export const withMark = (tile: TilePlay, mark: TileMark): TilePlay => ({
  ...tile,
  ...MARK_FIELDS[mark],
});

/** The tile with its next mark. */
export const cycleTile = (tile: TilePlay): TilePlay => withMark(tile, NEXT_MARK[tileMark(tile)]);

/** A word's letters as typed: upper case A-Z only, at most the width of the board. */
export const normaliseWordText = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, BOARD_SIZE);

/** A word with no letters and no word squares. */
export const emptyWord = (): WordPlay => ({ tiles: [], doubleWords: 0, tripleWords: 0 });

/**
 * The word with its tiles rebuilt for new text. A tile keeps its mark when
 * the letter at its position is unchanged, so fixing a typo near the end
 * doesn't clear premiums marked earlier in the word.
 */
export const retile = (word: WordPlay, text: string): WordPlay => {
  const letters = normaliseWordText(text).split('');
  const tiles = letters.map((letter, index): TilePlay => {
    const previous = word.tiles[index];
    const mark = previous?.letter === letter ? tileMark(previous) : 'none';
    return withMark({ letter, blank: false, premium: 'none' }, mark);
  });
  return { ...word, tiles };
};

/** The word's letters as plain text (blanks included, in upper case). */
export const wordLetters = (word: WordPlay): string => word.tiles.map((t) => t.letter).join('');

export type WordSquare = 'doubleWords' | 'tripleWords';

const OTHER_SQUARE: Readonly<Record<WordSquare, WordSquare>> = {
  doubleWords: 'tripleWords',
  tripleWords: 'doubleWords',
};

/** Whether the word can have `count` squares of this kind without exceeding the limit. */
export const canHaveSquares = (word: WordPlay, square: WordSquare, count: number): boolean =>
  count + word[OTHER_SQUARE[square]] <= MAX_WORD_SQUARES;
