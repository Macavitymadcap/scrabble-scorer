import { describe, expect, it } from 'vite-plus/test';
import { createMemoryStorage } from './storage.ts';
import {
  failingStorage,
  finishedGame,
  sampleGame,
  sequentialClock,
  sequentialIds,
} from './testing.ts';

describe('sampleGame (test helper)', () => {
  it('is an active game with two turns', () => {
    // Arrange
    const id = 'game-x';

    // Act
    const game = sampleGame(id);

    // Assert
    expect(game).toMatchObject({ id, status: 'active' });
    expect(game.turns.map((t) => t.kind)).toEqual(['play', 'pass']);
  });
});

describe('finishedGame (test helper)', () => {
  it('is the sample game, finished', () => {
    // Arrange
    const id = 'game-y';

    // Act
    const game = finishedGame(id);

    // Assert
    expect(game).toMatchObject({ id, status: 'finished' });
  });
});

describe('failingStorage (test helper)', () => {
  it('throws from the methods named', () => {
    // Arrange
    const storage = failingStorage(['setItem']);

    // Act
    const act = () => storage.setItem('k', 'v');

    // Assert
    expect(act).toThrow('Storage is unavailable');
  });

  it('passes the other methods through to the inner storage', () => {
    // Arrange
    const inner = createMemoryStorage();
    inner.setItem('k', 'v');
    const storage = failingStorage(['setItem'], inner);

    // Act
    const value = storage.getItem('k');

    // Assert
    expect(value).toBe('v');
  });
});

describe('sequentialClock (test helper)', () => {
  it('returns t1, t2, ... on each call', () => {
    // Arrange
    const clock = sequentialClock();

    // Act
    const times = [clock(), clock(), clock()];

    // Assert
    expect(times).toEqual(['t1', 't2', 't3']);
  });
});

describe('sequentialIds (test helper)', () => {
  it('returns id1, id2, ... on each call', () => {
    // Arrange
    const newId = sequentialIds();

    // Act
    const ids = [newId(), newId()];

    // Assert
    expect(ids).toEqual(['id1', 'id2']);
  });
});
