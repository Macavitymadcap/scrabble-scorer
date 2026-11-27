import { describe, expect, it, vi } from 'vite-plus/test';
import { play, word } from '../domain/testing.ts';
import type { EndGame, TurnInput } from '../domain/types.ts';
import { KEYS, MESSAGES, createMemoryStorage, type KeyValueStorage } from './storage.ts';
import { GameStore, type StoreOptions } from './store.ts';
import {
  failingStorage,
  finishedGame,
  sampleGame,
  sequentialClock,
  sequentialIds,
} from './testing.ts';

const pass: TurnInput = { kind: 'pass' };
const noTilesLeft: EndGame = { wentOutPlayerId: null, remaining: {} };

/** A store with predictable times (t1, t2, ...) and ids (id1, id2, ...). */
const makeStore = (overrides: Partial<StoreOptions> = {}) =>
  new GameStore({
    storage: createMemoryStorage(),
    now: sequentialClock(),
    newId: sequentialIds(),
    ...overrides,
  });

const savedGame = (storage: KeyValueStorage): unknown =>
  JSON.parse(storage.getItem(KEYS.current) ?? 'null');

const savedHistory = (storage: KeyValueStorage): unknown =>
  JSON.parse(storage.getItem(KEYS.history) ?? 'null');

/** A store with a game already started for Ann and Bob. */
const storeWithGame = (overrides: Partial<StoreOptions> = {}) => {
  const store = makeStore(overrides);
  store.startGame(['Ann', 'Bob']);
  return store;
};

describe('new GameStore', () => {
  it('starts empty when nothing was saved', () => {
    // Arrange
    const options = { storage: createMemoryStorage() };

    // Act
    const store = makeStore(options);

    // Assert
    expect(store.getState()).toEqual({ game: null, history: [], notice: null });
  });

  it('loads the saved game', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.current, JSON.stringify(sampleGame()));

    // Act
    const store = makeStore({ storage });

    // Assert
    expect(store.getState().game).toEqual(sampleGame());
  });

  it('loads the saved history', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.history, JSON.stringify([finishedGame('old')]));

    // Act
    const store = makeStore({ storage });

    // Assert
    expect(store.getState().history.map((g) => g.id)).toEqual(['old']);
  });

  it('shows a notice when the saved game could not be read', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.current, 'not json');

    // Act
    const store = makeStore({ storage });

    // Assert
    expect(store.getState().notice).toBe(MESSAGES.unreadableGame);
  });

  it('shows a notice when the history could not be read', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.history, 'not json');

    // Act
    const store = makeStore({ storage });

    // Assert
    expect(store.getState().notice).toBe(MESSAGES.unreadableHistory);
  });

  it('works without throwing when storage is blocked', () => {
    // Arrange
    const storage = failingStorage(['getItem', 'setItem', 'removeItem']);

    // Act
    const store = makeStore({ storage });

    // Assert
    expect(store.getState()).toEqual({
      game: null,
      history: [],
      notice: MESSAGES.storageUnavailable,
    });
  });

  it('uses real timestamps and random ids by default', () => {
    // Arrange
    const store = new GameStore({ storage: createMemoryStorage() });

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    const game = store.getState().game;
    expect(Number.isNaN(Date.parse(game?.createdAt ?? ''))).toBe(false);
    expect(game?.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('startGame', () => {
  it('creates a game with new ids and the current time', () => {
    // Arrange
    const store = makeStore();

    // Act
    const outcome = store.startGame(['Ann', 'Bob']);

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game).toMatchObject({
      id: 'id1',
      createdAt: 't2',
      players: [
        { id: 'id2', name: 'Ann' },
        { id: 'id3', name: 'Bob' },
      ],
      status: 'active',
    });
  });

  it('saves the new game', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = makeStore({ storage });

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(savedGame(storage)).toEqual(store.getState().game);
  });

  it('reports invalid players without changing anything', () => {
    // Arrange
    const store = makeStore();
    const before = store.getState();

    // Act
    const outcome = store.startGame(['Ann']);

    // Assert
    expect(outcome).toEqual({ ok: false, error: 'A game needs 2-4 players.' });
    expect(store.getState()).toBe(before);
  });

  it('moves a finished game into history', () => {
    // Arrange
    const store = storeWithGame();
    store.finishGame(noTilesLeft);
    const finished = store.getState().game;

    // Act
    store.startGame(['Cat', 'Dan']);

    // Assert
    expect(store.getState().history).toEqual([finished]);
  });

  it('saves the history when a finished game moves into it', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = storeWithGame({ storage });
    store.finishGame(noTilesLeft);

    // Act
    store.startGame(['Cat', 'Dan']);

    // Assert
    expect(savedHistory(storage)).toEqual(store.getState().history);
  });

  it('discards an active game rather than keeping it in history', () => {
    // Arrange
    const store = storeWithGame();

    // Act
    store.startGame(['Cat', 'Dan']);

    // Assert
    expect(store.getState().history).toEqual([]);
  });

  it('rethrows errors that are not rule violations, since they are bugs', () => {
    // Arrange
    const store = makeStore({
      newId: () => {
        throw new TypeError('no ids');
      },
    });

    // Act
    const act = () => store.startGame(['Ann', 'Bob']);

    // Assert
    expect(act).toThrow(TypeError);
  });
});

describe('turn actions', () => {
  it('adds a turn with a new id and the current time', () => {
    // Arrange
    const store = storeWithGame();

    // Act
    const outcome = store.addTurn(play([word('CAT')]));

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game?.turns).toEqual([
      { ...play([word('CAT')]), id: 'id4', playerId: 'id2', at: 't3' },
    ]);
  });

  it('saves after adding a turn', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = storeWithGame({ storage });

    // Act
    store.addTurn(pass);

    // Assert
    expect(savedGame(storage)).toEqual(store.getState().game);
  });

  it('edits a turn', () => {
    // Arrange
    const store = storeWithGame();
    store.addTurn(pass);

    // Act
    const outcome = store.editTurn('id4', play([word('CAT')]));

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game?.turns[0]?.kind).toBe('play');
  });

  it('undoes a turn', () => {
    // Arrange
    const store = storeWithGame();
    store.addTurn(pass);

    // Act
    const outcome = store.undoTurn();

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game?.turns).toEqual([]);
  });

  it('finishes the game', () => {
    // Arrange
    const store = storeWithGame();

    // Act
    const outcome = store.finishGame(noTilesLeft);

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game?.status).toBe('finished');
  });

  it('reopens a finished game', () => {
    // Arrange
    const store = storeWithGame();
    store.finishGame(noTilesLeft);

    // Act
    const outcome = store.reopenGame();

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game?.status).toBe('active');
  });

  it('reports a broken rule without changing or saving anything', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = storeWithGame({ storage });
    const before = store.getState();
    const savedBefore = storage.getItem(KEYS.current);

    // Act
    const outcome = store.addTurn(play([word('A')]));

    // Assert
    expect(outcome).toEqual({ ok: false, error: 'Word 1 must be 2-15 letters long.' });
    expect(store.getState()).toBe(before);
    expect(storage.getItem(KEYS.current)).toBe(savedBefore);
  });

  it('reports that there is no game when none has started', () => {
    // Arrange
    const store = makeStore();

    // Act
    const outcome = store.addTurn(pass);

    // Assert
    expect(outcome).toEqual({ ok: false, error: 'There is no game in progress.' });
  });
});

describe('discardGame', () => {
  it('clears the current game', () => {
    // Arrange
    const store = storeWithGame();

    // Act
    store.discardGame();

    // Assert
    expect(store.getState().game).toBeNull();
  });

  it('removes the saved game', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = storeWithGame({ storage });

    // Act
    store.discardGame();

    // Assert
    expect(storage.getItem(KEYS.current)).toBeNull();
  });

  it('does not add the game to history', () => {
    // Arrange
    const store = storeWithGame();
    store.finishGame(noTilesLeft);

    // Act
    store.discardGame();

    // Assert
    expect(store.getState().history).toEqual([]);
  });
});

describe('history management', () => {
  /** A store with two finished games in history (newest first: g2, g1) and none current. */
  const storeWithHistory = (overrides: Partial<StoreOptions> = {}) => {
    const store = storeWithGame(overrides);
    store.finishGame(noTilesLeft);
    store.startGame(['Cat', 'Dan']);
    store.finishGame(noTilesLeft);
    store.startGame(['Eve', 'Fay']);
    store.discardGame();
    return store;
  };

  const historyIds = (store: ReturnType<typeof makeStore>) =>
    store.getState().history.map((game) => game.id);

  it('deletes one game from history', () => {
    // Arrange
    const store = storeWithHistory();
    const [newest, oldest] = historyIds(store);

    // Act
    store.deleteFromHistory(newest ?? '');

    // Assert
    expect(historyIds(store)).toEqual([oldest]);
  });

  it('saves the history after deleting', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = storeWithHistory({ storage });
    const [newest] = historyIds(store);

    // Act
    store.deleteFromHistory(newest ?? '');

    // Assert
    expect(savedHistory(storage)).toEqual(store.getState().history);
  });

  it('ignores an unknown id without notifying listeners', () => {
    // Arrange
    const store = storeWithHistory();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.deleteFromHistory('nope');

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps the current game when deleting from history', () => {
    // Arrange
    const store = storeWithHistory();
    store.startGame(['Gil', 'Hal']);
    const current = store.getState().game;
    const [newest] = historyIds(store);

    // Act
    store.deleteFromHistory(newest ?? '');

    // Assert
    expect(store.getState().game).toBe(current);
  });

  it('clears all history', () => {
    // Arrange
    const store = storeWithHistory();

    // Act
    store.clearHistory();

    // Assert
    expect(store.getState().history).toEqual([]);
  });

  it('saves the empty history after clearing', () => {
    // Arrange
    const storage = createMemoryStorage();
    const store = storeWithHistory({ storage });

    // Act
    store.clearHistory();

    // Assert
    expect(savedHistory(storage)).toEqual([]);
  });

  it('does nothing when clearing an empty history', () => {
    // Arrange
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.clearHistory();

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('can be passed as a callback and stay bound', () => {
    // Arrange
    const store = storeWithHistory();
    const { clearHistory } = store;

    // Act
    clearHistory();

    // Assert
    expect(store.getState().history).toEqual([]);
  });
});

describe('when saving fails', () => {
  it('keeps the change in memory', () => {
    // Arrange
    const store = storeWithGame({ storage: failingStorage(['setItem']) });

    // Act
    store.addTurn(pass);

    // Assert
    expect(store.getState().game?.turns).toHaveLength(1);
  });

  it('shows a notice', () => {
    // Arrange
    const store = makeStore({ storage: failingStorage(['setItem']) });

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(store.getState().notice).toBe(MESSAGES.saveFailed);
  });

  it('shows a notice when the history cannot be saved', () => {
    // Arrange
    const inner = createMemoryStorage();
    const store = storeWithGame({ storage: inner });
    store.finishGame(noTilesLeft);
    const historyRefused: KeyValueStorage = {
      getItem: (key) => inner.getItem(key),
      setItem: (key, value) => {
        if (key === KEYS.history) {
          throw new Error('full');
        }
        inner.setItem(key, value);
      },
      removeItem: (key) => inner.removeItem(key),
    };
    const reloaded = makeStore({ storage: historyRefused });

    // Act
    reloaded.startGame(['Cat', 'Dan']);

    // Assert
    expect(reloaded.getState().notice).toBe(MESSAGES.saveFailed);
  });

  it('shows a notice when the game cannot be cleared', () => {
    // Arrange
    const store = storeWithGame({ storage: failingStorage(['removeItem']) });

    // Act
    store.discardGame();

    // Assert
    expect(store.getState().notice).toBe(MESSAGES.saveFailed);
  });
});

describe('notices', () => {
  it('keeps an existing notice when a later save succeeds', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.current, 'not json');
    const store = makeStore({ storage });

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(store.getState().notice).toBe(MESSAGES.unreadableGame);
  });

  it('clears the notice when dismissed', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.current, 'not json');
    const store = makeStore({ storage });

    // Act
    store.dismissNotice();

    // Assert
    expect(store.getState().notice).toBeNull();
  });
});

describe('subscribe', () => {
  it('calls the listener with the new state after a change', () => {
    // Arrange
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(store.getState());
  });

  it('does not call the listener when an action is rejected', () => {
    // Arrange
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe(listener);

    // Act
    store.startGame(['Ann']);

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops calling the listener after unsubscribing', () => {
    // Arrange
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it('calls every listener', () => {
    // Arrange
    const store = makeStore();
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);

    // Act
    store.dismissNotice();

    // Assert
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe('methods passed as callbacks', () => {
  it('stay bound to the store', () => {
    // Arrange
    const store = storeWithGame();
    const { addTurn } = store;

    // Act
    const outcome = addTurn({ kind: 'pass' });

    // Assert
    expect(outcome).toEqual({ ok: true });
    expect(store.getState().game?.turns).toHaveLength(1);
  });

  it('can be used directly as listeners', () => {
    // Arrange
    const store = storeWithGame();
    const handlers = [store.undoTurn, store.dismissNotice];
    store.addTurn({ kind: 'pass' });

    // Act
    handlers.forEach((handler) => handler());

    // Assert
    expect(store.getState().game?.turns).toEqual([]);
  });
});

describe('getState', () => {
  it('returns a new object after each change, so changes can be detected by identity', () => {
    // Arrange
    const store = makeStore();
    const before = store.getState();

    // Act
    store.startGame(['Ann', 'Bob']);

    // Assert
    expect(store.getState()).not.toBe(before);
  });
});
