/// <reference types="node" />
/**
 * Builds src/words/en-gb.txt, the bundled British English word list.
 *
 *   npm run build:wordlist -- --enable <path to enable1.txt>
 *
 * Inputs (read from disk; this script downloads nothing):
 * - ENABLE (public domain): --enable, required. See THIRD_PARTY_NOTICES.md
 *   for its source and SHA-256.
 * - SCOWL British and American lists: --british and --american, defaulting
 *   to Ubuntu's wbritish/wamerican (/usr/share/dict). Words in the British
 *   list but not the American one are the British spellings.
 * - scripts/extras.txt: a few words ENABLE predates (qi, za).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { britishOnly, formatWordList, mergeWordLists, parseWordList } from './wordlist.ts';

const { values } = parseArgs({
  options: {
    enable: { type: 'string' },
    british: { type: 'string', default: '/usr/share/dict/british-english' },
    american: { type: 'string', default: '/usr/share/dict/american-english' },
    extras: { type: 'string', default: 'scripts/extras.txt' },
    out: { type: 'string', default: 'src/words/en-gb.txt' },
  },
});

if (!values.enable) {
  console.error('Usage: npm run build:wordlist -- --enable <path to enable1.txt>');
  process.exit(1);
}

const read = (path: string) => parseWordList(readFileSync(path, 'utf8'));

const enable = read(values.enable);
const british = britishOnly(read(values.british), read(values.american));
const extras = read(values.extras);
const words = mergeWordLists(enable, british, extras);
writeFileSync(values.out, formatWordList(words));

console.log(
  `Wrote ${words.length} words to ${values.out}: ${enable.size} from ENABLE, ` +
    `${words.length - enable.size} added from ${british.size} British spellings ` +
    `and ${extras.size} extras.`,
);
