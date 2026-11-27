import { describe, expect, it } from 'vite-plus/test';
import { likelyWentOut, normaliseRack, rackError } from './endgame-entry.ts';

const players = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Cat' },
];

describe('normaliseRack', () => {
  it('upper-cases letters', () => {
    // Arrange
    const typed = 'qe';

    // Act
    const rack = normaliseRack(typed);

    // Assert
    expect(rack).toBe('QE');
  });

  it('keeps ? for a blank', () => {
    // Arrange
    const typed = 'q?';

    // Act
    const rack = normaliseRack(typed);

    // Assert
    expect(rack).toBe('Q?');
  });

  it('drops spaces, digits and punctuation', () => {
    // Arrange
    const typed = ' q, e 1!';

    // Act
    const rack = normaliseRack(typed);

    // Assert
    expect(rack).toBe('QE');
  });

  it('keeps more than seven tiles, so the error can say so', () => {
    // Arrange
    const typed = 'abcdefgh';

    // Act
    const rack = normaliseRack(typed);

    // Assert
    expect(rack).toHaveLength(8);
  });
});

describe('rackError', () => {
  it('accepts an empty rack', () => {
    // Arrange
    const rack = '';

    // Act
    const error = rackError(rack);

    // Assert
    expect(error).toBeUndefined();
  });

  it('accepts a full rack of seven', () => {
    // Arrange
    const rack = 'ABCDEF?';

    // Act
    const error = rackError(rack);

    // Assert
    expect(error).toBeUndefined();
  });

  it('rejects eight tiles', () => {
    // Arrange
    const rack = 'ABCDEFGH';

    // Act
    const error = rackError(rack);

    // Assert
    expect(error).toBe('A rack holds at most 7 tiles. Use ? for a blank.');
  });
});

describe('likelyWentOut', () => {
  it('is nobody while every rack is empty', () => {
    // Arrange
    const racks = {};

    // Act
    const wentOut = likelyWentOut(players, racks);

    // Assert
    expect(wentOut).toBeNull();
  });

  it('is nobody while two racks are still empty', () => {
    // Arrange
    const racks = { a: 'QE' };

    // Act
    const wentOut = likelyWentOut(players, racks);

    // Assert
    expect(wentOut).toBeNull();
  });

  it('is the only player with an empty rack', () => {
    // Arrange
    const racks = { a: 'QE', c: '?' };

    // Act
    const wentOut = likelyWentOut(players, racks);

    // Assert
    expect(wentOut).toBe('b');
  });

  it('treats an empty string as an empty rack', () => {
    // Arrange
    const racks = { a: 'QE', b: '', c: 'X' };

    // Act
    const wentOut = likelyWentOut(players, racks);

    // Assert
    expect(wentOut).toBe('b');
  });

  it('is nobody when every rack has tiles', () => {
    // Arrange
    const racks = { a: 'Q', b: 'E', c: 'X' };

    // Act
    const wentOut = likelyWentOut(players, racks);

    // Assert
    expect(wentOut).toBeNull();
  });
});
