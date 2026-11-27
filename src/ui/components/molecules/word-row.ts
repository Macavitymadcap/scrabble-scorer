import { css, html, nothing } from 'lit';
import { wordScore } from '../../../domain/scoring.ts';
import type { WordPlay } from '../../../domain/types.ts';
import { MAX_WORD_SQUARES } from '../../../domain/validation.ts';
import { canHaveSquares, wordLetters, type WordSquare } from '../../../domain/word-entry.ts';
import { renderTile } from '../atoms/tile.ts';

/** The legend for each kind of word square. */
export const SQUARE_LEGENDS: Readonly<Record<WordSquare, string>> = {
  doubleWords: 'Double word squares',
  tripleWords: 'Triple word squares',
};

const SQUARE_NAMES: Readonly<Record<WordSquare, string>> = {
  doubleWords: 'dw',
  tripleWords: 'tw',
};

const SQUARE_COUNTS = Array.from({ length: MAX_WORD_SQUARES + 1 }, (_, n) => n);

/** "Main word" for the first word, "Cross-word 1", ... for the rest. */
export const wordLegend = (index: number): string =>
  index === 0 ? 'Main word' : `Cross-word ${index}`;

/** Word-row molecule styles: the tiles and the segmented square choices. */
export const wordRowStyles = css`
  .word-row {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    margin: 0;
    padding: var(--size-3);
    border: var(--border-size-1) solid var(--ss-border);
    border-radius: var(--radius-2);
  }

  .word-row > legend {
    padding-inline: var(--size-1);
    font-weight: var(--font-weight-6);
  }

  .word-row input[type='text'] {
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-1);
  }

  .hint {
    margin: 0;
    color: var(--ss-text-muted);
    font-size: var(--font-size-1);
  }

  .squares {
    margin: 0;
    padding: 0;
    border: none;
  }

  .squares legend {
    margin-block-end: var(--size-1);
    font-size: var(--font-size-1);
  }

  .segments {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-1);
  }

  .segments label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 48px;
    min-block-size: 48px;
    padding-inline: var(--size-3);
    border: var(--border-size-1) solid var(--ss-border);
    border-radius: var(--radius-2);
    cursor: pointer;
  }

  .segments input:checked + label {
    border-color: var(--ss-accent);
    background: var(--ss-accent);
    color: var(--ss-accent-text);
    font-weight: var(--font-weight-6);
  }

  .segments input:focus-visible + label {
    outline: var(--border-size-2) solid var(--ss-focus);
    outline-offset: var(--size-1);
  }

  .segments input:disabled + label {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Advisory only: muted, with the result in words as well as colour. */
  .word-check {
    margin: 0;
    color: var(--ss-text-muted);
    font-size: var(--font-size-1);
  }

  .word-check.out {
    color: var(--ss-danger);
  }

  .subtotal {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
`;

/** Whether a word is in the word list, or the check is still loading. */
export type WordCheck = 'in' | 'out' | 'checking';

/** What the word row says for each check result. */
export const WORD_CHECK_LABELS: Readonly<Record<WordCheck, string>> = {
  in: 'In the word list',
  out: 'Not in the word list',
  checking: 'Checking the word list...',
};

export interface WordRowOptions {
  word: WordPlay;
  index: number;
  error?: string | undefined;
  /** The word list check to show; omit to show none. */
  check?: WordCheck | undefined;
  removable: boolean;
  onText: (text: string) => void;
  onBlur: () => void;
  onTile: (tileIndex: number) => void;
  onSquares: (square: WordSquare, count: number) => void;
  onRemove: () => void;
}

const renderSquares = ({ word, index, onSquares }: WordRowOptions, square: WordSquare) => html`
  <fieldset class="squares">
    <legend>${SQUARE_LEGENDS[square]}</legend>
    <div class="segments">
      ${SQUARE_COUNTS.map((count) => {
        const id = `${SQUARE_NAMES[square]}-${index}-${count}`;
        return html`
          <input
            type="radio"
            class="visually-hidden"
            id=${id}
            name="${SQUARE_NAMES[square]}-${index}"
            .value=${String(count)}
            .checked=${word[square] === count}
            ?disabled=${!canHaveSquares(word, square, count)}
            @change=${() => onSquares(square, count)}
          />
          <label for=${id}>${count === 0 ? 'None' : count}</label>
        `;
      })}
    </div>
  </fieldset>
`;

/**
 * A word in the turn: its letters, its tiles (tap to mark DL, TL or blank),
 * the word squares it covers, and its score.
 */
export const renderWordRow = (options: WordRowOptions) => {
  const { word, index, error, removable, onText, onBlur, onTile, onRemove, check } = options;
  const id = `word-${index}`;
  const legend = wordLegend(index);
  // The input is described by its error and its word list check, if any.
  const describedBy = [error ? `${id}-error` : '', check ? `${id}-check` : '']
    .filter(Boolean)
    .join(' ');
  return html`
    <fieldset class="word-row" data-index=${index}>
      <legend>${legend}</legend>
      <div class="field">
        <label for=${id}>Letters</label>
        <input
          id=${id}
          type="text"
          name=${id}
          data-control="word"
          .value=${wordLetters(word)}
          maxlength="15"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          spellcheck="false"
          enterkeyhint="done"
          aria-invalid=${error ? 'true' : 'false'}
          aria-describedby=${describedBy || nothing}
          @input=${(event: Event) => onText((event.target as HTMLInputElement).value)}
          @blur=${onBlur}
        />
        ${error ? html`<p class="error" id="${id}-error">${error}</p>` : nothing}
      </div>
      ${
        word.tiles.length > 0
          ? html`
              <p class="hint" id="${id}-hint">Tap a tile to mark it DL, TL or blank.</p>
              <div
                class="tiles"
                role="group"
                aria-label="${legend} tiles"
                aria-describedby="${id}-hint"
              >
                ${word.tiles.map((tile, tileIndex) =>
                  renderTile({ tile, onActivate: () => onTile(tileIndex) }),
                )}
              </div>
            `
          : nothing
      }
      ${renderSquares(options, 'doubleWords')} ${renderSquares(options, 'tripleWords')}
      <p class="subtotal">Word score: <output>${wordScore(word)}</output></p>
      ${
        check
          ? html`<p class="word-check ${check}" id="${id}-check">${WORD_CHECK_LABELS[check]}</p>`
          : nothing
      }
      ${
        removable
          ? html`<button type="button" class="button" @click=${onRemove}>
              Remove ${legend.toLowerCase()}
            </button>`
          : nothing
      }
    </fieldset>
  `;
};
