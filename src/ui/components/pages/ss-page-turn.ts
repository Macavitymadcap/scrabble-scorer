import { html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { currentRound, nextPlayer, roundOf } from '../../../domain/game.ts';
import type { Game, Turn, TurnInput } from '../../../domain/types.ts';
import type { WordList } from '../../../words/word-list.ts';
import '../organisms/ss-turn-form.ts';
import type { SaveTurnEvent } from '../organisms/ss-turn-form.ts';
import { GAME, NEW_GAME, navigate } from '../../router.ts';
import { PageElement } from './page-element.ts';

/** The turn being entered: who, which round, and the existing turn when editing. */
interface TurnContext {
  playerName: string;
  round: number;
  existing?: Turn;
}

/** A turn without the fields the store assigns, for the form to start from. */
const asInput = ({ id: _id, playerId: _playerId, at: _at, ...input }: Turn): TurnInput => input;

/** The context for recording the next turn. */
const newTurnContext = (game: Game): TurnContext => ({
  playerName: nextPlayer(game).name,
  round: currentRound(game),
});

/** The context for editing a turn, or undefined if the game has no such turn. */
const editContext = (game: Game, turnId: string): TurnContext | undefined => {
  const index = game.turns.findIndex((turn) => turn.id === turnId);
  const existing = game.turns[index];
  const player = game.players.find((p) => p.id === existing?.playerId);
  if (!existing || !player) {
    return undefined;
  }
  return { playerName: player.name, round: roundOf(index, game.players.length), existing };
};

/** Record the next player's turn (`#/turn`) or edit an earlier one (`#/turn/<id>`). */
@customElement('ss-page-turn')
export class SsPageTurn extends PageElement {
  /** The id of the turn to edit; unset to record a new turn. */
  @property({ attribute: false }) turnId: string | undefined;

  @state() error = '';

  /** The word list, for checking words as they're typed. */
  @property({ attribute: false }) wordList: WordList | undefined;

  #onSave = (event: SaveTurnEvent): void => {
    const { store, turnId } = this;
    if (!store) {
      return;
    }
    const outcome =
      turnId === undefined ? store.addTurn(event.turn) : store.editTurn(turnId, event.turn);
    this.error = outcome.ok ? '' : outcome.error;
    if (outcome.ok) {
      navigate(GAME);
    }
  };

  #renderMessage(heading: string, message: string, link: string, linkText: string): TemplateResult {
    return html`
      <div class="stack">
        <h1 tabindex="-1">${heading}</h1>
        <p class="lead">${message}</p>
        <a class="button primary" href=${link}>${linkText}</a>
      </div>
    `;
  }

  override render() {
    const { game } = this.state;
    if (!game) {
      return this.#renderMessage(
        'Turn',
        "There's no game in progress.",
        NEW_GAME,
        'Start a new game',
      );
    }
    if (game.status === 'finished') {
      return this.#renderMessage('Turn', 'This game has finished.', GAME, 'Back to the scoreboard');
    }
    const context =
      this.turnId === undefined ? newTurnContext(game) : editContext(game, this.turnId);
    if (!context) {
      return this.#renderMessage(
        'Turn not found',
        "That turn isn't in this game. It may have been undone.",
        GAME,
        'Back to the scoreboard',
      );
    }
    const { playerName, round, existing } = context;
    const heading = existing ? `Edit ${playerName}'s turn` : `${playerName}'s turn`;
    return html`
      <div class="stack">
        <h1 tabindex="-1">${heading}</h1>
        <p class="lead">Round ${round}</p>
        ${keyed(
          this.turnId ?? 'new',
          html`<ss-turn-form
            .turn=${existing ? asInput(existing) : undefined}
            .error=${this.error}
            .wordList=${this.wordList}
            .checkWords=${this.state.settings.checkWords}
            @save-turn=${this.#onSave}
          >
            <a slot="actions" class="button" href=${GAME}>Cancel</a>
          </ss-turn-form>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-turn': SsPageTurn;
  }
}
