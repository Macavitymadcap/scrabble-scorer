import { html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import type { Game } from '../../domain/types.ts';
import '../molecules/ss-confirm-dialog.ts';
import type { SsConfirmDialog } from '../molecules/ss-confirm-dialog.ts';
import '../organisms/ss-new-game-form.ts';
import type { StartGameEvent } from '../organisms/ss-new-game-form.ts';
import { joinNames } from '../format.ts';
import { GAME, navigate } from '../router.ts';
import { PageElement } from './page-element.ts';

const playerList = (game: Game): string => joinNames(game.players.map((p) => p.name));

/** New game: choose players, then start. Confirms before replacing an active game. */
@customElement('ss-page-new-game')
export class SsPageNewGame extends PageElement {
  @state() error = '';

  @query('ss-confirm-dialog') confirmDialog!: SsConfirmDialog;

  /** The players from the current or most recent game, to start from. */
  get #initialNames(): string[] {
    const { game, history } = this.state;
    return (game ?? history[0])?.players.map((p) => p.name) ?? [];
  }

  #confirmReplacing = async (game: Game | null): Promise<boolean> =>
    game?.status !== 'active' ||
    this.confirmDialog.ask({
      heading: 'Start a new game?',
      message: `The game between ${playerList(game)} hasn't finished. It will be discarded.`,
      confirmLabel: 'Discard and start',
      tone: 'danger',
    });

  #onStartGame = async (event: StartGameEvent): Promise<void> => {
    const { names } = event;
    if (!this.store || !(await this.#confirmReplacing(this.state.game))) {
      return;
    }
    const outcome = this.store.startGame(names);
    this.error = outcome.ok ? '' : outcome.error;
    if (outcome.ok) {
      navigate(GAME);
    }
  };

  override render() {
    return html`
      <div class="stack">
        <h1 tabindex="-1">New game</h1>
        <ss-new-game-form
          .initialNames=${this.#initialNames}
          .error=${this.error}
          @start-game=${this.#onStartGame}
        ></ss-new-game-form>
      </div>
      <ss-confirm-dialog></ss-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-new-game': SsPageNewGame;
  }
}
