import { css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { normaliseWordText } from '../../../domain/word-entry.ts';
import type { WordList } from '../../../words/word-list.ts';
import { fieldStyles } from '../atoms/field-styles.ts';
import { PageElement } from './page-element.ts';

/** The outcome of checking a word. */
type LookupResult = 'found' | 'missing' | 'unavailable';

/** The message for each outcome. Missing words are never called invalid. */
const RESULT_MESSAGES: Readonly<Record<LookupResult, (word: string) => string>> = {
  found: (word) => `${word} is in the word list.`,
  missing: (word) =>
    `${word} isn't in the word list. It may still be allowed in Collins Scrabble Words, which this list doesn't fully cover.`,
  unavailable: () =>
    "The word list couldn't be loaded. Connect to the internet once and it will be saved for offline use.",
};

/** The outcome for a word, given whether the list loaded and whether it has the word. */
const lookupResult = (loaded: boolean, found: boolean | undefined): LookupResult => {
  if (!loaded) {
    return 'unavailable';
  }
  return found ? 'found' : 'missing';
};

const TOO_SHORT = 'Enter a word of 2 to 15 letters.';

/** Check a word against the bundled British English word list. */
@customElement('ss-page-lookup')
export class SsPageLookup extends PageElement {
  static override styles = [
    ...PageElement.styles,
    fieldStyles,
    css`
      form {
        display: flex;
        flex-direction: column;
        gap: var(--size-3);
        align-self: stretch;
      }

      .field input {
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      form > .button {
        align-self: flex-start;
      }

      .result {
        margin: 0;
        font-size: var(--font-size-3);
      }

      .result:empty {
        display: none;
      }

      .note {
        margin: 0;
        color: var(--ss-text-muted);
        font-size: var(--font-size-1);
      }
    `,
  ];

  /** The word list to check against. */
  @property({ attribute: false }) wordList: WordList | undefined;

  @state() error = '';
  @state() message = '';
  @state() checking = false;

  @query('input') input!: HTMLInputElement;

  #onInput = (): void => {
    this.error = '';
  };

  #onSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const word = normaliseWordText(this.input.value);
    this.input.value = word;
    if (word.length < 2) {
      this.error = TOO_SHORT;
      this.message = '';
      this.input.focus();
      return;
    }
    if (!this.wordList) {
      return;
    }
    this.checking = true;
    this.message = 'Checking...';
    const loaded = await this.wordList.load();
    const result = lookupResult(loaded, this.wordList.contains(word));
    this.message = RESULT_MESSAGES[result](word);
    this.checking = false;
  };

  override render() {
    return html`
      <div class="stack">
        <h1 tabindex="-1">Check a word</h1>
        <form novalidate @submit=${this.#onSubmit}>
          <div class="field">
            <label for="word">Word</label>
            <input
              id="word"
              name="word"
              maxlength="15"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              spellcheck="false"
              enterkeyhint="search"
              aria-invalid=${this.error ? 'true' : 'false'}
              aria-describedby=${this.error ? 'word-error' : nothing}
              @input=${this.#onInput}
            />
            ${this.error ? html`<p class="error" id="word-error">${this.error}</p>` : nothing}
          </div>
          <button type="submit" class="button primary" ?disabled=${this.checking}>Check</button>
          <p class="result" role="status">${this.message}</p>
        </form>
        <p class="note">
          The list is a British English list built from ENABLE and SCOWL, about 169,000 words. It's
          close to, but not the same as, the official Collins Scrabble Words, so treat it as a
          guide.
        </p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-lookup': SsPageLookup;
  }
}
