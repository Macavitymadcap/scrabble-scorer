import { LitElement, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GameStore } from '../state/store.ts';
import { StoreController } from './store-controller.ts';
import type { PageElement } from './components/pages/page-element.ts';
import './components/pages/ss-page-game.ts';
import './components/pages/ss-page-home.ts';
import './components/pages/ss-page-new-game.ts';
import './components/pages/ss-page-end.ts';
import './components/pages/ss-page-help.ts';
import './components/pages/ss-page-settings.ts';
import './components/pages/ss-page-history.ts';
import './components/pages/ss-page-results.ts';
import './components/pages/ss-page-turn.ts';
import type { InstallPrompt } from './install-prompt.ts';
import { resolveRoute, type ResolvedRoute, type Route } from './router.ts';
import { ScreenWakeLock } from './screen-wake-lock.ts';
import './components/templates/ss-app-shell.ts';

/** What a page may need from the app. */
interface PageContext {
  store: GameStore | undefined;
  /** The part of the hash after the page's base, e.g. a turn id. */
  param: string | undefined;
  installer: InstallPrompt | undefined;
}

type PageRenderer = (context: PageContext) => TemplateResult;

/** How to render each page. */
const PAGES: Readonly<Record<Route['tag'], PageRenderer>> = {
  'ss-page-home': ({ store, installer }) =>
    html`<ss-page-home .store=${store} .installer=${installer}></ss-page-home>`,
  'ss-page-new-game': ({ store }) => html`<ss-page-new-game .store=${store}></ss-page-new-game>`,
  'ss-page-game': ({ store }) => html`<ss-page-game .store=${store}></ss-page-game>`,
  'ss-page-end': ({ store }) => html`<ss-page-end .store=${store}></ss-page-end>`,
  'ss-page-results': ({ store }) => html`<ss-page-results .store=${store}></ss-page-results>`,
  'ss-page-history': ({ store, param }) =>
    html`<ss-page-history .store=${store} .gameId=${param}></ss-page-history>`,
  'ss-page-help': ({ store }) => html`<ss-page-help .store=${store}></ss-page-help>`,
  'ss-page-settings': ({ store }) => html`<ss-page-settings .store=${store}></ss-page-settings>`,
  'ss-page-turn': ({ store, param }) =>
    html`<ss-page-turn .store=${store} .turnId=${param}></ss-page-turn>`,
};

/**
 * The root element: follows the URL hash, renders the matching page inside
 * the app shell, and keeps the document title and focus in step.
 */
@customElement('ss-app')
export class SsApp extends LitElement {
  @property({ attribute: false }) store: GameStore | undefined;

  /** False when games can't be saved in this browser. */
  @property({ type: Boolean }) persistent = true;

  /** Offers to install the app, when the browser allows it. */
  @property({ attribute: false }) installer: InstallPrompt | undefined;

  /** True when a new version has been downloaded and is waiting. */
  @property({ type: Boolean }) updateAvailable = false;

  /** Switches to the waiting new version (reloads the page). */
  @property({ attribute: false }) onReload: (() => void) | undefined;

  /** Asks the browser not to clear saved games under storage pressure. */
  @property({ attribute: false }) requestPersistence: () => Promise<boolean> = () =>
    globalThis.navigator?.storage?.persist?.() ?? Promise.resolve(false);

  #persistenceRequested = false;

  /** Keeps the screen on during games; replaceable in tests. */
  @property({ attribute: false }) wakeLock = new ScreenWakeLock();

  @state() route: ResolvedRoute = resolveRoute(window.location.hash);

  readonly #storeController = new StoreController(this, () => this.store);

  /** Light DOM, so the page sits in the shell's slot without an extra shadow root. */
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('hashchange', this.#onHashChange);
    this.wakeLock.connect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.#onHashChange);
    this.wakeLock.disconnect();
  }

  #onHashChange = (): void => {
    this.route = resolveRoute(window.location.hash);
  };

  #onDismissNotice = (): void => {
    this.store?.dismissNotice();
  };

  #onReloadApp = (): void => {
    this.onReload?.();
  };

  protected override willUpdate(): void {
    document.title = this.route.title;
  }

  protected override async updated(changed: PropertyValues<this>): Promise<void> {
    // Keep the screen on while a game is in progress, if the player wants that.
    const state = this.#storeController.state;
    void this.wakeLock.want(state?.game?.status === 'active' && state.settings.keepScreenOn);

    // Once there's a game worth keeping, ask the browser not to clear saved data.
    if (state?.game && !this.#persistenceRequested) {
      this.#persistenceRequested = true;
      void this.requestPersistence().catch(() => false);
    }

    // After navigating (not on first load), move focus to the new page's heading.
    if (changed.has('route') && changed.get('route') !== undefined) {
      const page = this.querySelector<PageElement>(this.route.tag);
      await page?.updateComplete;
      page?.focusHeading();
    }
  }

  override render() {
    return html`
      <ss-app-shell
        .notice=${this.#storeController.state?.notice ?? null}
        .persistent=${this.persistent}
        .page=${this.route.tag}
        .updateAvailable=${this.updateAvailable}
        @dismiss-notice=${this.#onDismissNotice}
        @reload-app=${this.#onReloadApp}
      >
        ${PAGES[this.route.tag]({
          store: this.store,
          param: this.route.param,
          installer: this.installer,
        })}
      </ss-app-shell>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-app': SsApp;
  }
}
