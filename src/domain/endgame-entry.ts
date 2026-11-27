import { BLANK_SYMBOL } from './endgame.ts';
import type { Player } from './types.ts';
import { RACK_SIZE } from './validation.ts';

/** Rack letters as typed: upper case A-Z, with '?' for a blank; anything else dropped. */
export const normaliseRack = (text: string): string => text.toUpperCase().replace(/[^A-Z?]/g, '');

/** The error for a rack as entered, or undefined if it's fine. */
export const rackError = (letters: string): string | undefined =>
  letters.length > RACK_SIZE
    ? `A rack holds at most ${RACK_SIZE} tiles. Use ${BLANK_SYMBOL} for a blank.`
    : undefined;

/**
 * The player who most likely went out: the only one with an empty rack once
 * everyone else's tiles are entered. Null when that's not clear yet.
 */
export const likelyWentOut = (
  players: readonly Player[],
  racks: Readonly<Record<string, string>>,
): string | null => {
  const empty = players.filter((player) => !racks[player.id]);
  const [only] = empty;
  return empty.length === 1 && only ? only.id : null;
};
