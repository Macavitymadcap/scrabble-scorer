import { BLANK_SYMBOL } from './endgame.ts';
import { GameError, type EndGame, type Player, type TurnInput, type WordPlay } from './types.ts';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const RACK_SIZE = 7;
export const BOARD_SIZE = 15;
/** The main word plus at most one cross-word per tile placed. */
export const MAX_WORDS_PER_TURN = RACK_SIZE + 1;
/** A single word can cover at most three word squares (e.g. a row of 15 across three TWs). */
export const MAX_WORD_SQUARES = 3;

const LETTER = /^[A-Z]$/;
const RACK = /^[A-Z?]*$/;

export function validatePlayers(players: readonly Player[]): void {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameError(`A game needs ${MIN_PLAYERS}-${MAX_PLAYERS} players.`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const player of players) {
    const name = player.name.trim().toLowerCase();
    if (!name) {
      throw new GameError('Every player needs a name.');
    }
    if (ids.has(player.id)) {
      throw new GameError(`Duplicate player id: ${player.id}`);
    }
    if (names.has(name)) {
      throw new GameError(`Two players are called "${player.name.trim()}".`);
    }
    ids.add(player.id);
    names.add(name);
  }
}

function validateWord(word: WordPlay, index: number): void {
  const label = `Word ${index + 1}`;
  if (word.tiles.length < 2 || word.tiles.length > BOARD_SIZE) {
    throw new GameError(`${label} must be 2-${BOARD_SIZE} letters long.`);
  }
  for (const tile of word.tiles) {
    if (!LETTER.test(tile.letter)) {
      throw new GameError(`${label} has an invalid letter: ${JSON.stringify(tile.letter)}`);
    }
  }
  const { doubleWords, tripleWords } = word;
  for (const count of [doubleWords, tripleWords]) {
    if (!Number.isInteger(count) || count < 0) {
      throw new GameError(`${label} has an invalid word multiplier count.`);
    }
  }
  if (doubleWords + tripleWords > MAX_WORD_SQUARES) {
    throw new GameError(`${label} can cover at most ${MAX_WORD_SQUARES} word squares.`);
  }
}

export function validateTurnInput(turn: TurnInput): void {
  if (turn.kind !== 'play') {
    return;
  }
  if (turn.words.length === 0) {
    throw new GameError('A play needs at least one word.');
  }
  if (turn.words.length > MAX_WORDS_PER_TURN) {
    throw new GameError(`A play can form at most ${MAX_WORDS_PER_TURN} words.`);
  }
  turn.words.forEach(validateWord);
  // All 7 tiles go in one line, so a bingo's main word has at least 7 letters.
  if (turn.bingo && !turn.words.some((word) => word.tiles.length >= RACK_SIZE)) {
    throw new GameError(`A bingo needs a word of at least ${RACK_SIZE} letters.`);
  }
}

export function validateEndGame(players: readonly Player[], endGame: EndGame): void {
  const ids = new Set(players.map((p) => p.id));
  for (const [playerId, letters] of Object.entries(endGame.remaining)) {
    if (!ids.has(playerId)) {
      throw new GameError(`Unknown player: ${playerId}`);
    }
    if (!RACK.test(letters) || letters.length > RACK_SIZE) {
      throw new GameError(
        `Tiles left must be up to ${RACK_SIZE} letters A-Z, with ${BLANK_SYMBOL} for a blank.`,
      );
    }
  }
  const wentOut = endGame.wentOutPlayerId;
  if (wentOut !== null) {
    if (!ids.has(wentOut)) {
      throw new GameError(`Unknown player: ${wentOut}`);
    }
    if (endGame.remaining[wentOut]) {
      throw new GameError('The player who went out cannot have tiles left.');
    }
  }
}
