import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { endGameAdjustments, rackValue } from '../../../domain/endgame.ts';
import { likelyWentOut, normaliseRack, rackError } from '../../../domain/endgame-entry.ts';
import { playerTotals } from '../../../domain/game.ts';
import type { EndGame, Game, Player } from '../../../domain/types.ts';
import { RACK_SIZE } from '../../../domain/validation.ts';
import { buttonStyles } from '../atoms/button-styles.ts';
import { fieldStyles } from '../atoms/field-styles.ts';
import { visuallyHiddenStyles } from '../atoms/visually-hidden.ts';
import { signed } from '../../format.ts';
import { baseStyles } from '../../styles/base.ts';

/** Fired with the end game when the form is valid and submitted. */
export class FinishGameEvent extends Event {
  static readonly type = 'finish-game';
  readonly endGame: EndGame;

  constructor(endGame: EndGame) {
    super(FinishGameEvent.type, { bubbles: true, composed: true });
    this.endGame = endGame;
  }
}

const NOBODY = 'nobody';

/** The id used for a player's rack field. */
const rackId = (player: Player): string => `rack-${player.id}`;

/**
 * End of game: the tiles left on each rack and who went out, with a preview
 * of the adjustments and final totals. Fires a FinishGameEvent.
 */
@customElement('ss-endgame-form')
export class SsEndgameForm extends LitElement {
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
        display: flex;
        flex-direction: column;
        gap: var(--size-3);
        margin: 0;
        padding: 0;
        border: none;
      }

      legend {
        margin-block-end: var(--size-2);
        font-weight: var(--font-weight-6);
      }

      .field input {
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .hint,
      .value {
        margin: 0;
        color: var(--ss-text-muted);
        font-size: var(--font-size-1);
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

      table {
        border-collapse: collapse;
        font-variant-numeric: tabular-nums;
      }

      caption {
        text-align: start;
        font-weight: var(--font-weight-6);
        padding-block-end: var(--size-2);
      }

      th,
      td {
        padding: var(--size-1) var(--size-3);
        border-block-end: var(--border-size-1) solid var(--ss-border);
        text-align: end;
      }

      th[scope='row'],
      thead th:first-child {
        text-align: start;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-3);
      }

      .summary {
        margin: 0;
        padding: var(--size-3);
        border-inline-start: var(--border-size-3) solid var(--ss-danger);
        background: var(--ss-surface-raised);
      }
    `,
  ];

  /** The game being finished. */
  @property({ attribute: false }) game: Game | undefined;

  /** An error from finishing the game (e.g. a rule the store rejected). */
  @property() error = '';

  /** Tiles left by player id, as typed (normalised). */
  @state() racks: Record<string, string> = {};
  /** The player who went out, or null for nobody. */
  @state() wentOut: string | null = null;
  @state() errors: Record<string, string> = {};

  /** Once the player picks who went out, stop suggesting it. */
  #wentOutChosen = false;
  #edited = new Set<string>();
  #pendingFocus: string | undefined;

  override updated(): void {
    const id = this.#pendingFocus;
    this.#pendingFocus = undefined;
    if (id) {
      this.renderRoot.querySelector<HTMLElement>(`#${id}`)?.focus();
    }
  }

  get #players(): readonly Player[] {
    return this.game?.players ?? [];
  }

  get #endGame(): EndGame {
    return { wentOutPlayerId: this.wentOut, remaining: this.racks };
  }

  /** The error for a player's rack, including the rule that whoever went out has none left. */
  #errorFor(player: Player): string | undefined {
    const rack = this.racks[player.id] ?? '';
    if (player.id === this.wentOut && rack) {
      return `${player.name} went out, so their rack must be empty.`;
    }
    return rackError(rack);
  }

  #setError(playerId: string, message: string | undefined): void {
    const { [playerId]: _old, ...rest } = this.errors;
    this.errors = message ? { ...rest, [playerId]: message } : rest;
  }

  #onRack = (player: Player, event: Event): void => {
    const rack = normaliseRack((event.target as HTMLInputElement).value);
    this.racks = { ...this.racks, [player.id]: rack };
    this.#edited.add(player.id);
    this.#setError(player.id, undefined);
    if (!this.#wentOutChosen) {
      this.wentOut = likelyWentOut(this.#players, this.racks);
    }
  };

  #onRackBlur = (player: Player): void => {
    if (this.#edited.has(player.id)) {
      this.#setError(player.id, this.#errorFor(player));
    }
  };

  /**
   * On click rather than change: picking the already-selected option (e.g.
   * confirming "Nobody") is still a choice, and stops the suggestions.
   * Keyboard selection fires click too.
   */
  #onWentOut = (value: string): void => {
    this.wentOut = value === NOBODY ? null : value;
    this.#wentOutChosen = true;
    this.errors = {};
  };

  #onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const players = this.#players;
    this.errors = Object.fromEntries(
      players.flatMap((player) => {
        const message = this.#errorFor(player);
        return message ? [[player.id, message]] : [];
      }),
    );
    const firstInvalid = players.find((player) => this.errors[player.id]);
    if (firstInvalid) {
      this.#pendingFocus = rackId(firstInvalid);
      return;
    }
    this.dispatchEvent(new FinishGameEvent(this.#endGame));
  };

  #renderRack(player: Player) {
    const id = rackId(player);
    const rack = this.racks[player.id] ?? '';
    const error = this.errors[player.id];
    const describedBy = [`${id}-value`, error ? `${id}-error` : ''].filter(Boolean).join(' ');
    return html`
      <div class="field">
        <label for=${id}>${player.name}</label>
        <input
          id=${id}
          name=${id}
          .value=${rack}
          maxlength=${RACK_SIZE + 1}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          spellcheck="false"
          aria-invalid=${error ? 'true' : 'false'}
          aria-describedby=${describedBy}
          @input=${(event: Event) => this.#onRack(player, event)}
          @blur=${() => this.#onRackBlur(player)}
        />
        <p class="value" id="${id}-value">Tile value: ${rackValue(rack.slice(0, RACK_SIZE))}</p>
        ${error ? html`<p class="error" id="${id}-error">${error}</p>` : nothing}
      </div>
    `;
  }

  #renderPreview(game: Game) {
    const adjustments = endGameAdjustments(game.players, this.#endGame);
    const totals = playerTotals(game);
    return html`
      <table>
        <caption>
          Final scores
        </caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Turns</th>
            <th scope="col">End game</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          ${totals.map(({ player, turns }) => {
            const adjustment = adjustments[player.id] ?? 0;
            return html`
              <tr>
                <th scope="row">${player.name}</th>
                <td>${turns}</td>
                <td>${signed(adjustment)}</td>
                <td>${turns + adjustment}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  override render() {
    const { game } = this;
    if (!game) {
      return nothing;
    }
    return html`
      <form novalidate @submit=${this.#onSubmit}>
        <fieldset>
          <legend>Tiles left on each rack</legend>
          <p class="hint">Type the letters, with ? for a blank. Leave empty if none.</p>
          ${game.players.map((player) => this.#renderRack(player))}
        </fieldset>
        <fieldset>
          <legend>Who went out?</legend>
          ${[{ id: NOBODY, name: 'Nobody' }, ...game.players].map(
            (option) => html`
              <label class="choice">
                <input
                  type="radio"
                  name="went-out"
                  .value=${option.id}
                  .checked=${(this.wentOut ?? NOBODY) === option.id}
                  @click=${() => this.#onWentOut(option.id)}
                />
                ${option.name}
              </label>
            `,
          )}
        </fieldset>
        ${this.#renderPreview(game)}
        ${this.error ? html`<p class="summary" role="alert">${this.error}</p>` : nothing}
        <div class="actions">
          <button type="submit" class="button primary">Finish game</button>
          <slot name="actions"></slot>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-endgame-form': SsEndgameForm;
  }
  interface HTMLElementEventMap {
    'finish-game': FinishGameEvent;
  }
}
