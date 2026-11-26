import { describe, expect, it } from 'vite-plus/test';
import { BLANK, LETTERS, TILES, letterPoints } from './tiles.ts';

describe('TILES', () => {
  it('defines every letter A-Z and nothing else', () => {
    // Arrange
    const expected = LETTERS;

    // Act
    const defined = Object.keys(TILES).sort();

    // Assert
    expect(defined).toEqual(expected);
  });

  it('has 100 tiles including the two blanks', () => {
    // Arrange
    const letterTiles = Object.values(TILES);

    // Act
    const total = letterTiles.reduce((sum, tile) => sum + tile.count, BLANK.count);

    // Assert
    expect(total).toBe(100);
  });

  it('scores blanks as 0', () => {
    // Arrange
    const blank = BLANK;

    // Act
    const points = blank.points;

    // Assert
    expect(points).toBe(0);
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
    // Arrange
    const input = letter;

    // Act
    const points = letterPoints(input);

    // Assert
    expect(points).toBe(expected);
  });

  it('ignores case', () => {
    // Arrange
    const lowerCase = 'z';

    // Act
    const points = letterPoints(lowerCase);

    // Assert
    expect(points).toBe(10);
  });

  it('rejects an empty string', () => {
    // Arrange
    const empty = '';

    // Act
    const act = () => letterPoints(empty);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it('rejects more than one letter', () => {
    // Arrange
    const twoLetters = 'AB';

    // Act
    const act = () => letterPoints(twoLetters);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it('rejects the blank symbol', () => {
    // Arrange
    const blankSymbol = '?';

    // Act
    const act = () => letterPoints(blankSymbol);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it('rejects digits', () => {
    // Arrange
    const digit = '1';

    // Act
    const act = () => letterPoints(digit);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it('rejects accented letters', () => {
    // Arrange
    const accented = 'É';

    // Act
    const act = () => letterPoints(accented);

    // Assert
    expect(act).toThrow(RangeError);
  });
});
