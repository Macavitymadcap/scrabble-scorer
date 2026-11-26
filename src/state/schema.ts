import type { EndGame, Game, Player, Turn, TurnKind } from '../domain/types.ts';
import { validateEndGame, validatePlayers, validateTurnInput } from '../domain/validation.ts';

/** Thrown when stored data isn't a valid game. */
export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

type Data = Record<string, unknown>;

export const isRecord = (value: unknown): value is Data =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number => typeof value === 'number';

const PREMIUMS = new Set(['none', 'DL', 'TL']);
const STATUSES = new Set(['active', 'finished']);

const isTile = (value: unknown): boolean =>
  isRecord(value) &&
  isString(value.letter) &&
  isBoolean(value.blank) &&
  isString(value.premium) &&
  PREMIUMS.has(value.premium);

const isWord = (value: unknown): boolean =>
  isRecord(value) &&
  Array.isArray(value.tiles) &&
  value.tiles.every(isTile) &&
  isNumber(value.doubleWords) &&
  isNumber(value.tripleWords);

const hasNoExtraFields = (): boolean => true;

/** Shape check for the fields each turn kind carries. */
const TURN_SHAPES: Readonly<Record<TurnKind, (turn: Data) => boolean>> = {
  play: (turn) => Array.isArray(turn.words) && turn.words.every(isWord) && isBoolean(turn.bingo),
  pass: hasNoExtraFields,
  exchange: hasNoExtraFields,
  withdrawn: hasNoExtraFields,
};

const isTurnKind = (value: unknown): value is TurnKind =>
  isString(value) && Object.hasOwn(TURN_SHAPES, value);

const isTurn = (value: unknown): value is Turn =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.playerId) &&
  isString(value.at) &&
  isTurnKind(value.kind) &&
  TURN_SHAPES[value.kind](value);

const isPlayer = (value: unknown): value is Player =>
  isRecord(value) && isString(value.id) && isString(value.name);

const isEndGame = (value: unknown): value is EndGame =>
  isRecord(value) &&
  (value.wentOutPlayerId === null || isString(value.wentOutPlayerId)) &&
  isRecord(value.remaining) &&
  Object.values(value.remaining).every(isString);

/** Each top-level field check, with the reason reported when it fails. */
const GAME_FIELD_CHECKS: readonly (readonly [string, (data: Data) => boolean])[] = [
  ['unknown schema version', (data) => data.schemaVersion === 1],
  ['missing id', (data) => isString(data.id)],
  ['missing timestamps', (data) => isString(data.createdAt) && isString(data.updatedAt)],
  ['invalid players', (data) => Array.isArray(data.players) && data.players.every(isPlayer)],
  ['invalid turns', (data) => Array.isArray(data.turns) && data.turns.every(isTurn)],
  ['invalid status', (data) => isString(data.status) && STATUSES.has(data.status)],
  ['invalid end game', (data) => data.endGame === undefined || isEndGame(data.endGame)],
];

const assertShape = (data: unknown): Game => {
  if (!isRecord(data)) {
    throw new SchemaError('Saved game is invalid: not an object.');
  }
  const failed = GAME_FIELD_CHECKS.find(([, check]) => !check(data));
  if (failed) {
    throw new SchemaError(`Saved game is invalid: ${failed[0]}.`);
  }
  // Every field has been checked above, so this is the parse boundary.
  return data as unknown as Game;
};

/** Domain rules a well-shaped game must also satisfy. */
const assertRules = (game: Game): void => {
  validatePlayers(game.players);
  game.turns.forEach((turn, index) => {
    validateTurnInput(turn);
    const expected = game.players[index % game.players.length];
    if (turn.playerId !== expected?.id) {
      throw new SchemaError(`Saved game is invalid: turn ${index + 1} is out of turn order.`);
    }
  });
  if ((game.status === 'finished') !== (game.endGame !== undefined)) {
    throw new SchemaError('Saved game is invalid: end game does not match status.');
  }
  if (game.endGame) {
    validateEndGame(game.players, game.endGame);
  }
};

/**
 * Checks that stored data (already migrated to the current version) is a
 * valid game, and returns it typed. Throws SchemaError, or GameError for a
 * broken game rule.
 */
export const parseGame = (data: unknown): Game => {
  const game = assertShape(data);
  assertRules(game);
  return game;
};
