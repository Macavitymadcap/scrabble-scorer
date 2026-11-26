import { describe, expect, it } from 'vite-plus/test';
import type { Game } from '../domain/types.ts';
import {
  HISTORY_LIMIT,
  KEYS,
  MESSAGES,
  addToHistory,
  chooseStorage,
  clearCurrentGame,
  createMemoryStorage,
  loadCurrentGame,
  loadHistory,
  saveCurrentGame,
  saveHistory,
  type KeyValueStorage,
} from './storage.ts';
import { failingStorage, finishedGame, sampleGame } from './testing.ts';

const AT = '2026-11-26T20:00:00.000Z';

const storageWith = (entries: Record<string, string>): KeyValueStorage => {
  const storage = createMemoryStorage();
  Object.entries(entries).forEach(([key, value]) => storage.setItem(key, value));
  return storage;
};

describe('createMemoryStorage', () => {
  it('returns null for a key that was never set', () => {
    // Arrange
    const storage = createMemoryStorage();

    // Act
    const value = storage.getItem('missing');

    // Assert
    expect(value).toBeNull();
  });

  it('returns what was set', () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem('k', 'v');

    // Act
    const value = storage.getItem('k');

    // Assert
    expect(value).toBe('v');
  });

  it('forgets a removed key', () => {
    // Arrange
    const storage = storageWith({ k: 'v' });
    storage.removeItem('k');

    // Act
    const value = storage.getItem('k');

    // Assert
    expect(value).toBeNull();
  });

  it('keeps each instance separate', () => {
    // Arrange
    const first = storageWith({ k: 'v' });
    const second = createMemoryStorage();

    // Act
    const value = second.getItem('k');

    // Assert
    expect(first.getItem('k')).toBe('v');
    expect(value).toBeNull();
  });
});

describe('chooseStorage', () => {
  it('uses a working storage and marks it persistent', () => {
    // Arrange
    const working = createMemoryStorage();

    // Act
    const choice = chooseStorage(() => working);

    // Assert
    expect(choice).toEqual({ storage: working, persistent: true });
  });

  it('leaves no probe key behind', () => {
    // Arrange
    const working = createMemoryStorage();

    // Act
    chooseStorage(() => working);

    // Assert
    expect(working.getItem('scrabble-scorer:probe')).toBeNull();
  });

  it('falls back to memory when there is no storage', () => {
    // Arrange
    const missing = () => undefined;

    // Act
    const choice = chooseStorage(missing);

    // Assert
    expect(choice.persistent).toBe(false);
  });

  it('falls back to memory when reaching storage throws', () => {
    // Arrange
    const blocked = (): KeyValueStorage => {
      throw new Error('SecurityError');
    };

    // Act
    const choice = chooseStorage(blocked);

    // Assert
    expect(choice.persistent).toBe(false);
  });

  it('falls back to memory when storage cannot be written', () => {
    // Arrange
    const readOnly = failingStorage(['setItem']);

    // Act
    const choice = chooseStorage(() => readOnly);

    // Assert
    expect(choice.persistent).toBe(false);
    expect(choice.storage).not.toBe(readOnly);
  });

  it('gives a usable memory storage when falling back', () => {
    // Arrange
    const { storage } = chooseStorage(() => undefined);

    // Act
    storage.setItem('k', 'v');

    // Assert
    expect(storage.getItem('k')).toBe('v');
  });
});

describe('loadCurrentGame', () => {
  it('finds nothing when no game was saved', () => {
    // Arrange
    const storage = createMemoryStorage();

    // Act
    const loaded = loadCurrentGame(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: null });
  });

  it('loads a saved game', () => {
    // Arrange
    const storage = storageWith({ [KEYS.current]: JSON.stringify(sampleGame()) });

    // Act
    const loaded = loadCurrentGame(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: sampleGame() });
  });

  describe('with an unreadable game', () => {
    const notJson = '{"schemaVersion": 1,';

    it('reports a problem and loads nothing', () => {
      // Arrange
      const storage = storageWith({ [KEYS.current]: notJson });

      // Act
      const loaded = loadCurrentGame(storage, AT);

      // Assert
      expect(loaded).toEqual({ value: null, problem: MESSAGES.unreadableGame });
    });

    it('keeps a copy under a timestamped backup key', () => {
      // Arrange
      const storage = storageWith({ [KEYS.current]: notJson });

      // Act
      loadCurrentGame(storage, AT);

      // Assert
      expect(storage.getItem(`${KEYS.corruptPrefix}${AT}`)).toBe(notJson);
    });

    it('removes it from the current game key', () => {
      // Arrange
      const storage = storageWith({ [KEYS.current]: notJson });

      // Act
      loadCurrentGame(storage, AT);

      // Assert
      expect(storage.getItem(KEYS.current)).toBeNull();
    });

    it('still reports the problem when the copy cannot be written', () => {
      // Arrange
      const inner = storageWith({ [KEYS.current]: notJson });
      const storage = failingStorage(['setItem'], inner);

      // Act
      const loaded = loadCurrentGame(storage, AT);

      // Assert
      expect(loaded.problem).toBe(MESSAGES.unreadableGame);
    });
  });

  it('sets aside valid JSON that is not a valid game', () => {
    // Arrange
    const notAGame = JSON.stringify({ schemaVersion: 1, hello: 'world' });
    const storage = storageWith({ [KEYS.current]: notAGame });

    // Act
    const loaded = loadCurrentGame(storage, AT);

    // Assert
    expect(loaded.problem).toBe(MESSAGES.unreadableGame);
    expect(storage.getItem(`${KEYS.corruptPrefix}${AT}`)).toBe(notAGame);
  });

  it('sets aside a game saved by a newer version of the app', () => {
    // Arrange
    const future = JSON.stringify({ ...sampleGame(), schemaVersion: 99 });
    const storage = storageWith({ [KEYS.current]: future });

    // Act
    const loaded = loadCurrentGame(storage, AT);

    // Assert
    expect(loaded.problem).toBe(MESSAGES.unreadableGame);
  });

  it('reports blocked storage without throwing', () => {
    // Arrange
    const storage = failingStorage(['getItem']);

    // Act
    const loaded = loadCurrentGame(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: null, problem: MESSAGES.storageUnavailable });
  });

  describe('with an older schema version', () => {
    // Pretend the current version is 2 and v1 games lack a field it adds.
    const { schemaVersion: _version, ...gameFields } = sampleGame();
    const v0 = JSON.stringify({ ...gameFields, schemaVersion: 0, legacy: true });
    const options = {
      migrations: { 0: ({ legacy: _legacy, ...rest }: Record<string, unknown>) => rest },
      target: 1,
    };

    it('migrates it on load', () => {
      // Arrange
      const storage = storageWith({ [KEYS.current]: v0 });

      // Act
      const loaded = loadCurrentGame(storage, AT, options);

      // Assert
      expect(loaded).toEqual({ value: sampleGame() });
    });

    it('saves the migrated copy so it only migrates once', () => {
      // Arrange
      const storage = storageWith({ [KEYS.current]: v0 });

      // Act
      loadCurrentGame(storage, AT, options);

      // Assert
      expect(JSON.parse(storage.getItem(KEYS.current) ?? 'null')).toEqual(sampleGame());
    });

    it('still loads the game when saving the migrated copy fails', () => {
      // Arrange
      const storage = failingStorage(['setItem'], storageWith({ [KEYS.current]: v0 }));

      // Act
      const loaded = loadCurrentGame(storage, AT, options);

      // Assert
      expect(loaded).toEqual({ value: sampleGame() });
    });
  });
});

describe('loadHistory', () => {
  it('is empty when nothing was saved', () => {
    // Arrange
    const storage = createMemoryStorage();

    // Act
    const loaded = loadHistory(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: [] });
  });

  it('loads saved games in their stored order', () => {
    // Arrange
    const games = [finishedGame('g2'), finishedGame('g1')];
    const storage = storageWith({ [KEYS.history]: JSON.stringify(games) });

    // Act
    const loaded = loadHistory(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: games });
  });

  it('skips unreadable entries and says how many', () => {
    // Arrange
    const entries = [finishedGame('g2'), { junk: true }, 'nope', finishedGame('g1')];
    const storage = storageWith({ [KEYS.history]: JSON.stringify(entries) });

    // Act
    const loaded = loadHistory(storage, AT);

    // Assert
    expect(loaded.value.map((g) => g.id)).toEqual(['g2', 'g1']);
    expect(loaded.problem).toBe(MESSAGES.skippedHistory(2));
  });

  it('uses the singular for one skipped game', () => {
    // Arrange
    const message = MESSAGES.skippedHistory(1);

    // Act
    const mentionsOneGame = message.startsWith('1 saved game in');

    // Assert
    expect(mentionsOneGame).toBe(true);
  });

  it('sets aside history that is not valid JSON', () => {
    // Arrange
    const storage = storageWith({ [KEYS.history]: '[{' });

    // Act
    const loaded = loadHistory(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: [], problem: MESSAGES.unreadableHistory });
    expect(storage.getItem(`${KEYS.corruptPrefix}${AT}`)).toBe('[{');
    expect(storage.getItem(KEYS.history)).toBeNull();
  });

  it('sets aside history that is not a list', () => {
    // Arrange
    const storage = storageWith({ [KEYS.history]: JSON.stringify(finishedGame()) });

    // Act
    const loaded = loadHistory(storage, AT);

    // Assert
    expect(loaded.problem).toBe(MESSAGES.unreadableHistory);
  });

  it('reports blocked storage without throwing', () => {
    // Arrange
    const storage = failingStorage(['getItem']);

    // Act
    const loaded = loadHistory(storage, AT);

    // Assert
    expect(loaded).toEqual({ value: [], problem: MESSAGES.storageUnavailable });
  });
});

describe('saveCurrentGame', () => {
  it('stores the game as JSON', () => {
    // Arrange
    const storage = createMemoryStorage();
    const game = sampleGame();

    // Act
    const problem = saveCurrentGame(storage, game);

    // Assert
    expect(problem).toBeUndefined();
    expect(JSON.parse(storage.getItem(KEYS.current) ?? 'null')).toEqual(game);
  });

  it('round-trips through loadCurrentGame', () => {
    // Arrange
    const storage = createMemoryStorage();
    saveCurrentGame(storage, finishedGame());

    // Act
    const loaded = loadCurrentGame(storage, AT);

    // Assert
    expect(loaded.value).toEqual(finishedGame());
  });

  it('reports a problem when storage is full', () => {
    // Arrange
    const storage = failingStorage(['setItem']);

    // Act
    const problem = saveCurrentGame(storage, sampleGame());

    // Assert
    expect(problem).toBe(MESSAGES.saveFailed);
  });
});

describe('clearCurrentGame', () => {
  it('removes the saved game', () => {
    // Arrange
    const storage = storageWith({ [KEYS.current]: JSON.stringify(sampleGame()) });

    // Act
    const problem = clearCurrentGame(storage);

    // Assert
    expect(problem).toBeUndefined();
    expect(storage.getItem(KEYS.current)).toBeNull();
  });

  it('reports a problem when storage refuses', () => {
    // Arrange
    const storage = failingStorage(['removeItem']);

    // Act
    const problem = clearCurrentGame(storage);

    // Assert
    expect(problem).toBe(MESSAGES.saveFailed);
  });
});

describe('saveHistory', () => {
  it('stores the games as a JSON list', () => {
    // Arrange
    const storage = createMemoryStorage();
    const games = [finishedGame('g2'), finishedGame('g1')];

    // Act
    const problem = saveHistory(storage, games);

    // Assert
    expect(problem).toBeUndefined();
    expect(loadHistory(storage, AT).value).toEqual(games);
  });

  it('reports a problem when storage is full', () => {
    // Arrange
    const storage = failingStorage(['setItem']);

    // Act
    const problem = saveHistory(storage, [finishedGame()]);

    // Assert
    expect(problem).toBe(MESSAGES.saveFailed);
  });
});

describe('addToHistory', () => {
  const gamesWithIds = (count: number): Game[] =>
    Array.from({ length: count }, (_, i) => finishedGame(`old${i + 1}`));

  it('puts the new game first', () => {
    // Arrange
    const history = gamesWithIds(2);

    // Act
    const result = addToHistory(history, finishedGame('new'));

    // Assert
    expect(result.map((g) => g.id)).toEqual(['new', 'old1', 'old2']);
  });

  it('keeps at most the history limit, dropping the oldest', () => {
    // Arrange
    const full = gamesWithIds(HISTORY_LIMIT);

    // Act
    const result = addToHistory(full, finishedGame('new'));

    // Assert
    expect(result).toHaveLength(HISTORY_LIMIT);
    expect(result[0]?.id).toBe('new');
    expect(result.at(-1)?.id).toBe(`old${HISTORY_LIMIT - 1}`);
  });

  it('replaces an earlier copy of the same game instead of duplicating it', () => {
    // Arrange
    const history = [finishedGame('g1'), finishedGame('g2')];

    // Act
    const result = addToHistory(history, finishedGame('g2'));

    // Assert
    expect(result.map((g) => g.id)).toEqual(['g2', 'g1']);
  });

  it('does not change the history passed in', () => {
    // Arrange
    const history = gamesWithIds(1);

    // Act
    addToHistory(history, finishedGame('new'));

    // Assert
    expect(history.map((g) => g.id)).toEqual(['old1']);
  });
});
