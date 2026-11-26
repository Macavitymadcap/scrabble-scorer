import { describe, expect, it } from 'vite-plus/test';
import { endGameAdjustments, rackValue } from './endgame.ts';

const players = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Cat' },
];

describe('rackValue', () => {
  it('values an empty rack at 0', () => {
    // Act
    const value = rackValue('');

    // Assert
    expect(value).toBe(0);
  });

  it('adds up the face value of each tile', () => {
    // Act
    const value = rackValue('QZE');

    // Assert
    expect(value).toBe(10 + 10 + 1);
  });

  it('values a blank at 0', () => {
    // Act
    const value = rackValue('Q?');

    // Assert
    expect(value).toBe(10);
  });

  it('values a rack of only blanks at 0', () => {
    // Act
    const value = rackValue('??');

    // Assert
    expect(value).toBe(0);
  });

  it('rejects characters that are not tiles', () => {
    // Act & Assert
    expect(() => rackValue('E1')).toThrow(RangeError);
  });
});

describe('endGameAdjustments', () => {
  it("gives the player who went out everyone else's tiles", () => {
    // Arrange
    const endGame = { wentOutPlayerId: 'a', remaining: { b: 'QE', c: 'X?' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: 11 + 8, b: -11, c: -8 });
  });

  it('only subtracts when nobody went out', () => {
    // Arrange
    const endGame = { wentOutPlayerId: null, remaining: { a: 'K', b: 'QE', c: '' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: -5, b: -11, c: 0 });
  });

  it('treats a player missing from remaining as having an empty rack', () => {
    // Arrange
    const endGame = { wentOutPlayerId: 'c', remaining: { a: 'A' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: -1, b: 0, c: 1 });
  });

  it('gives 0 (not -0) to players with nothing left', () => {
    // Arrange
    const endGame = { wentOutPlayerId: null, remaining: {} };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(Object.values(result).every((value) => Object.is(value, 0))).toBe(true);
  });

  it('gives the player who went out nothing when only blanks are left', () => {
    // Arrange
    const endGame = { wentOutPlayerId: 'a', remaining: { b: '?', c: '?' } };

    // Act
    const result = endGameAdjustments(players, endGame);

    // Assert
    expect(result).toEqual({ a: 0, b: 0, c: 0 });
  });
});
