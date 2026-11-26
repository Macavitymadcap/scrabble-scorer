/** Letter premium on a square covered this turn. */
export type Premium = 'none' | 'DL' | 'TL';

/** One tile in a word, as entered by the player. */
export interface TilePlay {
  /** 'A'-'Z'. For a blank, the letter it stands for. */
  letter: string;
  /** Blanks always score 0, even when reused in later turns. */
  blank: boolean;
  /** Only set on tiles placed this turn. */
  premium: Premium;
}

/** One word formed in a turn: the main word or a cross-word. */
export interface WordPlay {
  tiles: TilePlay[];
  /** Double word squares covered this turn. */
  doubleWords: number;
  /** Triple word squares covered this turn. */
  tripleWords: number;
}

/** The extra fields each kind of turn carries. */
interface TurnPayloads {
  play: { words: WordPlay[]; bingo: boolean };
  pass: Record<never, never>;
  exchange: Record<never, never>;
  withdrawn: Record<never, never>;
}

export type TurnKind = keyof TurnPayloads;
export type NonScoringKind = Exclude<TurnKind, 'play'>;

/** A turn of one kind, as entered. */
export type TurnInputOf<K extends TurnKind> = { kind: K } & TurnPayloads[K];

/** A turn as entered, before it is assigned an id, player and time. */
export type TurnInput = { [K in TurnKind]: TurnInputOf<K> }[TurnKind];

/**
 * A strategy per turn kind, each receiving its own narrowed turn. Call it
 * through `byTurnKind` so no casts are needed.
 */
export type TurnStrategies<R> = { [K in TurnKind]: (turn: TurnInputOf<K>) => R };

/** Runs the strategy for a turn's kind. */
export const byTurnKind = <R, K extends TurnKind>(
  strategies: TurnStrategies<R>,
  turn: TurnInputOf<K>,
): R => strategies[turn.kind](turn);

export type Turn = TurnInput & {
  id: string;
  playerId: string;
  /** ISO 8601 timestamp of when the turn was first recorded. */
  at: string;
};

export interface Player {
  id: string;
  name: string;
}

export interface EndGame {
  /** The player who used their last tile, or null if nobody went out. */
  wentOutPlayerId: string | null;
  /** playerId -> letters left on their rack; '?' for a blank. */
  remaining: Record<string, string>;
}

export type GameStatus = 'active' | 'finished';

export interface Game {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  /** In turn order. */
  players: Player[];
  /** In play order. */
  turns: Turn[];
  status: GameStatus;
  endGame?: EndGame;
}

/** Thrown when an action or input breaks the rules. */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}
