import { letterPoints } from './tiles.ts';
import type { EndGame, Player } from './types.ts';

export const BLANK_SYMBOL = '?';

/** Total face value of the letters left on a rack. Blanks ('?') count 0. */
export const rackValue = (letters: string): number =>
  letters
    .split('')
    .reduce((sum, letter) => sum + (letter === BLANK_SYMBOL ? 0 : letterPoints(letter)), 0);

/**
 * End-of-game adjustment for each player (playerId -> points).
 *
 * Each player loses the value of their unplayed tiles. If someone went out,
 * they gain the total of everyone else's unplayed tiles.
 */
export const endGameAdjustments = (
  players: readonly Player[],
  endGame: EndGame,
): Record<string, number> => {
  const adjustments: Record<string, number> = {};
  let leftOver = 0;

  for (const player of players) {
    const value = rackValue(endGame.remaining[player.id] ?? '');
    adjustments[player.id] = value === 0 ? 0 : -value; // avoid -0
    leftOver += value;
  }

  const wentOut = endGame.wentOutPlayerId;
  if (wentOut !== null) {
    // The player who went out has an empty rack, so their own value is 0.
    adjustments[wentOut] = leftOver;
  }

  return adjustments;
};
