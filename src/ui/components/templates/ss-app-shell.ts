import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { buttonStyles } from '../atoms/button-styles.ts';
import { APP_NAME, HOME } from '../../router.ts';
import { baseStyles } from '../../styles/base.ts';

/** Fired when the player dismisses the notice. */
export class DismissNoticeEvent extends Event {
  static readonly type = 'dismiss-notice';

  constructor() {
    super(DismissNoticeEvent.type, { bubbles: true, composed: true });
  }
}

export const NOT_PERSISTENT_WARNING =
  "This browser isn't letting the app save, so games will be lost when you close or reload the page.";

/** Page layout: a header with the app name, any notices, then the page. */
@customElement('ss-app-shell')
export class SsAppShell extends LitElement {
  static override styles = [
    baseStyles,
    buttonStyles,
    css`
      :host {
        display: block;
        min-block-size: 100dvh;
      }

      header {
        padding: var(--size-3) var(--size-4);
        border-block-end: var(--border-size-1) solid var(--ss-border);
      }

      .app-name {
        color: inherit;
        font-weight: var(--font-weight-7);
        text-decoration: none;
      }

      main {
        max-inline-size: 48rem;
        margin-inline: auto;
        padding: var(--size-4);
      }

      .notice {
        display: flex;
        align-items: center;
        gap: var(--size-3);
        margin: 0 0 var(--size-4);
        padding: var(--size-3);
        border-radius: var(--radius-2);
        background: var(--ss-notice);
      }

      .notice p {
        flex: 1;
        margin: 0;
      }
    `,
  ];

  /** A message about loading or saving, shown until dismissed. */
  @property() notice: string | null = null;

  /** False when games can't be saved in this browser. */
  @property({ type: Boolean }) persistent = true;

  #onDismiss = (): void => {
    this.dispatchEvent(new DismissNoticeEvent());
  };

  override render() {
    return html`
      <header>
        <a class="app-name" href=${HOME}>${APP_NAME}</a>
      </header>
      <main>
        <div role="status">
          ${
            this.persistent
              ? nothing
              : html`<div class="notice"><p>${NOT_PERSISTENT_WARNING}</p></div>`
          }
          ${
            this.notice
              ? html`<div class="notice">
                  <p>${this.notice}</p>
                  <button type="button" class="button" @click=${this.#onDismiss}>Dismiss</button>
                </div>`
              : nothing
          }
        </div>
        <slot></slot>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-app-shell': SsAppShell;
  }
  interface HTMLElementEventMap {
    'dismiss-notice': DismissNoticeEvent;
  }
}
