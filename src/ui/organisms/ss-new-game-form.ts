import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/validation.ts';
import { buttonStyles } from '../atoms/button-styles.ts';
import { fieldStyles } from '../atoms/field-styles.ts';
import { visuallyHiddenStyles } from '../atoms/visually-hidden.ts';
import { baseStyles } from '../styles/base.ts';

/** Fired with the trimmed player names, in turn order, when the form is valid. */
export class StartGameEvent extends Event {
  static readonly type = 'start-game';
  readonly names: string[];

  constructor(names: string[]) {
    super(StartGameEvent.type, { bubbles: true, composed: true });
    this.names = names;
  }
}

interface PlayerRow {
  /** Stable key, so rows keep their DOM (and focus) when reordered. */
  key: number;
  name: string;
}

type Move = 'up' | 'down';

/** Which control to focus after the next render, by row key and control name. */
interface PendingFocus {
  key: number;
  control: 'input' | Move;
}

/** Offset applied to a row's index for each move direction. */
const MOVE_OFFSET: Readonly<Record<Move, number>> = { up: -1, down: 1 };

/** The control to fall back to when a move leaves the pressed button disabled. */
const OPPOSITE: Readonly<Record<Move, Move>> = { up: 'down', down: 'up' };

/** The validation message for a name, or undefined if it's fine. */
const nameError = (rows: readonly PlayerRow[], index: number): string | undefined => {
  const name = rows[index]?.name.trim() ?? '';
  if (!name) {
    return `Enter a name for player ${index + 1}.`;
  }
  const firstWithName = rows.findIndex(
    (row) => row.name.trim().toLowerCase() === name.toLowerCase(),
  );
  return firstWithName < index ? `${name} is already playing.` : undefined;
};

/**
 * The new-game form: 2-4 player names in turn order, with buttons to add,
 * remove and reorder players. Validates on blur (once edited) and on
 * submit, then fires a StartGameEvent.
 */
@customElement('ss-new-game-form')
export class SsNewGameForm extends LitElement {
  static override styles = [
    baseStyles,
    buttonStyles,
    fieldStyles,
    visuallyHiddenStyles,
    css`
      form {
        display: flex;
        flex-direction: column;
        gap: var(--size-5);
      }

      fieldset {
        margin: 0;
        padding: 0;
        border: none;
      }

      legend {
        margin-block-end: var(--size-3);
        font-weight: var(--font-weight-6);
      }

      ol {
        display: flex;
        flex-direction: column;
        gap: var(--size-4);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: end;
        gap: var(--size-2);
      }

      .row-actions {
        display: flex;
        gap: var(--size-1);
      }

      .summary {
        margin: 0;
        padding: var(--size-3);
        border-inline-start: var(--border-size-3) solid var(--ss-danger);
        background: var(--ss-surface-raised);
      }
    `,
  ];

  /** Names to start with, e.g. the players from the last game. */
  @property({ attribute: false }) initialNames: readonly string[] = [];

  /** An error from starting the game (e.g. a rule the store rejected). */
  @property() error = '';

  @state() rows: PlayerRow[] = [];
  @state() errors: Record<number, string> = {};
  @state() status = '';

  @queryAll('input') inputs!: NodeListOf<HTMLInputElement>;

  #nextKey = 0;
  #edited = new Set<number>();
  #pendingFocus: PendingFocus | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.rows.length === 0) {
      const names = this.initialNames.slice(0, MAX_PLAYERS);
      const padded = [...names, ...Array<string>(Math.max(0, MIN_PLAYERS - names.length)).fill('')];
      this.rows = padded.map((name) => this.#newRow(name));
    }
  }

  override updated(): void {
    const pending = this.#pendingFocus;
    this.#pendingFocus = undefined;
    if (pending) {
      this.renderRoot
        .querySelector<HTMLElement>(
          `[data-key="${pending.key}"] [data-control="${pending.control}"]`,
        )
        ?.focus();
    }
  }

  #newRow(name = ''): PlayerRow {
    this.#nextKey += 1;
    return { key: this.#nextKey, name };
  }

  #setError(key: number, message: string | undefined): void {
    const { [key]: _old, ...rest } = this.errors;
    this.errors = message ? { ...rest, [key]: message } : rest;
  }

  #onInput = (key: number, event: Event): void => {
    const { value } = event.target as HTMLInputElement;
    this.rows = this.rows.map((row) => (row.key === key ? { ...row, name: value } : row));
    this.#edited.add(key);
    // Clear an error as soon as the player starts fixing it; re-check on blur.
    this.#setError(key, undefined);
  };

  #onBlur = (key: number): void => {
    if (this.#edited.has(key)) {
      const index = this.rows.findIndex((row) => row.key === key);
      this.#setError(key, nameError(this.rows, index));
    }
  };

  #onAdd = (): void => {
    const row = this.#newRow();
    this.rows = [...this.rows, row];
    this.#pendingFocus = { key: row.key, control: 'input' };
  };

  #onRemove = (key: number): void => {
    const index = this.rows.findIndex((row) => row.key === key);
    const removed = this.rows[index];
    this.rows = this.rows.filter((row) => row.key !== key);
    this.#setError(key, undefined);
    const neighbour = this.rows[Math.min(index, this.rows.length - 1)];
    if (neighbour) {
      this.#pendingFocus = { key: neighbour.key, control: 'input' };
    }
    this.status = `${removed?.name.trim() || `Player ${index + 1}`} removed.`;
  };

  #onMove = (key: number, move: Move): void => {
    const from = this.rows.findIndex((row) => row.key === key);
    const to = from + MOVE_OFFSET[move];
    const row = this.rows[from];
    if (!row || to < 0 || to >= this.rows.length) {
      return;
    }
    const rows = this.rows.toSpliced(from, 1).toSpliced(to, 0, row);
    this.rows = rows;
    // The row's DOM moves, which drops focus; put it back on the same button,
    // or the other one if this move took the row to the end of the list.
    const atEnd = (move === 'up' && to === 0) || (move === 'down' && to === rows.length - 1);
    this.#pendingFocus = { key, control: atEnd ? OPPOSITE[move] : move };
    this.status = `${row.name.trim() || 'Player'} moved to position ${to + 1}.`;
  };

  #onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const errors = Object.fromEntries(
      this.rows.flatMap((row, index) => {
        const message = nameError(this.rows, index);
        return message ? [[row.key, message]] : [];
      }),
    );
    this.errors = errors;
    const firstInvalid = this.rows.find((row) => errors[row.key]);
    if (firstInvalid) {
      this.#pendingFocus = { key: firstInvalid.key, control: 'input' };
      return;
    }
    this.dispatchEvent(new StartGameEvent(this.rows.map((row) => row.name.trim())));
  };

  #renderRow = (row: PlayerRow, index: number) => {
    const id = `player-${row.key}`;
    const error = this.errors[row.key];
    const count = this.rows.length;
    const label = row.name.trim() || `player ${index + 1}`;
    return html`
      <li data-key=${row.key}>
        <div class="field">
          <label for=${id}>Player ${index + 1}</label>
          <input
            id=${id}
            name="player"
            data-control="input"
            .value=${row.name}
            required
            maxlength="20"
            autocomplete="off"
            autocapitalize="words"
            enterkeyhint=${index === count - 1 ? 'done' : 'next'}
            aria-invalid=${error ? 'true' : 'false'}
            aria-describedby=${error ? `${id}-error` : nothing}
            @input=${(event: Event) => this.#onInput(row.key, event)}
            @blur=${() => this.#onBlur(row.key)}
          />
          ${error ? html`<p class="error" id="${id}-error">${error}</p>` : nothing}
        </div>
        <div class="row-actions">
          <button
            type="button"
            class="button icon"
            data-control="up"
            aria-label="Move ${label} up"
            ?disabled=${index === 0}
            @click=${() => this.#onMove(row.key, 'up')}
          >
            &uarr;
          </button>
          <button
            type="button"
            class="button icon"
            data-control="down"
            aria-label="Move ${label} down"
            ?disabled=${index === count - 1}
            @click=${() => this.#onMove(row.key, 'down')}
          >
            &darr;
          </button>
          ${
            count > MIN_PLAYERS
              ? html`<button
                  type="button"
                  class="button icon"
                  data-control="remove"
                  aria-label="Remove ${label}"
                  @click=${() => this.#onRemove(row.key)}
                >
                  &times;
                </button>`
              : nothing
          }
        </div>
      </li>
    `;
  };

  override render() {
    return html`
      <form novalidate @submit=${this.#onSubmit}>
        <fieldset>
          <legend>Players, in turn order</legend>
          <ol>
            ${repeat(this.rows, (row) => row.key, this.#renderRow)}
          </ol>
        </fieldset>
        ${
          this.rows.length < MAX_PLAYERS
            ? html`<button type="button" class="button" @click=${this.#onAdd}>Add player</button>`
            : nothing
        }
        ${this.error ? html`<p class="summary" role="alert">${this.error}</p>` : nothing}
        <button type="submit" class="button primary">Start game</button>
        <p class="visually-hidden" role="status">${this.status}</p>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-new-game-form': SsNewGameForm;
  }
  interface HTMLElementEventMap {
    'start-game': StartGameEvent;
  }
}
