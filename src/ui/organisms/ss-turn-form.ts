import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { scoreTurn } from '../../domain/scoring.ts';
import {
  byTurnKind,
  type TurnInput,
  type TurnKind,
  type TurnStrategies,
  type WordPlay,
} from '../../domain/types.ts';
import { MAX_WORDS_PER_TURN, RACK_SIZE } from '../../domain/validation.ts';
import {
  cycleTile,
  emptyWord,
  retile,
  tileMark,
  type WordSquare,
} from '../../domain/word-entry.ts';
import { buttonStyles } from '../atoms/button-styles.ts';
import { fieldStyles } from '../atoms/field-styles.ts';
import { MARK_LABELS, tileStyles } from '../atoms/tile.ts';
import { visuallyHiddenStyles } from '../atoms/visually-hidden.ts';
import { renderWordRow, wordLegend, wordRowStyles } from '../molecules/word-row.ts';
import { baseStyles } from '../styles/base.ts';

/** Fired with the turn when the form is valid and submitted. */
export class SaveTurnEvent extends Event {
  static readonly type = 'save-turn';
  readonly turn: TurnInput;

  constructor(turn: TurnInput) {
    super(SaveTurnEvent.type, { bubbles: true, composed: true });
    this.turn = turn;
  }
}

/** The label for each kind of turn. */
export const KIND_LABELS: Readonly<Record<TurnKind, string>> = {
  play: 'Played a word',
  pass: 'Passed',
  exchange: 'Exchanged tiles',
  withdrawn: 'Word withdrawn after a challenge',
};

const KINDS = Object.keys(KIND_LABELS) as TurnKind[];

interface PlayFields {
  words: WordPlay[];
  bingo: boolean;
}

const NEW_PLAY = (): PlayFields => ({ words: [emptyWord()], bingo: false });

/** The form's starting words and bingo for each kind of existing turn. */
const STARTING_FIELDS: TurnStrategies<PlayFields> = {
  play: ({ words, bingo }) => ({ words, bingo }),
  pass: NEW_PLAY,
  exchange: NEW_PLAY,
  withdrawn: NEW_PLAY,
};

/** Builds the turn to save for each kind, from the form's fields. */
const TURN_BUILDERS: Readonly<Record<TurnKind, (fields: PlayFields) => TurnInput>> = {
  play: ({ words, bingo }) => ({ kind: 'play', words, bingo }),
  pass: () => ({ kind: 'pass' }),
  exchange: () => ({ kind: 'exchange' }),
  withdrawn: () => ({ kind: 'withdrawn' }),
};

/** The error for a word, or undefined if it can be saved. */
const wordError = (word: WordPlay): string | undefined => {
  const length = word.tiles.length;
  if (length === 0) {
    return 'Enter the word.';
  }
  return length < 2 ? 'A word needs at least 2 letters.' : undefined;
};

const BINGO_ERROR = `A bingo uses all ${RACK_SIZE} tiles, so one word needs at least ${RACK_SIZE} letters.`;

const bingoError = ({ words, bingo }: PlayFields): string | undefined =>
  bingo && !words.some((word) => word.tiles.length >= RACK_SIZE) ? BINGO_ERROR : undefined;

/**
 * Turn entry: what kind of turn it was and, for a play, each word formed
 * with its tile marks and word squares, plus the bingo bonus. Shows each
 * word's score and the turn total as you go, and fires a SaveTurnEvent.
 */
@customElement('ss-turn-form')
export class SsTurnForm extends LitElement {
  static override styles = [
    baseStyles,
    buttonStyles,
    fieldStyles,
    visuallyHiddenStyles,
    tileStyles,
    wordRowStyles,
    css`
      /* Buttons size to their content; groups of fields fill the width. */
      form > .button {
        align-self: flex-start;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: var(--size-4);
      }

      .kinds {
        display: flex;
        flex-direction: column;
        gap: var(--size-2);
        margin: 0;
        padding: 0;
        border: none;
      }

      .kinds legend,
      .total {
        font-weight: var(--font-weight-6);
      }

      .choice {
        display: flex;
        align-items: center;
        gap: var(--size-2);
        min-block-size: 48px;
      }

      .choice input {
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }

      .words {
        display: flex;
        flex-direction: column;
        gap: var(--size-4);
      }

      .total {
        margin: 0;
        font-size: var(--font-size-4);
        font-variant-numeric: tabular-nums;
      }

      .summary {
        margin: 0;
        padding: var(--size-3);
        border-inline-start: var(--border-size-3) solid var(--ss-danger);
        background: var(--ss-surface-raised);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-3);
      }
    `,
  ];

  /** The turn to edit; leave unset to record a new one. */
  @property({ attribute: false }) turn: TurnInput | undefined;

  /** An error from saving the turn (e.g. a rule the store rejected). */
  @property() error = '';

  @state() kind: TurnKind = 'play';
  @state() words: WordPlay[] = [emptyWord()];
  @state() bingo = false;
  /** Errors by control: "word-0", "word-1", ..., "bingo". */
  @state() errors: Record<string, string> = {};
  @state() status = '';

  #edited = new Set<number>();
  #pendingFocus: string | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.turn) {
      const { words, bingo } = byTurnKind(STARTING_FIELDS, this.turn);
      this.kind = this.turn.kind;
      this.words = words;
      this.bingo = bingo;
    }
  }

  override updated(): void {
    const id = this.#pendingFocus;
    this.#pendingFocus = undefined;
    if (id) {
      this.renderRoot.querySelector<HTMLElement>(`#${id}`)?.focus();
    }
  }

  get #fields(): PlayFields {
    return { words: this.words, bingo: this.bingo };
  }

  #setError(key: string, message: string | undefined): void {
    const { [key]: _old, ...rest } = this.errors;
    this.errors = message ? { ...rest, [key]: message } : rest;
  }

  #updateWord(index: number, change: (word: WordPlay) => WordPlay): void {
    this.words = this.words.map((word, i) => (i === index ? change(word) : word));
  }

  #onKind = (kind: TurnKind): void => {
    this.kind = kind;
  };

  #onText = (index: number, text: string): void => {
    this.#updateWord(index, (word) => retile(word, text));
    this.#edited.add(index);
    this.#setError(`word-${index}`, undefined);
    this.#setError('bingo', undefined);
  };

  #onWordBlur = (index: number): void => {
    const word = this.words[index];
    if (word && this.#edited.has(index)) {
      this.#setError(`word-${index}`, wordError(word));
    }
  };

  #onTile = (index: number, tileIndex: number): void => {
    this.#updateWord(index, (word) => ({
      ...word,
      tiles: word.tiles.map((tile, i) => (i === tileIndex ? cycleTile(tile) : tile)),
    }));
    const tile = this.words[index]?.tiles[tileIndex];
    if (tile) {
      this.status = `${tile.letter}: ${MARK_LABELS[tileMark(tile)].spoken}.`;
    }
  };

  #onSquares = (index: number, square: WordSquare, count: number): void => {
    this.#updateWord(index, (word) => ({ ...word, [square]: count }));
  };

  #onAddWord = (): void => {
    this.words = [...this.words, emptyWord()];
    this.#pendingFocus = `word-${this.words.length - 1}`;
  };

  #onRemoveWord = (index: number): void => {
    this.words = this.words.filter((_, i) => i !== index);
    this.errors = {};
    this.#edited = new Set();
    this.#pendingFocus = `word-${index - 1}`;
    this.status = `${wordLegend(index)} removed.`;
  };

  #onBingo = (event: Event): void => {
    this.bingo = (event.target as HTMLInputElement).checked;
    this.#setError('bingo', undefined);
  };

  #onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (this.kind === 'play') {
      const errors: Record<string, string> = Object.fromEntries(
        this.words.flatMap((word, index) => {
          const message = wordError(word);
          return message ? [[`word-${index}`, message]] : [];
        }),
      );
      const bingo = bingoError(this.#fields);
      this.errors = bingo ? { ...errors, bingo } : errors;
      const [firstInvalid] = Object.keys(this.errors);
      if (firstInvalid) {
        this.#pendingFocus = firstInvalid;
        return;
      }
    }
    this.dispatchEvent(new SaveTurnEvent(TURN_BUILDERS[this.kind](this.#fields)));
  };

  #renderPlay() {
    const total = scoreTurn({ kind: 'play', words: this.words, bingo: this.bingo }).total;
    const bingoMessage = this.errors.bingo;
    return html`
      <div class="words">
        ${this.words.map((word, index) =>
          renderWordRow({
            word,
            index,
            error: this.errors[`word-${index}`],
            removable: index > 0,
            onText: (text) => this.#onText(index, text),
            onBlur: () => this.#onWordBlur(index),
            onTile: (tileIndex) => this.#onTile(index, tileIndex),
            onSquares: (square, count) => this.#onSquares(index, square, count),
            onRemove: () => this.#onRemoveWord(index),
          }),
        )}
      </div>
      ${
        this.words.length < MAX_WORDS_PER_TURN
          ? html`<button type="button" class="button" @click=${this.#onAddWord}>
              Add cross-word
            </button>`
          : nothing
      }
      <div>
        <label class="choice">
          <input
            id="bingo"
            type="checkbox"
            .checked=${this.bingo}
            aria-invalid=${bingoMessage ? 'true' : 'false'}
            aria-describedby=${bingoMessage ? 'bingo-error' : nothing}
            @change=${this.#onBingo}
          />
          Bingo: used all ${RACK_SIZE} tiles (+50)
        </label>
        ${bingoMessage ? html`<p class="error" id="bingo-error">${bingoMessage}</p>` : nothing}
      </div>
      <p class="total">Turn total: <output>${total}</output></p>
    `;
  }

  override render() {
    return html`
      <form novalidate @submit=${this.#onSubmit}>
        <fieldset class="kinds">
          <legend>This turn, the player...</legend>
          ${KINDS.map(
            (kind) => html`
              <label class="choice">
                <input
                  type="radio"
                  name="kind"
                  .value=${kind}
                  .checked=${this.kind === kind}
                  @change=${() => this.#onKind(kind)}
                />
                ${KIND_LABELS[kind]}
              </label>
            `,
          )}
        </fieldset>
        ${this.kind === 'play' ? this.#renderPlay() : nothing}
        ${this.error ? html`<p class="summary" role="alert">${this.error}</p>` : nothing}
        <div class="actions">
          <button type="submit" class="button primary">Save turn</button>
          <slot name="actions"></slot>
        </div>
        <p class="visually-hidden" role="status">${this.status}</p>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-turn-form': SsTurnForm;
  }
  interface HTMLElementEventMap {
    'save-turn': SaveTurnEvent;
  }
}
