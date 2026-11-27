import { html, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { currentRound, nextPlayer, roundOf } from '../../../domain/game.ts';
import type { Game } from '../../../domain/types.ts';
import type { Outcome } from '../../../state/store.ts';
import { visuallyHiddenStyles } from '../atoms/visually-hidden.ts';
import '../molecules/ss-confirm-dialog.ts';
import type { SsConfirmDialog } from '../molecules/ss-confirm-dialog.ts';
import '../organisms/ss-scoreboard.ts';
import { END, NEW_GAME, RESULTS, TURN } from '../../router.ts';
import { PageElement } from './page-element.ts';

/** The line under the heading, by game status. */
const SUMMARY: Readonly<Record<Game['status'], (game: Game) => string>> = {
  active: (game) => `Round ${currentRound(game)}: ${nextPlayer(game).name} to play.`,
  finished: () => 'This game has finished.',
};

/** The scoreboard for the current game, with pass and undo. */
@customElement('ss-page-game')
export class SsPageGame extends PageElement {
  static override styles = [...PageElement.styles, visuallyHiddenStyles];

  @state() error = '';
  @state() status = '';

  @query('ss-confirm-dialog') confirmDialog!: SsConfirmDialog;

  /** Shows a store outcome: clears or sets the error, and announces success. */
  #report(outcome: Outcome, success: string): void {
    this.error = outcome.ok ? '' : outcome.error;
    this.status = outcome.ok ? success : '';
  }

  #onPass = (): void => {
    const { game } = this.state;
    if (!this.store || !game) {
      return;
    }
    const player = nextPlayer(game).name;
    this.#report(this.store.addTurn({ kind: 'pass' }), `${player} passed.`);
  };

  #onUndo = async (): Promise<void> => {
    const game = this.state.game;
    const index = (game?.turns.length ?? 0) - 1;
    const last = game?.turns[index];
    const player = game?.players.find((p) => p.id === last?.playerId);
    if (!this.store || !game || !last || !player) {
      return;
    }
    const confirmed = await this.confirmDialog.ask({
      heading: `Undo ${player.name}'s turn?`,
      message: `This removes ${player.name}'s turn from round ${roundOf(index, game.players.length)}.`,
      confirmLabel: 'Undo turn',
      tone: 'danger',
    });
    if (confirmed) {
      this.#report(this.store.undoTurn(), `${player.name}'s turn was undone.`);
    }
  };

  #renderActions(game: Game) {
    return html`
      <div class="actions">
        <a class="button primary" href=${TURN}>Enter turn (${nextPlayer(game).name})</a>
        <button type="button" class="button" @click=${this.#onPass}>
          Pass (${nextPlayer(game).name})
        </button>
        ${
          game.turns.length > 0
            ? html`<button type="button" class="button" @click=${this.#onUndo}>
                Undo last turn
              </button>`
            : nothing
        }
        <a class="button" href=${END}>End game</a>
      </div>
    `;
  }

  /** The actions under the scoreboard, by game status. */
  #actionsFor(game: Game) {
    const byStatus: Record<Game['status'], () => unknown> = {
      active: () => this.#renderActions(game),
      finished: () =>
        html`<div class="actions">
          <a class="button primary" href=${RESULTS}>See the results</a>
        </div>`,
    };
    return byStatus[game.status]();
  }

  override render() {
    const { game } = this.state;
    if (!game) {
      return html`
        <div class="stack">
          <h1 tabindex="-1">Scoreboard</h1>
          <p class="lead">There's no game in progress.</p>
          <a class="button primary" href=${NEW_GAME}>Start a new game</a>
        </div>
      `;
    }
    return html`
      <div class="stack">
        <h1 tabindex="-1">Scoreboard</h1>
        <p class="lead">${SUMMARY[game.status](game)}</p>
        <ss-scoreboard .game=${game}></ss-scoreboard>
        ${this.#actionsFor(game)}
        ${this.error ? html`<p class="alert" role="alert">${this.error}</p>` : nothing}
        <p class="visually-hidden" role="status">${this.status}</p>
        <a class="button" href=${NEW_GAME}>New game</a>
      </div>
      <ss-confirm-dialog></ss-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-game': SsPageGame;
  }
}
