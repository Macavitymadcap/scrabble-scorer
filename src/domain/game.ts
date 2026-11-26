import { endGameAdjustments } from './endgame.ts';
import { scoreTurn, wordScore, wordText, type TurnScore } from './scoring.ts';
import {
  GameError,
  type EndGame,
  type Game,
  type Player,
  type Turn,
  type TurnInput,
  type TurnInputOf,
} from './types.ts';
import { validateEndGame, validatePlayers, validateTurnInput } from './validation.ts';

// ---------------------------------------------------------------------------
// Creating and updating a game
//
// Ids and timestamps are passed in, so these functions stay pure and
// deterministic. The store supplies them.
// ---------------------------------------------------------------------------

export interface NewGame {
  id: string;
  at: string;
  players: Player[];
}

export const createGame = ({ id, at, players }: NewGame): Game => {
  validatePlayers(players);
  return {
    schemaVersion: 1,
    id,
    createdAt: at,
    updatedAt: at,
    players: players.map((p) => ({ id: p.id, name: p.name.trim() })),
    turns: [],
    status: 'active',
  };
};

/** The fields each action carries, besides its type and time. */
interface ActionPayloads {
  addTurn: { id: string; turn: TurnInput };
  editTurn: { turnId: string; turn: TurnInput };
  undoTurn: Record<never, never>;
  finishGame: { endGame: EndGame };
  reopenGame: Record<never, never>;
}

export type GameActionType = keyof ActionPayloads;

/** An action of one type. `at` is when it happened (ISO 8601). */
export type GameActionOf<T extends GameActionType> = { type: T; at: string } & ActionPayloads[T];

export type GameAction = { [T in GameActionType]: GameActionOf<T> }[GameActionType];

/** One handler per action type, each receiving its own narrowed action. */
type ActionHandlers = { [T in GameActionType]: (game: Game, action: GameActionOf<T>) => Game };

const assertActive = (game: Game): void => {
  if (game.status !== 'active') {
    throw new GameError('The game has finished. Reopen it to change turns.');
  }
};

const ACTION_HANDLERS: ActionHandlers = {
  addTurn: (game, { id, at, turn }) => {
    assertActive(game);
    validateTurnInput(turn);
    const recorded: Turn = { ...turn, id, playerId: nextPlayer(game).id, at };
    return { ...game, updatedAt: at, turns: [...game.turns, recorded] };
  },

  editTurn: (game, { turnId, at, turn }) => {
    assertActive(game);
    validateTurnInput(turn);
    const index = game.turns.findIndex((t) => t.id === turnId);
    const existing = game.turns[index];
    if (!existing) {
      throw new GameError(`No turn with id ${turnId}.`);
    }
    const edited: Turn = { ...turn, id: existing.id, playerId: existing.playerId, at: existing.at };
    return { ...game, updatedAt: at, turns: game.turns.with(index, edited) };
  },

  undoTurn: (game, { at }) => {
    assertActive(game);
    if (game.turns.length === 0) {
      throw new GameError('There are no turns to undo.');
    }
    return { ...game, updatedAt: at, turns: game.turns.slice(0, -1) };
  },

  finishGame: (game, { at, endGame }) => {
    assertActive(game);
    validateEndGame(game.players, endGame);
    return { ...game, updatedAt: at, status: 'finished', endGame };
  },

  reopenGame: (game, { at }) => {
    if (game.status !== 'finished') {
      throw new GameError('The game is still in progress.');
    }
    const { endGame: _removed, ...rest } = game;
    return { ...rest, updatedAt: at, status: 'active' };
  },
};

/** Applies an action, returning a new game. Throws GameError if the action breaks the rules. */
export const reduce = <T extends GameActionType>(game: Game, action: GameActionOf<T>): Game =>
  ACTION_HANDLERS[action.type](game, action);

// ---------------------------------------------------------------------------
// Derived values. Nothing below is stored.
// ---------------------------------------------------------------------------

/** 1-based round number of the turn at `turnIndex`. */
export const roundOf = (turnIndex: number, playerCount: number): number =>
  Math.floor(turnIndex / playerCount) + 1;

/** The player whose turn it is. */
export const nextPlayer = (game: Game): Player => {
  const player = game.players[game.turns.length % game.players.length];
  if (!player) {
    throw new GameError('The game has no players.');
  }
  return player;
};

/** The round the next turn belongs to. */
export const currentRound = (game: Game): number => roundOf(game.turns.length, game.players.length);

export interface ScoredTurn {
  turn: Turn;
  round: number;
  score: TurnScore;
}

export const scoredTurns = (game: Game): ScoredTurn[] =>
  game.turns.map((turn, index) => ({
    turn,
    round: roundOf(index, game.players.length),
    score: scoreTurn(turn),
  }));

export interface ScoreboardRound {
  round: number;
  /** playerId -> that player's turn in this round, if played yet. */
  turns: Record<string, ScoredTurn>;
}

/** Turns grouped by round, for the scoreboard table. */
export const scoreboardRounds = (game: Game): ScoreboardRound[] => {
  const scored = scoredTurns(game);
  const roundCount = Math.ceil(scored.length / game.players.length);
  return Array.from({ length: roundCount }, (_, i) => {
    const round = i + 1;
    const inRound = scored.filter((s) => s.round === round);
    return { round, turns: Object.fromEntries(inRound.map((s) => [s.turn.playerId, s])) };
  });
};

export interface PlayerTotal {
  player: Player;
  /** Sum of the player's turn scores. */
  turns: number;
  /** End-game adjustment; 0 until the game is finished. */
  adjustment: number;
  total: number;
}

/** Each player's running (or final) total, in turn order. */
export const playerTotals = (game: Game): PlayerTotal[] => {
  const scored = scoredTurns(game);
  // Only a finished game has an end game; reopening removes it.
  const adjustments = game.endGame ? endGameAdjustments(game.players, game.endGame) : {};

  return game.players.map((player) => {
    const turns = scored
      .filter((s) => s.turn.playerId === player.id)
      .reduce((sum, s) => sum + s.score.total, 0);
    const adjustment = adjustments[player.id] ?? 0;
    return { player, turns, adjustment, total: turns + adjustment };
  });
};

export interface Standings {
  /** Highest total first; ties keep turn order. */
  ranking: PlayerTotal[];
  /** Everyone sharing the highest total. More than one means a tie. */
  leaders: Player[];
}

export const standings = (game: Game): Standings => {
  const ranking = playerTotals(game).toSorted((a, b) => b.total - a.total);
  const top = ranking[0]?.total;
  const leaders = ranking.filter((t) => t.total === top).map((t) => t.player);
  return { ranking, leaders };
};

/** The item with the highest positive score, or undefined if none scores above 0. Earliest wins a tie. */
const maxByScore = <T>(items: readonly T[], score: (item: T) => number): T | undefined =>
  items.reduce<T | undefined>(
    (best, item) => (score(item) > (best === undefined ? 0 : score(best)) ? item : best),
    undefined,
  );

/** The highest-scoring turn, or undefined if no play has scored. Earliest wins a tie. */
export const bestTurn = (game: Game): ScoredTurn | undefined =>
  maxByScore(scoredTurns(game), (s) => s.score.total);

export interface BestWord {
  word: string;
  score: number;
  playerId: string;
  turnId: string;
}

type PlayTurn = Turn & TurnInputOf<'play'>;

const isPlay = (turn: Turn): turn is PlayTurn => turn.kind === 'play';

/** The highest-scoring single word, or undefined if none scored. Earliest wins a tie. */
export const bestWord = (game: Game): BestWord | undefined => {
  const words = game.turns.filter(isPlay).flatMap((turn) =>
    turn.words.map((word) => ({
      word: wordText(word),
      score: wordScore(word),
      playerId: turn.playerId,
      turnId: turn.id,
    })),
  );
  return maxByScore(words, (w) => w.score);
};
