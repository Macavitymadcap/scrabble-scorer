import { html, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import '../molecules/ss-confirm-dialog.ts';
import type { SsConfirmDialog } from '../molecules/ss-confirm-dialog.ts';
import '../organisms/ss-results.ts';
import { END, GAME, NEW_GAME, navigate } from '../router.ts';
import { PageElement } from './page-element.ts';

/** The current game's results, with new game, scoreboard and reopen. */
@customElement('ss-page-results')
export class SsPageResults extends PageElement {
  @state() error = '';

  @query('ss-confirm-dialog') confirmDialog!: SsConfirmDialog;

  #onReopen = async (): Promise<void> => {
    const confirmed = await this.confirmDialog.ask({
      heading: 'Reopen this game?',
      message:
        'The end-game adjustments will be removed so you can fix turns. Finish the game again when you are done.',
      confirmLabel: 'Reopen game',
    });
    const outcome = confirmed ? this.store?.reopenGame() : undefined;
    if (!outcome) {
      return;
    }
    this.error = outcome.ok ? '' : outcome.error;
    if (outcome.ok) {
      navigate(GAME);
    }
  };

  override render() {
    const { game } = this.state;
    if (!game) {
      return html`
        <div class="stack">
          <h1 tabindex="-1">Results</h1>
          <p class="lead">There's no game to show.</p>
          <a class="button primary" href=${NEW_GAME}>Start a new game</a>
        </div>
      `;
    }
    if (game.status === 'active') {
      return html`
        <div class="stack">
          <h1 tabindex="-1">Results</h1>
          <p class="lead">This game hasn't finished yet.</p>
          <div class="actions">
            <a class="button primary" href=${GAME}>Back to the scoreboard</a>
            <a class="button" href=${END}>End game</a>
          </div>
        </div>
      `;
    }
    return html`
      <div class="stack">
        <h1 tabindex="-1">Results</h1>
        <ss-results .game=${game}></ss-results>
        ${this.error ? html`<p class="alert" role="alert">${this.error}</p>` : nothing}
        <div class="actions">
          <a class="button primary" href=${NEW_GAME}>New game</a>
          <a class="button" href=${GAME}>See the scoreboard</a>
          <button type="button" class="button" @click=${this.#onReopen}>Reopen game</button>
        </div>
      </div>
      <ss-confirm-dialog></ss-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-results': SsPageResults;
  }
}
