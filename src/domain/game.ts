import { endGameAdjustments } from './endgame.ts';
import { scoreTurn, wordScore, wordText, type TurnScore } from './scoring.ts';
import {
  GameError,
  type EndGame,
  type Game,
  type Player,
  type Turn,
  type TurnInput,
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

export function createGame({ id, at, players }: NewGame): Game {
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
}

export type GameAction =
  | { type: 'addTurn'; id: string; at: string; turn: TurnInput }
  | { type: 'editTurn'; turnId: string; at: string; turn: TurnInput }
  | { type: 'undoTurn'; at: string }
  | { type: 'finishGame'; at: string; endGame: EndGame }
  | { type: 'reopenGame'; at: string };

function assertActive(game: Game): void {
  if (game.status !== 'active') {
    throw new GameError('The game has finished. Reopen it to change turns.');
  }
}

/** Applies an action, returning a new game. Throws GameError if the action breaks the rules. */
export function reduce(game: Game, action: GameAction): Game {
  switch (action.type) {
    case 'addTurn': {
      assertActive(game);
      validateTurnInput(action.turn);
      const turn: Turn = {
        ...action.turn,
        id: action.id,
        playerId: nextPlayer(game).id,
        at: action.at,
      };
      return { ...game, updatedAt: action.at, turns: [...game.turns, turn] };
    }

    case 'editTurn': {
      assertActive(game);
      validateTurnInput(action.turn);
      const index = game.turns.findIndex((t) => t.id === action.turnId);
      const existing = game.turns[index];
      if (!existing) {
        throw new GameError(`No turn with id ${action.turnId}.`);
      }
      const { id, playerId, at } = existing;
      const turns = game.turns.with(index, { ...action.turn, id, playerId, at });
      return { ...game, updatedAt: action.at, turns };
    }

    case 'undoTurn': {
      assertActive(game);
      if (game.turns.length === 0) {
        throw new GameError('There are no turns to undo.');
      }
      return { ...game, updatedAt: action.at, turns: game.turns.slice(0, -1) };
    }

    case 'finishGame': {
      assertActive(game);
      validateEndGame(game.players, action.endGame);
      return { ...game, updatedAt: action.at, status: 'finished', endGame: action.endGame };
    }

    case 'reopenGame': {
      if (game.status !== 'finished') {
        throw new GameError('The game is still in progress.');
      }
      const { endGame: _removed, ...rest } = game;
      return { ...rest, updatedAt: action.at, status: 'active' };
    }
  }
}

// ---------------------------------------------------------------------------
// Derived values. Nothing below is stored.
// ---------------------------------------------------------------------------

/** 1-based round number of the turn at `turnIndex`. */
export function roundOf(turnIndex: number, playerCount: number): number {
  return Math.floor(turnIndex / playerCount) + 1;
}

/** The player whose turn it is. */
export function nextPlayer(game: Game): Player {
  const player = game.players[game.turns.length % game.players.length];
  if (!player) {
    throw new GameError('The game has no players.');
  }
  return player;
}

/** The round the next turn belongs to. */
export function currentRound(game: Game): number {
  return roundOf(game.turns.length, game.players.length);
}

export interface ScoredTurn {
  turn: Turn;
  round: number;
  score: TurnScore;
}

export function scoredTurns(game: Game): ScoredTurn[] {
  return game.turns.map((turn, index) => ({
    turn,
    round: roundOf(index, game.players.length),
    score: scoreTurn(turn),
  }));
}

export interface ScoreboardRound {
  round: number;
  /** playerId -> that player's turn in this round, if played yet. */
  turns: Record<string, ScoredTurn>;
}

/** Turns grouped by round, for the scoreboard table. */
export function scoreboardRounds(game: Game): ScoreboardRound[] {
  const rounds: ScoreboardRound[] = [];
  for (const scored of scoredTurns(game)) {
    let row = rounds[scored.round - 1];
    if (!row) {
      row = { round: scored.round, turns: {} };
      rounds.push(row);
    }
    row.turns[scored.turn.playerId] = scored;
  }
  return rounds;
}

export interface PlayerTotal {
  player: Player;
  /** Sum of the player's turn scores. */
  turns: number;
  /** End-game adjustment; 0 until the game is finished. */
  adjustment: number;
  total: number;
}

/** Each player's running (or final) total, in turn order. */
export function playerTotals(game: Game): PlayerTotal[] {
  const turnTotals = new Map<string, number>();
  for (const { turn, score } of scoredTurns(game)) {
    turnTotals.set(turn.playerId, (turnTotals.get(turn.playerId) ?? 0) + score.total);
  }
  const adjustments =
    game.status === 'finished' && game.endGame
      ? endGameAdjustments(game.players, game.endGame)
      : {};

  return game.players.map((player) => {
    const turns = turnTotals.get(player.id) ?? 0;
    const adjustment = adjustments[player.id] ?? 0;
    return { player, turns, adjustment, total: turns + adjustment };
  });
}

export interface Standings {
  /** Highest total first; ties keep turn order. */
  ranking: PlayerTotal[];
  /** Everyone sharing the highest total. More than one means a tie. */
  leaders: Player[];
}

export function standings(game: Game): Standings {
  const ranking = playerTotals(game).toSorted((a, b) => b.total - a.total);
  const top = ranking[0]?.total;
  const leaders = ranking.filter((t) => t.total === top).map((t) => t.player);
  return { ranking, leaders };
}

/** The highest-scoring turn, or undefined if no play has scored. Earliest wins a tie. */
export function bestTurn(game: Game): ScoredTurn | undefined {
  let best: ScoredTurn | undefined;
  for (const scored of scoredTurns(game)) {
    if (scored.score.total > (best?.score.total ?? 0)) {
      best = scored;
    }
  }
  return best;
}

export interface BestWord {
  word: string;
  score: number;
  playerId: string;
  turnId: string;
}

/** The highest-scoring single word, or undefined if none scored. Earliest wins a tie. */
export function bestWord(game: Game): BestWord | undefined {
  let best: BestWord | undefined;
  for (const turn of game.turns) {
    if (turn.kind !== 'play') {
      continue;
    }
    for (const word of turn.words) {
      const score = wordScore(word);
      if (score > (best?.score ?? 0)) {
        best = { word: wordText(word), score, playerId: turn.playerId, turnId: turn.id };
      }
    }
  }
  return best;
}
