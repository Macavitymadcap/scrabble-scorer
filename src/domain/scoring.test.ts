import { describe, expect, it } from 'vite-plus/test';
import {
  BINGO_BONUS,
  scoreTurn,
  tileScore,
  wordMultiplier,
  wordScore,
  wordText,
} from './scoring.ts';
import { play, word } from './testing.ts';
import type { TilePlay, TurnInput } from './types.ts';

const tile = (letter: string, overrides: Partial<TilePlay> = {}): TilePlay => ({
  letter,
  blank: false,
  premium: 'none',
  ...overrides,
});

describe('tileScore', () => {
  it('scores a plain tile at face value', () => {
    // Arrange
    const plainK = tile('K');

    // Act
    const score = tileScore(plainK);

    // Assert
    expect(score).toBe(5);
  });

  it('doubles a tile on a double letter square', () => {
    // Arrange
    const kOnDoubleLetter = tile('K', { premium: 'DL' });

    // Act
    const score = tileScore(kOnDoubleLetter);

    // Assert
    expect(score).toBe(10);
  });

  it('triples a tile on a triple letter square', () => {
    // Arrange
    const kOnTripleLetter = tile('K', { premium: 'TL' });

    // Act
    const score = tileScore(kOnTripleLetter);

    // Assert
    expect(score).toBe(15);
  });

  it('scores a blank as 0', () => {
    // Arrange
    const blankZ = tile('Z', { blank: true });

    // Act
    const score = tileScore(blankZ);

    // Assert
    expect(score).toBe(0);
  });

  it('scores a blank on a triple letter square as 0', () => {
    // Arrange
    const blankZOnTripleLetter = tile('Z', { blank: true, premium: 'TL' });

    // Act
    const score = tileScore(blankZOnTripleLetter);

    // Assert
    expect(score).toBe(0);
  });
});

describe('wordMultiplier', () => {
  it.each([
    [0, 0, 1],
    [1, 0, 2],
    [2, 0, 4],
    [0, 1, 3],
    [0, 2, 9],
    [0, 3, 27],
    [1, 1, 6],
    [1, 2, 18],
  ])('%i DW and %i TW give x%i', (doubleWords, tripleWords, expected) => {
    // Arrange
    const squares = { doubleWords, tripleWords };

    // Act
    const multiplier = wordMultiplier(squares);

    // Assert
    expect(multiplier).toBe(expected);
  });
});

describe('wordScore', () => {
  it('adds up plain letters', () => {
    // Arrange
    const cat = word('CAT');

    // Act
    const score = wordScore(cat);

    // Assert
    expect(score).toBe(3 + 1 + 1);
  });

  it('scores a blank in the word as 0', () => {
    // Arrange
    const catWithBlankC = word('cAT');

    // Act
    const score = wordScore(catWithBlankC);

    // Assert
    expect(score).toBe(0 + 1 + 1);
  });

  it('ignores a letter premium under a blank', () => {
    // Arrange
    const blankAOnDoubleLetter = word('Ca2T');

    // Act
    const score = wordScore(blankAOnDoubleLetter);

    // Assert
    expect(score).toBe(3 + 0 + 1);
  });

  it('applies a letter premium', () => {
    // Arrange
    const zOnTripleLetter = word('Z3AP');

    // Act
    const score = wordScore(zOnTripleLetter);

    // Assert
    expect(score).toBe(30 + 1 + 3);
  });

  it('doubles the word on the centre star (first move)', () => {
    // Arrange
    const quizOnStar = word('QUIZ', { dw: 1 });

    // Act
    const score = wordScore(quizOnStar);

    // Assert
    expect(score).toBe((10 + 1 + 1 + 10) * 2);
  });

  it('applies letter premiums before the word multiplier', () => {
    // Arrange
    const letterAndWordPremium = word('Z3AP', { dw: 1 });

    // Act
    const score = wordScore(letterAndWordPremium);

    // Assert
    expect(score).toBe((30 + 1 + 3) * 2);
  });

  it('multiplies a double-double by 4', () => {
    // Arrange
    const doubleDouble = word('JOKERS', { dw: 2 });

    // Act
    const score = wordScore(doubleDouble);

    // Assert
    expect(score).toBe((8 + 1 + 5 + 1 + 1 + 1) * 4);
  });

  it('multiplies a triple-triple by 9', () => {
    // Arrange
    const tripleTriple = word('QUIXOTE', { tw: 2 });

    // Act
    const score = wordScore(tripleTriple);

    // Assert
    expect(score).toBe((10 + 1 + 1 + 8 + 1 + 1 + 1) * 9);
  });

  it('counts a blank as 0 within a multiplied word', () => {
    // Arrange
    const blankQOnTripleWord = word('qUIZ', { tw: 1 });

    // Act
    const score = wordScore(blankQOnTripleWord);

    // Assert
    expect(score).toBe((0 + 1 + 1 + 10) * 3);
  });

  it('scores a word of only blanks as 0, whatever the multipliers', () => {
    // Arrange
    const onlyBlanks = word('ab', { tw: 3 });

    // Act
    const score = wordScore(onlyBlanks);

    // Assert
    expect(score).toBe(0);
  });
});

describe('wordText', () => {
  it('shows normal tiles in upper case', () => {
    // Arrange
    const quiz = word('QUIZ');

    // Act
    const text = wordText(quiz);

    // Assert
    expect(text).toBe('QUIZ');
  });

  it('shows blanks in lower case', () => {
    // Arrange
    const quizWithBlankQ = word('qU2IZ');

    // Act
    const text = wordText(quizWithBlankQ);

    // Assert
    expect(text).toBe('qUIZ');
  });
});

describe('scoreTurn', () => {
  it('scores a single-word play', () => {
    // Arrange
    const turn = play([word('CAT')]);

    // Act
    const score = scoreTurn(turn);

    // Assert
    expect(score).toEqual({ words: [5], bingo: 0, total: 5 });
  });

  it('counts a shared letter premium in both words', () => {
    // Arrange: FAX across with X on a DL; XI down shares that X.
    const turn = play([word('FAX2'), word('X2I')]);

    // Act
    const score = scoreTurn(turn);

    // Assert
    expect(score).toEqual({ words: [4 + 1 + 16, 16 + 1], bingo: 0, total: 21 + 17 });
  });

  it('adds the bingo bonus once, after word multipliers', () => {
    // Arrange
    const turn = play([word('RETAINS', { dw: 1 }), word('AS')], true);
    const retains = 7 * 2;

    // Act
    const score = scoreTurn(turn);

    // Assert
    expect(score).toEqual({
      words: [retains, 2],
      bingo: BINGO_BONUS,
      total: retains + 2 + 50,
    });
  });

  it('scores a pass as 0', () => {
    // Arrange
    const turn: TurnInput = { kind: 'pass' };

    // Act
    const score = scoreTurn(turn);

    // Assert
    expect(score).toEqual({ words: [], bingo: 0, total: 0 });
  });

  it('scores an exchange as 0', () => {
    // Arrange
    const turn: TurnInput = { kind: 'exchange' };

    // Act
    const score = scoreTurn(turn);

    // Assert
    expect(score).toEqual({ words: [], bingo: 0, total: 0 });
  });

  it('scores a withdrawn word as 0', () => {
    // Arrange
    const turn: TurnInput = { kind: 'withdrawn' };

    // Act
    const score = scoreTurn(turn);

    // Assert
    expect(score).toEqual({ words: [], bingo: 0, total: 0 });
  });
});
