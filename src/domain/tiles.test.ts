import { describe, expect, it } from 'vite-plus/test';
import { BLANK, LETTERS, TILES, letterPoints } from './tiles.ts';

describe('TILES', () => {
  it('defines every letter A-Z and nothing else', () => {
    // Act
    const defined = Object.keys(TILES).sort();

    // Assert
    expect(defined).toEqual(LETTERS);
  });

  it('has 100 tiles including the two blanks', () => {
    // Act
    const letterTiles = Object.values(TILES).reduce((sum, tile) => sum + tile.count, 0);

    // Assert
    expect(letterTiles + BLANK.count).toBe(100);
  });

  it('scores blanks as 0', () => {
    // Assert
    expect(BLANK.points).toBe(0);
  });
});

describe('letterPoints', () => {
  it.each([
    ['A', 1],
    ['D', 2],
    ['B', 3],
    ['F', 4],
    ['K', 5],
    ['J', 8],
    ['Q', 10],
  ])('scores %s as %i', (letter, expected) => {
    // Act
    const points = letterPoints(letter);

    // Assert
    expect(points).toBe(expected);
  });

  it('ignores case', () => {
    // Act
    const lower = letterPoints('z');

    // Assert
    expect(lower).toBe(letterPoints('Z'));
  });

  it('rejects an empty string', () => {
    // Act & Assert
    expect(() => letterPoints('')).toThrow(RangeError);
  });

  it('rejects more than one letter', () => {
    // Act & Assert
    expect(() => letterPoints('AB')).toThrow(RangeError);
  });

  it('rejects the blank symbol', () => {
    // Act & Assert
    expect(() => letterPoints('?')).toThrow(RangeError);
  });

  it('rejects digits', () => {
    // Act & Assert
    expect(() => letterPoints('1')).toThrow(RangeError);
  });

  it('rejects accented letters', () => {
    // Act & Assert
    expect(() => letterPoints('É')).toThrow(RangeError);
  });
});
