import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../organisms/ss-endgame-form.ts';
import type { FinishGameEvent } from '../organisms/ss-endgame-form.ts';
import { GAME, NEW_GAME, RESULTS, navigate } from '../router.ts';
import { PageElement } from './page-element.ts';

/** End the current game: tiles left and who went out, then on to the results. */
@customElement('ss-page-end')
export class SsPageEnd extends PageElement {
  @state() error = '';

  #onFinish = (event: FinishGameEvent): void => {
    const outcome = this.store?.finishGame(event.endGame);
    if (!outcome) {
      return;
    }
    this.error = outcome.ok ? '' : outcome.error;
    if (outcome.ok) {
      navigate(RESULTS);
    }
  };

  override render() {
    const { game } = this.state;
    if (!game) {
      return html`
        <div class="stack">
          <h1 tabindex="-1">End game</h1>
          <p class="lead">There's no game in progress.</p>
          <a class="button primary" href=${NEW_GAME}>Start a new game</a>
        </div>
      `;
    }
    if (game.status === 'finished') {
      return html`
        <div class="stack">
          <h1 tabindex="-1">End game</h1>
          <p class="lead">This game has already finished.</p>
          <a class="button primary" href=${RESULTS}>See the results</a>
        </div>
      `;
    }
    return html`
      <div class="stack">
        <h1 tabindex="-1">End game</h1>
        <p class="lead">Enter the tiles left on each rack, and who went out.</p>
        <ss-endgame-form .game=${game} .error=${this.error} @finish-game=${this.#onFinish}>
          <a slot="actions" class="button" href=${GAME}>Cancel</a>
        </ss-endgame-form>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-end': SsPageEnd;
  }
}
