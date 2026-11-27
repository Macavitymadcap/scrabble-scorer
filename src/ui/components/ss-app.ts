import { LitElement, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GameStore } from '../../state/store.ts';
import { StoreController } from '../controllers/store-controller.ts';
import type { PageElement } from './pages/page-element.ts';
import './pages/ss-page-game.ts';
import './pages/ss-page-home.ts';
import './pages/ss-page-new-game.ts';
import './pages/ss-page-end.ts';
import './pages/ss-page-history.ts';
import './pages/ss-page-results.ts';
import './pages/ss-page-turn.ts';
import { resolveRoute, type ResolvedRoute, type Route } from '../router.ts';
import './templates/ss-app-shell.ts';

type PageRenderer = (store: GameStore | undefined, param: string | undefined) => TemplateResult;

/** How to render each page. */
const PAGES: Readonly<Record<Route['tag'], PageRenderer>> = {
  'ss-page-home': (store) => html`<ss-page-home .store=${store}></ss-page-home>`,
  'ss-page-new-game': (store) => html`<ss-page-new-game .store=${store}></ss-page-new-game>`,
  'ss-page-game': (store) => html`<ss-page-game .store=${store}></ss-page-game>`,
  'ss-page-end': (store) => html`<ss-page-end .store=${store}></ss-page-end>`,
  'ss-page-results': (store) => html`<ss-page-results .store=${store}></ss-page-results>`,
  'ss-page-history': (store, gameId) =>
    html`<ss-page-history .store=${store} .gameId=${gameId}></ss-page-history>`,
  'ss-page-turn': (store, turnId) =>
    html`<ss-page-turn .store=${store} .turnId=${turnId}></ss-page-turn>`,
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

  @state() route: ResolvedRoute = resolveRoute(window.location.hash);

  readonly #storeController = new StoreController(this, () => this.store);

  /** Light DOM, so the page sits in the shell's slot without an extra shadow root. */
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('hashchange', this.#onHashChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.#onHashChange);
  }

  #onHashChange = (): void => {
    this.route = resolveRoute(window.location.hash);
  };

  #onDismissNotice = (): void => {
    this.store?.dismissNotice();
  };

  protected override willUpdate(): void {
    document.title = this.route.title;
  }

  protected override async updated(changed: PropertyValues<this>): Promise<void> {
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
        @dismiss-notice=${this.#onDismissNotice}
      >
        ${PAGES[this.route.tag](this.store, this.route.param)}
      </ss-app-shell>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-app': SsApp;
  }
}
