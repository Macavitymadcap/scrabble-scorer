import { LitElement, css } from 'lit';
import { property } from 'lit/decorators.js';
import type { GameStore, StoreState } from '../../state/store.ts';
import { buttonStyles } from '../atoms/button-styles.ts';
import { StoreController } from '../controllers/store-controller.ts';
import { baseStyles } from '../styles/base.ts';

/** Layout shared by every page. */
export const pageStyles = css`
  :host {
    display: block;
  }

  h1 {
    margin: 0 0 var(--size-4);
    font-size: var(--font-size-6);
  }

  .stack {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--size-4);
  }

  /* Wide content still fills the page; buttons and links keep their size. */
  .stack > ss-scoreboard,
  .stack > ss-new-game-form {
    align-self: stretch;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-3);
  }

  .lead {
    margin: 0;
    font-size: var(--font-size-3);
  }

  .alert {
    margin: 0;
    padding: var(--size-3);
    border-inline-start: var(--border-size-3) solid var(--ss-danger);
    background: var(--ss-surface-raised);
  }
`;

/**
 * Base class for pages: holds the store, re-renders on store changes, and
 * lets the router move focus to the page's heading after navigation.
 */
export class PageElement extends LitElement {
  static override styles = [baseStyles, buttonStyles, pageStyles];

  @property({ attribute: false }) store: GameStore | undefined;

  protected readonly storeController = new StoreController(this, () => this.store);

  /** The store's state; an empty state if no store has been set. */
  protected get state(): StoreState {
    return this.storeController.state ?? { game: null, history: [], notice: null };
  }

  /** Moves focus to the page's <h1>, so screen readers announce the new page. */
  focusHeading = (): void => {
    this.renderRoot.querySelector<HTMLElement>('h1')?.focus();
  };
}
