/** A number with its sign, e.g. "+11", "-8" or "0", for score adjustments. */
export const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

export const UNKNOWN_DATE = 'an unknown date';

/**
 * When a game was played, e.g. "27 Nov 2026, 19:30". `timeZone` defaults to
 * the device's; tests pass one for a fixed result. A timestamp that isn't a
 * valid date (saved data only checks it's text) shows as "an unknown date"
 * rather than throwing.
 */
export const formatPlayedAt = (iso: string, timeZone?: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_DATE;
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
};

/** Names joined for prose: "Ann", "Ann and Bob", "Ann, Bob and Cat". */
export const joinNames = (names: readonly string[]): string =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
