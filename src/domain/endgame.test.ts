import { describe, expect, it } from 'vite-plus/test';
import { endGameAdjustments, rackValue } from './endgame.ts';
import type { EndGame } from './types.ts';

const players = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Cat' },
];

describe('rackValue', () => {
  it('values an empty rack at 0', () => {
    // Arrange
    const emptyRack = '';

    // Act
    const value = rackValue(emptyRack);

    // Assert
    expect(value).toBe(0);
  });

  it('adds up the face value of each tile', () => {
    // Arrange
    const rack = 'QZE';

    // Act
    const value = rackValue(rack);

    // Assert
    expect(value).toBe(10 + 10 + 1);
  });

  it('values a blank at 0', () => {
    // Arrange
    const rackWithBlank = 'Q?';

    // Act
    const value = rackValue(rackWithBlank);

    // Assert
    expect(value).toBe(10);
  });

  it('values a rack of only blanks at 0', () => {
    // Arrange
    const onlyBlanks = '??';

    // Act
    const value = rackValue(onlyBlanks);

    // Assert
    expect(value).toBe(0);
  });

  it('rejects characters that are not tiles', () => {
    // Arrange
    const rackWithDigit = 'E1';

    // Act
    const act = () => rackValue(rackWithDigit);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe('endGameAdjustments', () => {
  it("gives the player who went out everyone else's tiles", () => {
    // Arrange
    const endGame: EndGame = { wentOutPlayerId: 'a', remaining: { b: 'QE', c: 'X?' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: 11 + 8, b: -11, c: -8 });
  });

  it('only subtracts when nobody went out', () => {
    // Arrange
    const endGame: EndGame = { wentOutPlayerId: null, remaining: { a: 'K', b: 'QE', c: '' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: -5, b: -11, c: 0 });
  });

  it('treats a player missing from remaining as having an empty rack', () => {
    // Arrange
    const endGame: EndGame = { wentOutPlayerId: 'c', remaining: { a: 'A' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: -1, b: 0, c: 1 });
  });

  it('gives 0 (not -0) to players with nothing left', () => {
    // Arrange
    const endGame: EndGame = { wentOutPlayerId: null, remaining: {} };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(Object.values(result).every((value) => Object.is(value, 0))).toBe(true);
  });

  it('gives the player who went out nothing when only blanks are left', () => {
    // Arrange
    const endGame: EndGame = { wentOutPlayerId: 'a', remaining: { b: '?', c: '?' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: 0, b: 0, c: 0 });
  });
});
