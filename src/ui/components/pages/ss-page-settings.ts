import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Settings } from '../../../state/settings.ts';
import type { WordList, WordListStatus } from '../../../words/word-list.ts';
import { PageElement } from './page-element.ts';

/** Each on/off setting: its label and a line explaining it. */
const TOGGLES: readonly { key: keyof Settings; label: string; hint: string }[] = [
  {
    key: 'keepScreenOn',
    label: 'Keep the screen on during games',
    hint: "Stops your phone or tablet going to sleep between turns while a game is in progress. Some browsers don't support this.",
  },
  {
    key: 'checkWords',
    label: 'Check words as I type them',
    hint: "Shows whether each word is in the word list while you enter a turn. It's only a guide and never stops you saving.",
  },
];

/** What the page says about the word list, by its status. */
const WORD_LIST_STATUS: Readonly<Record<WordListStatus, string>> = {
  idle: '',
  loading: 'Downloading the word list...',
  ready: 'The word list is downloaded, so word checks work offline.',
  error: "The word list couldn't be downloaded. Check your connection and try again.",
};

/** Device settings: keeping the screen on, word checks, and the offline word list. */
@customElement('ss-page-settings')
export class SsPageSettings extends PageElement {
  static override styles = [
    ...PageElement.styles,
    css`
      .setting {
        display: flex;
        flex-direction: column;
        gap: var(--size-1);
      }

      .choice {
        display: flex;
        align-items: center;
        gap: var(--size-2);
        min-block-size: 48px;
        font-weight: var(--font-weight-6);
      }

      .choice input {
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }

      .hint {
        margin: 0;
        color: var(--ss-text-muted);
        font-size: var(--font-size-1);
      }

      h2 {
        margin: var(--size-3) 0 0;
        font-size: var(--font-size-4);
      }

      .word-list {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--size-3);
      }

      .word-list p {
        margin: 0;
      }

      .word-list p:empty {
        display: none;
      }
    `,
  ];

  /** The word list, for downloading it ahead of time. */
  @property({ attribute: false }) wordList: WordList | undefined;

  /** Bumped when the word list's status changes, to re-render. */
  @state() wordListStatus: WordListStatus = 'idle';

  #unsubscribeWordList: (() => void) | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.wordListStatus = this.wordList?.status ?? 'idle';
    this.#unsubscribeWordList = this.wordList?.subscribe(() => {
      this.wordListStatus = this.wordList?.status ?? 'idle';
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribeWordList?.();
  }

  #onToggle = (key: keyof Settings, event: Event): void => {
    const input = event.target as HTMLInputElement;
    this.store?.updateSettings({ [key]: input.checked });
    // The checkbox always shows the saved setting, even if it didn't change.
    input.checked = this.state.settings[key];
  };

  #onDownload = (): void => {
    void this.wordList?.load();
  };

  override render() {
    const { settings } = this.state;
    return html`
      <div class="stack">
        <h1 tabindex="-1">Settings</h1>
        <p class="lead">These settings are saved on this device.</p>
        ${TOGGLES.map(
          ({ key, label, hint }) => html`
            <div class="setting">
              <label class="choice">
                <input
                  type="checkbox"
                  .checked=${settings[key]}
                  aria-describedby="${key}-hint"
                  @change=${(event: Event) => this.#onToggle(key, event)}
                />
                ${label}
              </label>
              <p class="hint" id="${key}-hint">${hint}</p>
            </div>
          `,
        )}
        <section class="word-list" aria-labelledby="word-list-heading">
          <h2 id="word-list-heading">Word list</h2>
          <p>
            Word checks use a British English list of about 169,000 words. It downloads the first
            time it's used; download it now to check words offline straight away.
          </p>
          <button
            type="button"
            class="button"
            ?disabled=${this.wordListStatus === 'loading' || this.wordListStatus === 'ready'}
            @click=${this.#onDownload}
          >
            Download the word list for offline use
          </button>
          <p role="status">${WORD_LIST_STATUS[this.wordListStatus]}</p>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-settings': SsPageSettings;
  }
}
