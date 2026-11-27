import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { currentRound, nextPlayer } from '../../../domain/game.ts';
import type { Game } from '../../../domain/types.ts';
import type { InstallOutcome, InstallPrompt } from '../../install-prompt.ts';
import { GAME, HELP, HISTORY, NEW_GAME, RESULTS } from '../../router.ts';
import { PageElement } from './page-element.ts';

/** Text and link for the current game, by status. */
const CURRENT_GAME: Readonly<
  Record<Game['status'], (game: Game) => { text: string; link: string; href: string }>
> = {
  active: (game) => ({
    text: `Round ${currentRound(game)}: ${nextPlayer(game).name} to play.`,
    link: 'Resume game',
    href: GAME,
  }),
  finished: () => ({
    text: 'Your last game has finished.',
    link: 'See the results',
    href: RESULTS,
  }),
};

/** What to tell the player after they choose Install app. */
const INSTALL_MESSAGES: Readonly<Record<InstallOutcome, string>> = {
  installed: 'The app has been installed.',
  dismissed: 'Installation was cancelled.',
  failed: "The app couldn't be installed. Try your browser's menu instead.",
};

const gamesSaved = (count: number): string =>
  `${count} finished ${count === 1 ? 'game' : 'games'} saved.`;

/** Home: resume the current game or start a new one. */
@customElement('ss-page-home')
export class SsPageHome extends PageElement {
  static override styles = [
    ...PageElement.styles,
    css`
      .install-status {
        margin: 0;
      }

      .install-status:empty {
        display: none;
      }

      .how {
        align-self: stretch;
        padding-block-start: var(--size-4);
        border-block-start: var(--border-size-1) solid var(--ss-border);
      }

      .how h2 {
        margin: 0 0 var(--size-3);
        font-size: var(--font-size-4);
      }

      .how ol {
        display: flex;
        flex-direction: column;
        gap: var(--size-2);
        margin: 0 0 var(--size-3);
        padding-inline-start: var(--size-5);
      }

      .how p {
        margin: 0;
      }

      .how a {
        color: var(--ss-accent);
      }
    `,
  ];

  /** Offers to install the app, when the browser allows it. */
  @property({ attribute: false }) installer: InstallPrompt | undefined;

  @state() installStatus = '';

  #installing = false;
  #unsubscribeInstaller: (() => void) | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#unsubscribeInstaller = this.installer?.subscribe(() => this.requestUpdate());
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribeInstaller?.();
  }

  #onInstall = async (): Promise<void> => {
    if (!this.installer || this.#installing) {
      return;
    }
    this.#installing = true;
    // Called straight from the click, so the browser treats it as the player's action.
    const outcome = await this.installer.install();
    this.#installing = false;
    this.installStatus = INSTALL_MESSAGES[outcome];
  };

  #renderInstall() {
    return html`
      ${
        this.installer?.available
          ? html`<button type="button" class="button" @click=${this.#onInstall}>
              Install app
            </button>`
          : nothing
      }
      <p class="install-status" role="status">${this.installStatus}</p>
    `;
  }

  override render() {
    const { game, history } = this.state;
    const current = game ? CURRENT_GAME[game.status](game) : undefined;
    return html`
      <div class="stack">
        <h1 tabindex="-1">Scrabble Scorer</h1>
        ${
          current
            ? html`<p class="lead">${current.text}</p>
                <a class="button primary" href=${current.href}>${current.link}</a>`
            : html`<p class="lead">Keep score for a game of Scrabble on a real board.</p>`
        }
        <a class="button ${game?.status === 'active' ? '' : 'primary'}" href=${NEW_GAME}>
          New game
        </a>
        ${
          history.length > 0
            ? html`<p><a href=${HISTORY}>${gamesSaved(history.length)}</a></p>`
            : nothing
        }
        ${this.#renderInstall()}
        <section class="how" aria-labelledby="how-heading">
          <h2 id="how-heading">How it works</h2>
          <ol>
            <li><strong>Start a game</strong> with 2 to 4 players, in turn order.</li>
            <li>
              <strong>Enter each turn</strong>: type the word, tap tiles on premium squares, and add
              any cross-words. The app adds up the score.
            </li>
            <li>
              <strong>End the game</strong> with the tiles left on each rack to see the final scores
              and the winner.
            </li>
          </ol>
          <p>Your games are saved on this device. <a href=${HELP}>Read the full help</a>.</p>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-home': SsPageHome;
  }
}
