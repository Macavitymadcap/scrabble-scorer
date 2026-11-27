import { html, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { standings } from '../../domain/game.ts';
import type { Game } from '../../domain/types.ts';
import '../molecules/ss-confirm-dialog.ts';
import type { SsConfirmDialog } from '../molecules/ss-confirm-dialog.ts';
import '../organisms/ss-results.ts';
import { outcomeText } from '../organisms/ss-results.ts';
import { formatPlayedAt } from '../format.ts';
import { HISTORY, NEW_GAME, historyPath, navigate } from '../router.ts';
import { PageElement } from './page-element.ts';

/** "Ann 312, Bob 280" in ranking order. */
const scoresText = (game: Game): string =>
  standings(game)
    .ranking.map(({ player, total }) => `${player.name} ${total}`)
    .join(', ');

/** Finished games (`#/history`) and one past game's results (`#/history/<id>`). */
@customElement('ss-page-history')
export class SsPageHistory extends PageElement {
  /** The id of the past game to show; unset for the list. */
  @property({ attribute: false }) gameId: string | undefined;

  @query('ss-confirm-dialog') confirmDialog!: SsConfirmDialog;

  /** Asks first, then runs a destructive history action and goes to the list. */
  async #confirmThen(heading: string, message: string, action: () => void): Promise<void> {
    const confirmed = await this.confirmDialog.ask({
      heading,
      message,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) {
      action();
      navigate(HISTORY);
    }
  }

  #onClear = (): Promise<void> =>
    this.#confirmThen(
      'Delete all saved games?',
      'Every finished game will be removed from this device. This cannot be undone.',
      () => this.store?.clearHistory(),
    );

  #onDelete = (game: Game): Promise<void> =>
    this.#confirmThen(
      'Delete this game?',
      `The game played ${formatPlayedAt(game.createdAt)} will be removed from this device. This cannot be undone.`,
      () => this.store?.deleteFromHistory(game.id),
    );

  #renderList(history: readonly Game[]): TemplateResult {
    if (history.length === 0) {
      return html`
        <p class="lead">No finished games yet.</p>
        <a class="button primary" href=${NEW_GAME}>Start a new game</a>
      `;
    }
    return html`
      <ol class="games">
        ${history.map(
          (game) => html`
            <li>
              <a href=${historyPath(game.id)}>${formatPlayedAt(game.createdAt)}</a>
              <p>${scoresText(game)}. ${outcomeText(game)}</p>
            </li>
          `,
        )}
      </ol>
      <button type="button" class="button danger" @click=${this.#onClear}>
        Delete all saved games
      </button>
    `;
  }

  #renderGame(game: Game | undefined): TemplateResult {
    if (!game) {
      return html`
        <h1 tabindex="-1">Game not found</h1>
        <p class="lead">That game isn't in your saved history. It may have been deleted.</p>
        <a class="button primary" href=${HISTORY}>Back to game history</a>
      `;
    }
    return html`
      <h1 tabindex="-1">Game on ${formatPlayedAt(game.createdAt)}</h1>
      <ss-results .game=${game}></ss-results>
      <div class="actions">
        <a class="button primary" href=${HISTORY}>Back to game history</a>
        <button type="button" class="button danger" @click=${() => this.#onDelete(game)}>
          Delete this game
        </button>
      </div>
    `;
  }

  override render() {
    const { history } = this.state;
    const content =
      this.gameId === undefined
        ? html`<h1 tabindex="-1">Game history</h1>
            ${this.#renderList(history)}`
        : this.#renderGame(history.find((game) => game.id === this.gameId));
    return html`
      <div class="stack">${content}</div>
      <ss-confirm-dialog></ss-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-history': SsPageHistory;
  }
}
