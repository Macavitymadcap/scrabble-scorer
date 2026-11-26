import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { nextPlayer, playerTotals, scoreboardRounds, type ScoredTurn } from '../../domain/game.ts';
import { byTurnKind, type Game, type TurnStrategies } from '../../domain/types.ts';
import { visuallyHiddenStyles } from '../atoms/visually-hidden.ts';
import { baseStyles } from '../styles/base.ts';

/** What a scoreboard cell shows for each kind of turn. */
const cellText = ({ turn, score }: ScoredTurn): string => {
  const labels: TurnStrategies<string> = {
    play: () => String(score.total),
    pass: () => 'Pass',
    exchange: () => 'Exchange',
    withdrawn: () => 'Withdrawn',
  };
  return byTurnKind(labels, turn);
};

/**
 * The score table: one column per player, one row per round, totals in the
 * footer. Column and row headers stay visible while the table scrolls.
 */
@customElement('ss-scoreboard')
export class SsScoreboard extends LitElement {
  static override styles = [
    baseStyles,
    visuallyHiddenStyles,
    css`
      :host {
        display: block;
      }

      .table-wrapper {
        overflow: auto;
        max-inline-size: 100%;
        max-block-size: min(70vh, 40rem);
        border: var(--border-size-1) solid var(--ss-border);
        border-radius: var(--radius-2);
      }

      table {
        inline-size: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-variant-numeric: tabular-nums;
      }

      caption {
        padding: var(--size-2) var(--size-3);
        text-align: start;
        font-weight: var(--font-weight-6);
      }

      th,
      td {
        padding: var(--size-2) var(--size-3);
        border-block-end: var(--border-size-1) solid var(--ss-border);
        text-align: end;
        white-space: nowrap;
      }

      thead th,
      tfoot th,
      tfoot td {
        position: sticky;
        background: var(--ss-surface-raised);
      }

      thead th {
        inset-block-start: 0;
        z-index: 1;
      }

      tfoot th,
      tfoot td {
        inset-block-end: 0;
        font-weight: var(--font-weight-7);
      }

      /* The round / total column reads as labels, so align it to the start. */
      th:first-child {
        text-align: start;
      }

      th[scope='row'] {
        position: sticky;
        inset-inline-start: 0;
        background: var(--ss-surface-raised);
        text-align: start;
      }

      .next {
        color: var(--ss-accent);
        text-decoration: underline;
        text-decoration-thickness: var(--border-size-2);
      }

      .muted {
        color: var(--ss-text-muted);
      }
    `,
  ];

  @property({ attribute: false }) game: Game | undefined;

  override render() {
    const { game } = this;
    if (!game) {
      return nothing;
    }
    const next = game.status === 'active' ? nextPlayer(game) : undefined;
    const rounds = scoreboardRounds(game);
    const totals = playerTotals(game);

    return html`
      <div class="table-wrapper" tabindex="0" role="region" aria-labelledby="caption">
        <table>
          <caption id="caption">
            Scores
          </caption>
          <thead>
            <tr>
              <th scope="col">Round</th>
              ${game.players.map(
                (player) => html`
                  <th scope="col" class=${player.id === next?.id ? 'next' : ''}>
                    ${player.name}${player.id === next?.id ? html` <span>(next)</span>` : nothing}
                  </th>
                `,
              )}
            </tr>
          </thead>
          <tbody>
            ${rounds.map(
              (round) => html`
                <tr>
                  <th scope="row">${round.round}</th>
                  ${game.players.map((player) => {
                    const turn = round.turns[player.id];
                    return turn
                      ? html`<td>${cellText(turn)}</td>`
                      : html`<td class="muted">
                          <span aria-hidden="true">-</span
                          ><span class="visually-hidden">Not played yet</span>
                        </td>`;
                  })}
                </tr>
              `,
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              ${totals.map((total) => html`<td>${total.total}</td>`)}
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-scoreboard': SsScoreboard;
  }
}
