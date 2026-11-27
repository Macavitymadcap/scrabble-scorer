import { css, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { GAME, NEW_GAME, SETTINGS } from '../../router.ts';
import { PageElement } from './page-element.ts';

/** One help topic: its summary (the toggle) and its content. */
interface HelpTopic {
  summary: string;
  content: TemplateResult;
}

/** The help topics, in the order a game goes. */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    summary: 'What does this app do?',
    content: html`
      <p>
        It keeps score for a game of Scrabble played on a real board. You type in the words each
        player makes and mark any premium squares, and the app works out the score, keeps a running
        total and handles the end of the game.
      </p>
      <p>
        It doesn't know where tiles are on your board, so it can't find cross-words or check that a
        move is allowed. You tell it what was played.
      </p>
    `,
  },
  {
    summary: 'Starting a game',
    content: html`
      <p>
        Choose <a href=${NEW_GAME}>New game</a> and enter 2 to 4 names. Use the up and down buttons
        to put them in turn order, then choose <strong>Start game</strong>. The app then tracks
        whose turn it is.
      </p>
    `,
  },
  {
    summary: 'Entering a turn',
    content: html`
      <p>
        On the <a href=${GAME}>scoreboard</a>, choose <strong>Enter turn</strong>. Type the main
        word: all of its letters, including any that were already on the board. A tile appears for
        each letter, with the word's score underneath.
      </p>
      <p>Choose <strong>Save turn</strong> when the total looks right.</p>
    `,
  },
  {
    summary: 'Marking premium squares and blanks',
    content: html`
      <p>
        Tap a tile to mark it: once for a <strong>double letter</strong> (DL), twice for a
        <strong>triple letter</strong> (TL), three times for a <strong>blank</strong>, and a fourth
        time to clear it. Only mark tiles placed this turn: premium squares under tiles already on
        the board don't count again. A blank always scores 0.
      </p>
      <p>
        For <strong>double</strong> or <strong>triple word</strong> squares, choose how many the
        word covered this turn. A word covering two double word squares scores four times.
      </p>
    `,
  },
  {
    summary: 'Cross-words and bingos',
    content: html`
      <p>
        If your tiles also made other words, choose <strong>Add cross-word</strong> for each one and
        enter it the same way. A premium square under a new tile counts in every word that uses it,
        so mark it in each word.
      </p>
      <p>
        If a player used all 7 of their tiles in one turn, tick <strong>Bingo</strong> for a
        50-point bonus. The app can't tell how many tiles were placed, so you tick it yourself.
      </p>
    `,
  },
  {
    summary: 'Passing, exchanging and challenges',
    content: html`
      <p>
        Use <strong>Pass</strong> on the scoreboard, or choose Passed, Exchanged tiles or Word
        withdrawn after a challenge when entering a turn. These score 0, but still count as the
        player's turn.
      </p>
    `,
  },
  {
    summary: 'Fixing mistakes',
    content: html`
      <p>
        Tap any score on the scoreboard to edit that turn, or use <strong>Undo last turn</strong>.
        Totals are always worked out again from the turns, so they stay right.
      </p>
      <p>
        If a finished game needs fixing, choose <strong>Reopen game</strong> on the results, fix the
        turns, then end the game again.
      </p>
    `,
  },
  {
    summary: 'Ending the game',
    content: html`
      <p>
        Choose <strong>End game</strong> on the scoreboard. Type the tiles each player has left (use
        ? for a blank), and choose who went out, if anyone.
      </p>
      <p>
        Each player loses the value of the tiles they have left. The player who went out gains the
        value of everyone else's tiles. The results then show the winner and the best turn and word.
      </p>
    `,
  },
  {
    summary: 'Where your games are saved',
    content: html`
      <p>
        Everything is saved in this browser on this device, after every change. Nothing is sent
        anywhere. Your last 20 finished games are kept in the game history, where you can also
        delete them.
      </p>
      <p>Clearing your browser's data for this site deletes your games.</p>
    `,
  },
  {
    summary: 'Using it offline and on your home screen',
    content: html`
      <p>
        Once it has loaded, the app works without a connection. To open it like an app, use
        <strong>Install app</strong> on the home page if your browser offers it, or your browser's
        own menu: for example, <strong>Add to Home Screen</strong> from the Share menu in Safari on
        an iPhone or iPad.
      </p>
      <p>
        You can keep your screen from sleeping during a game in <a href=${SETTINGS}>Settings</a>.
      </p>
    `,
  },
];

/** Help: how to use the app, as an accordion of topics. */
@customElement('ss-page-help')
export class SsPageHelp extends PageElement {
  static override styles = [
    ...PageElement.styles,
    css`
      .accordion {
        display: flex;
        flex-direction: column;
        gap: var(--size-2);
        align-self: stretch;
      }

      details {
        border: var(--border-size-1) solid var(--ss-border);
        border-radius: var(--radius-2);
      }

      summary {
        display: flex;
        align-items: center;
        gap: var(--size-2);
        min-block-size: 48px;
        padding: var(--size-2) var(--size-3);
        font-weight: var(--font-weight-6);
        cursor: pointer;
        /* Draw our own marker next to the label. */
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary::before {
        content: '+';
        inline-size: 1ch;
        font-weight: var(--font-weight-7);
      }

      details[open] > summary::before {
        content: '-';
      }

      details > :not(summary) {
        margin: 0;
        padding: 0 var(--size-3) var(--size-3) calc(var(--size-3) + 1ch + var(--size-2));
      }

      a {
        color: var(--ss-accent);
      }
    `,
  ];

  override render() {
    return html`
      <div class="stack">
        <h1 tabindex="-1">Help</h1>
        <p class="lead">How to keep score with this app. Open any topic to read more.</p>
        <section class="accordion" aria-label="Help topics">
          ${HELP_TOPICS.map(
            (topic) => html`
              <details>
                <summary>${topic.summary}</summary>
                ${topic.content}
              </details>
            `,
          )}
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-help': SsPageHelp;
  }
}
