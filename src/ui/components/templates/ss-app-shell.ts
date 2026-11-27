import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { buttonStyles } from '../atoms/button-styles.ts';
import { APP_NAME, HELP, HOME, LOOKUP, SETTINGS, type Route } from '../../router.ts';
import { baseStyles } from '../../base-styles.ts';

/** Fired when the player dismisses the notice. */
export class DismissNoticeEvent extends Event {
  static readonly type = 'dismiss-notice';

  constructor() {
    super(DismissNoticeEvent.type, { bubbles: true, composed: true });
  }
}

/** Fired when the player chooses to reload into a new version. */
export class ReloadAppEvent extends Event {
  static readonly type = 'reload-app';

  constructor() {
    super(ReloadAppEvent.type, { bubbles: true, composed: true });
  }
}

export const UPDATE_MESSAGE = 'A new version of the app is ready.';

/** Links in the header, available from every page. */
const NAV_LINKS: readonly { href: string; label: string; page: Route['tag'] }[] = [
  { href: LOOKUP, label: 'Check a word', page: 'ss-page-lookup' },
  { href: HELP, label: 'Help', page: 'ss-page-help' },
  { href: SETTINGS, label: 'Settings', page: 'ss-page-settings' },
];

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
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--size-2) var(--size-4);
        padding: var(--size-3) var(--size-4);
        border-block-end: var(--border-size-1) solid var(--ss-border);
      }

      nav {
        display: flex;
        gap: var(--size-1);
      }

      nav a {
        display: inline-flex;
        align-items: center;
        min-block-size: 48px;
        padding-inline: var(--size-3);
        color: var(--ss-accent);
      }

      nav a[aria-current='page'] {
        font-weight: var(--font-weight-7);
        text-decoration-thickness: var(--border-size-2);
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

  /** True when a new version is waiting; shows a Reload button. */
  @property({ type: Boolean }) updateAvailable = false;

  /** The page being shown, so its header link can be marked as current. */
  @property() page: Route['tag'] | undefined;

  #onDismiss = (): void => {
    this.dispatchEvent(new DismissNoticeEvent());
  };

  #onReload = (): void => {
    this.dispatchEvent(new ReloadAppEvent());
  };

  override render() {
    return html`
      <header>
        <a class="app-name" href=${HOME}>${APP_NAME}</a>
        <nav aria-label="Main">
          ${NAV_LINKS.map(
            (link) =>
              html`<a href=${link.href} aria-current=${link.page === this.page ? 'page' : nothing}
                >${link.label}</a
              >`,
          )}
        </nav>
      </header>
      <main>
        <div role="status">
          ${
            this.updateAvailable
              ? html`<div class="notice">
                  <p>${UPDATE_MESSAGE}</p>
                  <button type="button" class="button primary" @click=${this.#onReload}>
                    Reload
                  </button>
                </div>`
              : nothing
          }
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
    'reload-app': ReloadAppEvent;
  }
}
