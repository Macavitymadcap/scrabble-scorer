import { createGame, reduce } from '../domain/game.ts';
import { play, word } from '../domain/testing.ts';
import type { Game } from '../domain/types.ts';
import { createMemoryStorage, type KeyValueStorage } from './storage.ts';

export const PLAYERS = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
];

/** An active two-player game with one turn each: Ann CAT (5), Bob passes. */
export const sampleGame = (id = 'g1'): Game => {
  const started = createGame({ id, at: '2026-11-26T19:00:00.000Z', players: PLAYERS });
  const afterAnn = reduce(started, {
    type: 'addTurn',
    id: 't1',
    at: 'at-1',
    turn: play([word('CAT')]),
  });
  return reduce(afterAnn, { type: 'addTurn', id: 't2', at: 'at-2', turn: { kind: 'pass' } });
};

/** `sampleGame`, finished with nobody going out and no tiles left. */
export const finishedGame = (id = 'g1'): Game =>
  reduce(sampleGame(id), {
    type: 'finishGame',
    at: 'at-end',
    endGame: { wentOutPlayerId: null, remaining: {} },
  });

type StorageMethod = keyof KeyValueStorage;

/** Memory storage where the named methods throw, like a blocked or full localStorage. */
export const failingStorage = (
  failing: readonly StorageMethod[],
  inner: KeyValueStorage = createMemoryStorage(),
): KeyValueStorage => {
  const fail = (): never => {
    throw new Error('Storage is unavailable');
  };
  const passThrough: KeyValueStorage = {
    getItem: (key) => inner.getItem(key),
    setItem: (key, value) => inner.setItem(key, value),
    removeItem: (key) => inner.removeItem(key),
  };
  const broken = Object.fromEntries(failing.map((method) => [method, fail]));
  return { ...passThrough, ...broken };
};

/** A clock returning `t1`, `t2`, ... on each call. */
export const sequentialClock = (): (() => string) => {
  let tick = 0;
  return () => {
    tick += 1;
    return `t${tick}`;
  };
};

/** An id generator returning `id1`, `id2`, ... on each call. */
export const sequentialIds = (): (() => string) => {
  let count = 0;
  return () => {
    count += 1;
    return `id${count}`;
  };
};
