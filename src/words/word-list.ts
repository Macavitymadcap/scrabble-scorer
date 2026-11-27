import wordListUrl from './en-gb.txt?url';

/** Where the word list is in loading. */
export type WordListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WordListOptions {
  /** Fetches the list's text. Defaults to fetching the bundled en-gb.txt. */
  fetchText?: () => Promise<string>;
}

/** Fetches the bundled list, which the service worker caches after the first time. */
const fetchBundledList = async (): Promise<string> => {
  const response = await fetch(wordListUrl);
  if (!response.ok) {
    throw new Error(`Word list request failed: ${response.status}`);
  }
  return response.text();
};

/**
 * The bundled British English word list (about 169,000 words). It's only
 * fetched the first time it's needed, so it doesn't slow down opening the
 * app, then checked from memory.
 */
export class WordList {
  readonly #fetchText: () => Promise<string>;
  readonly #listeners = new Set<() => void>();
  #words: Set<string> | undefined;
  #loading: Promise<boolean> | undefined;
  #status: WordListStatus = 'idle';

  constructor({ fetchText = fetchBundledList }: WordListOptions = {}) {
    this.#fetchText = fetchText;
  }

  get status(): WordListStatus {
    return this.#status;
  }

  /** Calls `listener` whenever the status changes. Returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /**
   * Loads the list if it isn't loaded yet. Resolves true once it's ready, or
   * false if it couldn't be fetched (e.g. offline before it was ever cached);
   * calling again then retries.
   */
  load = (): Promise<boolean> => {
    if (this.#status === 'ready') {
      return Promise.resolve(true);
    }
    this.#loading ??= this.#fetch();
    return this.#loading;
  };

  /**
   * Whether the word is in the list, ignoring case. Undefined until the list
   * has loaded.
   */
  contains = (word: string): boolean | undefined => this.#words?.has(word.toLowerCase());

  async #fetch(): Promise<boolean> {
    this.#setStatus('loading');
    try {
      const text = await this.#fetchText();
      this.#words = new Set(text.split(/\r?\n/).filter(Boolean));
      this.#setStatus('ready');
      return true;
    } catch {
      this.#loading = undefined;
      this.#setStatus('error');
      return false;
    }
  }

  #setStatus(status: WordListStatus): void {
    this.#status = status;
    this.#listeners.forEach((listener) => listener());
  }
}
