/**
 * Building the bundled word list: pure functions used by build-wordlist.ts.
 * Kept free of file access so they can be unit-tested.
 */

/** A word the app can check: 2-15 lower-case letters a-z. */
export const WORD = /^[a-z]{2,15}$/;

/**
 * The words in a list, one per line. Lines that aren't exactly a word are
 * dropped rather than changed: capitalised lines are proper nouns, and lines
 * with apostrophes are possessives, neither of which can be played.
 */
export const parseWordList = (text: string): Set<string> =>
  new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => WORD.test(line)),
  );

/** Words in `british` that aren't in `american`: the British spellings. */
export const britishOnly = (
  british: ReadonlySet<string>,
  american: ReadonlySet<string>,
): Set<string> => new Set([...british].filter((word) => !american.has(word)));

/** Every word in any of the lists, sorted and without duplicates. */
export const mergeWordLists = (...lists: readonly ReadonlySet<string>[]): string[] =>
  [...new Set(lists.flatMap((list) => [...list]))].sort();

/** The file contents: one word per line, ending with a newline. */
export const formatWordList = (words: readonly string[]): string =>
  words.length === 0 ? '' : `${words.join('\n')}\n`;
