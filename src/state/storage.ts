import type { Game } from '../domain/types.ts';
import { migrate, type MigrateOptions } from './migrations.ts';
import { parseGame } from './schema.ts';

/** The subset of the Web Storage API the app uses. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  current: 'scrabble-scorer:current',
  history: 'scrabble-scorer:history',
  corruptPrefix: 'scrabble-scorer:corrupt-',
} as const;

/** Finished games kept in history; the oldest are dropped first. */
export const HISTORY_LIMIT = 20;

export const MESSAGES = {
  unreadableGame:
    "Your saved game couldn't be read, so it was set aside. A copy was kept in this browser's storage.",
  unreadableHistory:
    "Your game history couldn't be read, so it was set aside. A copy was kept in this browser's storage.",
  skippedHistory: (count: number) =>
    `${count} saved ${count === 1 ? 'game' : 'games'} in your history couldn't be read and were skipped.`,
  storageUnavailable: "Saved games couldn't be read. This browser may be blocking storage.",
  saveFailed: "Your game couldn't be saved. Storage may be full or turned off in this browser.",
} as const;

/** In-memory storage: used in tests, and as a fallback when localStorage isn't usable. */
export const createMemoryStorage = (): KeyValueStorage => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
};

export interface StorageChoice {
  storage: KeyValueStorage;
  /** False when falling back to memory: nothing will survive a reload. */
  persistent: boolean;
}

const PROBE_KEY = 'scrabble-scorer:probe';

/**
 * The browser's localStorage if it can actually be written to. Otherwise (for
 * example, storage blocked in a private window) an in-memory fallback.
 */
export const chooseStorage = (candidate: () => KeyValueStorage | undefined): StorageChoice => {
  try {
    const storage = candidate();
    if (!storage) {
      return { storage: createMemoryStorage(), persistent: false };
    }
    storage.setItem(PROBE_KEY, PROBE_KEY);
    storage.removeItem(PROBE_KEY);
    return { storage, persistent: true };
  } catch {
    return { storage: createMemoryStorage(), persistent: false };
  }
};

export interface Loaded<T> {
  value: T;
  /** A message for the player if something had to be set aside or skipped. */
  problem?: string;
}

/** Runs a storage write, returning a problem message instead of throwing. */
const tryWrite = (write: () => void): string | undefined => {
  try {
    write();
    return undefined;
  } catch {
    return MESSAGES.saveFailed;
  }
};

/**
 * Copies unreadable data to a backup key and removes the original. Best
 * effort: if storage refuses, the data is left where it is.
 */
const setAside = (storage: KeyValueStorage, key: string, raw: string, at: string): void => {
  try {
    storage.setItem(`${KEYS.corruptPrefix}${at}`, raw);
    storage.removeItem(key);
  } catch {
    // Nothing more can be done; the app carries on without the data.
  }
};

const readGame = (data: unknown, options: MigrateOptions): Game =>
  parseGame(migrate(data, options));

/**
 * Loads the game in progress, migrating it to the current schema. Unreadable
 * data is set aside (see `setAside`) rather than thrown away or crashing.
 */
export const loadCurrentGame = (
  storage: KeyValueStorage,
  at: string,
  options: MigrateOptions = {},
): Loaded<Game | null> => {
  let raw: string | null;
  try {
    raw = storage.getItem(KEYS.current);
  } catch {
    return { value: null, problem: MESSAGES.storageUnavailable };
  }
  if (raw === null) {
    return { value: null };
  }
  try {
    const data: unknown = JSON.parse(raw);
    const game = readGame(data, options);
    if (game !== data) {
      // Migrated: store the upgraded copy so this only happens once. If that
      // fails, the game is still fine and will be migrated again next time.
      tryWrite(() => storage.setItem(KEYS.current, JSON.stringify(game)));
    }
    return { value: game };
  } catch {
    setAside(storage, KEYS.current, raw, at);
    return { value: null, problem: MESSAGES.unreadableGame };
  }
};

/**
 * Loads finished games, newest first. Entries that can't be read are skipped;
 * if the whole list can't be read, it is set aside.
 */
export const loadHistory = (
  storage: KeyValueStorage,
  at: string,
  options: MigrateOptions = {},
): Loaded<Game[]> => {
  let raw: string | null;
  try {
    raw = storage.getItem(KEYS.history);
  } catch {
    return { value: [], problem: MESSAGES.storageUnavailable };
  }
  if (raw === null) {
    return { value: [] };
  }
  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch {
    entries = undefined;
  }
  if (!Array.isArray(entries)) {
    setAside(storage, KEYS.history, raw, at);
    return { value: [], problem: MESSAGES.unreadableHistory };
  }
  const games = entries.flatMap((entry: unknown) => {
    try {
      return [readGame(entry, options)];
    } catch {
      return [];
    }
  });
  const skipped = entries.length - games.length;
  return skipped === 0
    ? { value: games }
    : { value: games, problem: MESSAGES.skippedHistory(skipped) };
};

/** Saves the game in progress. Returns a problem message on failure. */
export const saveCurrentGame = (storage: KeyValueStorage, game: Game): string | undefined =>
  tryWrite(() => storage.setItem(KEYS.current, JSON.stringify(game)));

/** Removes the game in progress. Returns a problem message on failure. */
export const clearCurrentGame = (storage: KeyValueStorage): string | undefined =>
  tryWrite(() => storage.removeItem(KEYS.current));

/** Saves the history. Returns a problem message on failure. */
export const saveHistory = (storage: KeyValueStorage, games: readonly Game[]): string | undefined =>
  tryWrite(() => storage.setItem(KEYS.history, JSON.stringify(games)));

/** Adds a finished game to the front of the history, keeping at most HISTORY_LIMIT. */
export const addToHistory = (history: readonly Game[], game: Game): Game[] =>
  [game, ...history.filter((g) => g.id !== game.id)].slice(0, HISTORY_LIMIT);
