import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { bestTurn, bestWord, roundOf, standings } from '../../../domain/game.ts';
import type { Game, Player } from '../../../domain/types.ts';
import { joinNames, signed } from '../../format.ts';
import { baseStyles } from '../../styles/base.ts';

const nameOf = (game: Game, playerId: string): string =>
  game.players.find((player: Player) => player.id === playerId)?.name ?? 'Unknown player';

/** "Ann wins with 312 points." or "Ann and Bob tie on 280 points." */
export const outcomeText = (game: Game): string => {
  const { ranking, leaders } = standings(game);
  const top = ranking[0]?.total ?? 0;
  const names = joinNames(leaders.map((player) => player.name));
  return leaders.length > 1
    ? `${names} tie on ${top} points.`
    : `${names} wins with ${top} points.`;
};

/** The best turn as text, or undefined if nobody scored. */
const bestTurnText = (game: Game): string | undefined => {
  const best = bestTurn(game);
  if (!best) {
    return undefined;
  }
  const index = game.turns.indexOf(best.turn);
  const round = roundOf(index, game.players.length);
  return `${nameOf(game, best.turn.playerId)}, round ${round}: ${best.score.total} points`;
};

/** The best word as text (blanks in lower case), or undefined if none scored. */
const bestWordText = (game: Game): string | undefined => {
  const best = bestWord(game);
  return best && `${best.word} by ${nameOf(game, best.playerId)}: ${best.score} points`;
};

/**
 * A finished game's results: the winner (or a tie), the final ranking with
 * end-game adjustments, and the best turn and word.
 */
@customElement('ss-results')
export class SsResults extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--size-5);
      }

      .outcome {
        margin: 0;
        font-size: var(--font-size-5);
        font-weight: var(--font-weight-7);
      }

      table {
        inline-size: 100%;
        border-collapse: collapse;
        font-variant-numeric: tabular-nums;
      }

      caption {
        padding-block-end: var(--size-2);
        text-align: start;
        font-weight: var(--font-weight-6);
      }

      th,
      td {
        padding: var(--size-2) var(--size-3);
        border-block-end: var(--border-size-1) solid var(--ss-border);
        text-align: end;
      }

      th[scope='row'],
      thead th:first-child {
        text-align: start;
      }

      .winner th,
      .winner td {
        font-weight: var(--font-weight-7);
      }

      dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--size-2) var(--size-4);
        margin: 0;
      }

      dt {
        font-weight: var(--font-weight-6);
      }

      dd {
        margin: 0;
      }
    `,
  ];

  @property({ attribute: false }) game: Game | undefined;

  override render() {
    const { game } = this;
    if (!game) {
      return nothing;
    }
    const { ranking, leaders } = standings(game);
    const leaderIds = new Set(leaders.map((player) => player.id));
    return html`
      <p class="outcome">${outcomeText(game)}</p>
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
          ${ranking.map(
            ({ player, turns, adjustment, total }) => html`
              <tr class=${leaderIds.has(player.id) ? 'winner' : ''}>
                <th scope="row">${player.name}</th>
                <td>${turns}</td>
                <td>${signed(adjustment)}</td>
                <td>${total}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
      <dl>
        <dt>Best turn</dt>
        <dd>${bestTurnText(game) ?? 'No scoring turns'}</dd>
        <dt>Best word</dt>
        <dd>${bestWordText(game) ?? 'No scoring words'}</dd>
      </dl>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-results': SsResults;
  }
}
