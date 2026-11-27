import { css, html, nothing } from 'lit';
import { letterPoints } from '../../../domain/tiles.ts';
import type { TilePlay } from '../../../domain/types.ts';
import { tileMark, type TileMark } from '../../../domain/word-entry.ts';

/** The badge shown on a tile and how its mark is read out. */
export const MARK_LABELS: Readonly<Record<TileMark, { badge: string; spoken: string }>> = {
  none: { badge: '', spoken: 'no premium' },
  DL: { badge: 'DL', spoken: 'double letter' },
  TL: { badge: 'TL', spoken: 'triple letter' },
  blank: { badge: 'Blank', spoken: 'blank' },
};

/**
 * Tile atom: a native button showing a letter, its points and its mark.
 * The mark is shown as text as well as colour, matching the board: DL light
 * blue, TL dark blue, blank with a dashed outline.
 */
export const tileStyles = css`
  .tile {
    position: relative;
    display: inline-grid;
    place-items: center;
    inline-size: 48px;
    block-size: 56px;
    padding: 0;
    border: var(--border-size-2) solid var(--ss-border);
    border-radius: var(--radius-2);
    /* Tiles look like the physical ones, cream with dark letters, in light and dark mode. */
    background: var(--yellow-1);
    color: var(--gray-10);
    cursor: pointer;
  }

  .tile .letter {
    font-size: var(--font-size-4);
    font-weight: var(--font-weight-7);
    line-height: 1;
  }

  .tile .points {
    position: absolute;
    inset-block-end: 2px;
    inset-inline-end: 4px;
    font-size: var(--font-size-0);
    line-height: 1;
  }

  .tile .badge {
    position: absolute;
    inset-block-start: 2px;
    inset-inline-start: 4px;
    font-size: var(--font-size-0);
    line-height: 1;
    font-weight: var(--font-weight-7);
  }

  .tile.DL {
    border-color: var(--ss-premium-dl);
    background: var(--ss-premium-dl);
    color: var(--gray-10);
  }

  .tile.TL {
    border-color: var(--ss-premium-tl);
    background: var(--ss-premium-tl);
    color: #fff;
  }

  .tile.blank {
    border-style: dashed;
    background: transparent;
    color: var(--ss-text-muted);
  }
`;

/** The tile's points as shown on it: face value, or 0 for a blank. */
const shownPoints = (tile: TilePlay): number => (tile.blank ? 0 : letterPoints(tile.letter));

export interface TileOptions {
  tile: TilePlay;
  onActivate: () => void;
}

/**
 * A tile button, named e.g. "Q, 10 points, triple letter". The name starts
 * with the visible letter and points, so voice control users can say them.
 */
export const renderTile = ({ tile, onActivate }: TileOptions) => {
  const mark = tileMark(tile);
  const { badge, spoken } = MARK_LABELS[mark];
  const points = shownPoints(tile);
  return html`
    <button
      type="button"
      class="tile ${mark}"
      aria-label="${tile.letter}, ${points} points, ${spoken}"
      @click=${onActivate}
    >
      <span class="letter">${tile.letter}</span>
      <span class="points">${points}</span>
      ${badge ? html`<span class="badge">${badge}</span>` : nothing}
    </button>
  `;
};
