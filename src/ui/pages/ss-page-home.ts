import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { currentRound, nextPlayer } from '../../domain/game.ts';
import type { Game } from '../../domain/types.ts';
import { GAME, HISTORY, NEW_GAME, RESULTS } from '../router.ts';
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

const gamesSaved = (count: number): string =>
  `${count} finished ${count === 1 ? 'game' : 'games'} saved.`;

/** Home: resume the current game or start a new one. */
@customElement('ss-page-home')
export class SsPageHome extends PageElement {
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
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-home': SsPageHome;
  }
}
