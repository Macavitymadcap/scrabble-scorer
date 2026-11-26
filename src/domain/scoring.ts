import { letterPoints } from './tiles.ts';
import {
  byTurnKind,
  type TilePlay,
  type TurnInput,
  type TurnStrategies,
  type WordPlay,
} from './types.ts';

export const BINGO_BONUS = 50;

const LETTER_MULTIPLIER = { none: 1, DL: 2, TL: 3 } as const;

/** Points for one tile, after any letter premium. Blanks score 0. */
export const tileScore = (tile: TilePlay): number =>
  tile.blank ? 0 : letterPoints(tile.letter) * LETTER_MULTIPLIER[tile.premium];

/** Word multiplier from the word squares covered: DW x2 and TW x3 each, stacking. */
export const wordMultiplier = (word: Pick<WordPlay, 'doubleWords' | 'tripleWords'>): number =>
  2 ** word.doubleWords * 3 ** word.tripleWords;

/** Points for one word: letter premiums first, then word multipliers. */
export const wordScore = (word: WordPlay): number => {
  const letters = word.tiles.reduce((sum, tile) => sum + tileScore(tile), 0);
  return letters * wordMultiplier(word);
};

/** The word as text: upper case, with blanks shown in lower case. */
export const wordText = (word: WordPlay): string =>
  word.tiles
    .map((tile) => (tile.blank ? tile.letter.toLowerCase() : tile.letter.toUpperCase()))
    .join('');

export interface TurnScore {
  /** Score of each word, in the order entered. */
  words: number[];
  /** 50 for a bingo, otherwise 0. */
  bingo: number;
  total: number;
}

const scoreNothing = (): TurnScore => ({ words: [], bingo: 0, total: 0 });

const TURN_SCORERS: TurnStrategies<TurnScore> = {
  play: (turn) => {
    const words = turn.words.map(wordScore);
    const bingo = turn.bingo ? BINGO_BONUS : 0;
    return { words, bingo, total: words.reduce((sum, w) => sum + w, 0) + bingo };
  },
  pass: scoreNothing,
  exchange: scoreNothing,
  withdrawn: scoreNothing,
};

/** Score breakdown for a turn. Passes, exchanges and withdrawn words score 0. */
export const scoreTurn = (turn: TurnInput): TurnScore => byTurnKind(TURN_SCORERS, turn);
