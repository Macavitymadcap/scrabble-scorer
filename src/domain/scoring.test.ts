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
import type { TilePlay } from './types.ts';

function tile(letter: string, overrides: Partial<TilePlay> = {}): TilePlay {
  return { letter, blank: false, premium: 'none', ...overrides };
}

describe('tileScore', () => {
  it('scores a plain tile at face value', () => {
    // Act
    const score = tileScore(tile('K'));

    // Assert
    expect(score).toBe(5);
  });

  it('doubles a tile on a double letter square', () => {
    // Act
    const score = tileScore(tile('K', { premium: 'DL' }));

    // Assert
    expect(score).toBe(10);
  });

  it('triples a tile on a triple letter square', () => {
    // Act
    const score = tileScore(tile('K', { premium: 'TL' }));

    // Assert
    expect(score).toBe(15);
  });

  it('scores a blank as 0', () => {
    // Act
    const score = tileScore(tile('Z', { blank: true }));

    // Assert
    expect(score).toBe(0);
  });

  it('scores a blank on a triple letter square as 0', () => {
    // Act
    const score = tileScore(tile('Z', { blank: true, premium: 'TL' }));

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
    // Act
    const multiplier = wordMultiplier({ doubleWords, tripleWords });

    // Assert
    expect(multiplier).toBe(expected);
  });
});

describe('wordScore', () => {
  it('adds up plain letters', () => {
    // Act
    const score = wordScore(word('CAT'));

    // Assert
    expect(score).toBe(3 + 1 + 1);
  });

  it('scores a blank in the word as 0', () => {
    // Act
    const score = wordScore(word('cAT'));

    // Assert
    expect(score).toBe(0 + 1 + 1);
  });

  it('ignores a letter premium under a blank', () => {
    // Act
    const score = wordScore(word('Ca2T'));

    // Assert
    expect(score).toBe(3 + 0 + 1);
  });

  it('applies a letter premium', () => {
    // Act
    const score = wordScore(word('Z3AP'));

    // Assert
    expect(score).toBe(30 + 1 + 3);
  });

  it('doubles the word on the centre star (first move)', () => {
    // Act
    const score = wordScore(word('QUIZ', { dw: 1 }));

    // Assert
    expect(score).toBe((10 + 1 + 1 + 10) * 2);
  });

  it('applies letter premiums before the word multiplier', () => {
    // Act
    const score = wordScore(word('Z3AP', { dw: 1 }));

    // Assert
    expect(score).toBe((30 + 1 + 3) * 2);
  });

  it('multiplies a double-double by 4', () => {
    // Act
    const score = wordScore(word('JOKERS', { dw: 2 }));

    // Assert
    expect(score).toBe((8 + 1 + 5 + 1 + 1 + 1) * 4);
  });

  it('multiplies a triple-triple by 9', () => {
    // Act
    const score = wordScore(word('QUIXOTE', { tw: 2 }));

    // Assert
    expect(score).toBe((10 + 1 + 1 + 8 + 1 + 1 + 1) * 9);
  });

  it('multiplies a blank as 0 within a multiplied word', () => {
    // Act
    const score = wordScore(word('qUIZ', { tw: 1 }));

    // Assert
    expect(score).toBe((0 + 1 + 1 + 10) * 3);
  });

  it('scores a word of only blanks as 0, whatever the multipliers', () => {
    // Act
    const score = wordScore(word('ab', { tw: 3 }));

    // Assert
    expect(score).toBe(0);
  });
});

describe('wordText', () => {
  it('shows normal tiles in upper case', () => {
    // Act
    const text = wordText(word('QUIZ'));

    // Assert
    expect(text).toBe('QUIZ');
  });

  it('shows blanks in lower case', () => {
    // Act
    const text = wordText(word('qU2IZ'));

    // Assert
    expect(text).toBe('qUIZ');
  });
});

describe('scoreTurn', () => {
  it('scores a single-word play', () => {
    // Act
    const score = scoreTurn(play([word('CAT')]));

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
    // Act
    const score = scoreTurn({ kind: 'pass' });

    // Assert
    expect(score).toEqual({ words: [], bingo: 0, total: 0 });
  });

  it('scores an exchange as 0', () => {
    // Act
    const score = scoreTurn({ kind: 'exchange' });

    // Assert
    expect(score).toEqual({ words: [], bingo: 0, total: 0 });
  });

  it('scores a withdrawn word as 0', () => {
    // Act
    const score = scoreTurn({ kind: 'withdrawn' });

    // Assert
    expect(score).toEqual({ words: [], bingo: 0, total: 0 });
  });
});
