import { createGame, reduce, type GameAction } from '../domain/game.ts';
import { GameError, type EndGame, type Game, type TurnInput } from '../domain/types.ts';
import type { MigrateOptions } from './migrations.ts';
import { loadSettings, saveSettings, type Settings } from './settings.ts';
import {
  addToHistory,
  clearCurrentGame,
  loadCurrentGame,
  loadHistory,
  MESSAGES,
  saveCurrentGame,
  saveHistory,
  type KeyValueStorage,
} from './storage.ts';

export interface StoreState {
  /** The game in progress (or just finished), if any. */
  game: Game | null;
  /** Finished games, newest first. */
  history: Game[];
  /** A message for the player about loading or saving, until dismissed. */
  notice: string | null;
  /** Device preferences. */
  settings: Settings;
}

/** The result of a store action. Rule-breaking input is reported, not thrown. */
export type Outcome = { ok: true } | { ok: false; error: string };

export type Listener = (state: StoreState) => void;

export interface StoreOptions {
  storage: KeyValueStorage;
  /** Current time as ISO 8601. */
  now?: () => string;
  /** A new unique id. */
  newId?: () => string;
  migrateOptions?: MigrateOptions;
}

const OK: Outcome = { ok: true };

/** Runs a change, turning a GameError into a failed Outcome. Other errors are bugs and are rethrown. */
const attempt = (change: () => void): Outcome => {
  try {
    change();
    return OK;
  } catch (error) {
    if (error instanceof GameError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};

/**
 * Holds the current game and history, applies actions through the domain
 * reducer, saves after every change and notifies subscribers.
 *
 * Public methods are arrow-function fields so they stay bound when passed as
 * callbacks, e.g. `@click=${store.undoTurn}`.
 */
export class GameStore {
  readonly #storage: KeyValueStorage;
  readonly #now: () => string;
  readonly #newId: () => string;
  readonly #listeners = new Set<Listener>();
  #state: StoreState;

  constructor({
    storage,
    now = () => new Date().toISOString(),
    newId = () => crypto.randomUUID(),
    migrateOptions = {},
  }: StoreOptions) {
    this.#storage = storage;
    this.#now = now;
    this.#newId = newId;

    const loadedAt = now();
    const loadedGame = loadCurrentGame(storage, loadedAt, migrateOptions);
    const loadedHistory = loadHistory(storage, loadedAt, migrateOptions);
    this.#state = {
      game: loadedGame.value,
      history: loadedHistory.value,
      notice: loadedGame.problem ?? loadedHistory.problem ?? null,
      settings: loadSettings(storage),
    };
  }

  /** The current state. A new object after every change, so changes can be detected by identity. */
  getState = (): StoreState => this.#state;

  /** Calls `listener` after every change. Returns a function that unsubscribes. */
  subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Starts a new game. A finished current game moves into history; an active one is discarded. */
  startGame = (playerNames: readonly string[]): Outcome =>
    attempt(() => {
      const game = createGame({
        id: this.#newId(),
        at: this.#now(),
        players: playerNames.map((name) => ({ id: this.#newId(), name })),
      });
      const previous = this.#state.game;
      const history =
        previous?.status === 'finished'
          ? addToHistory(this.#state.history, previous)
          : this.#state.history;
      this.#commit(game, history);
    });

  addTurn = (turn: TurnInput): Outcome =>
    this.#apply(() => ({ type: 'addTurn', id: this.#newId(), at: this.#now(), turn }));

  editTurn = (turnId: string, turn: TurnInput): Outcome =>
    this.#apply(() => ({ type: 'editTurn', turnId, at: this.#now(), turn }));

  undoTurn = (): Outcome => this.#apply(() => ({ type: 'undoTurn', at: this.#now() }));

  finishGame = (endGame: EndGame): Outcome =>
    this.#apply(() => ({ type: 'finishGame', at: this.#now(), endGame }));

  reopenGame = (): Outcome => this.#apply(() => ({ type: 'reopenGame', at: this.#now() }));

  /** Drops the current game without adding it to history. */
  discardGame = (): void => {
    this.#commit(null);
  };

  /** Removes one finished game from history. Unknown ids are ignored. */
  deleteFromHistory = (gameId: string): void => {
    const history = this.#state.history.filter((game) => game.id !== gameId);
    if (history.length !== this.#state.history.length) {
      this.#commit(this.#state.game, history);
    }
  };

  /** Removes every finished game from history. */
  clearHistory = (): void => {
    if (this.#state.history.length > 0) {
      this.#commit(this.#state.game, []);
    }
  };

  /** Changes one or more settings and saves them. */
  updateSettings = (changes: Partial<Settings>): void => {
    const settings = { ...this.#state.settings, ...changes };
    const saved = saveSettings(this.#storage, settings);
    this.#setState({ settings, notice: saved ? this.#state.notice : MESSAGES.saveFailed });
  };

  dismissNotice = (): void => {
    this.#setState({ notice: null });
  };

  #setState(changes: Partial<StoreState>): void {
    this.#state = { ...this.#state, ...changes };
    this.#listeners.forEach((listener) => listener(this.#state));
  }

  /** Saves the game (and history, if it changed), then updates state. */
  #commit(game: Game | null, history: Game[] = this.#state.history): void {
    const gameProblem =
      game === null ? clearCurrentGame(this.#storage) : saveCurrentGame(this.#storage, game);
    const historyProblem =
      history === this.#state.history ? undefined : saveHistory(this.#storage, history);
    this.#setState({ game, history, notice: gameProblem ?? historyProblem ?? this.#state.notice });
  }

  #requireGame(): Game {
    if (!this.#state.game) {
      throw new GameError('There is no game in progress.');
    }
    return this.#state.game;
  }

  /** Applies a domain action to the current game. */
  #apply(makeAction: () => GameAction): Outcome {
    return attempt(() => this.#commit(reduce(this.#requireGame(), makeAction())));
  }
}
