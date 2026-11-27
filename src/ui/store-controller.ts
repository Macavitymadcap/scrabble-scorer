import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { GameStore, StoreState } from '../state/store.ts';

/**
 * Connects a Lit element to the GameStore: subscribes while the element is
 * connected and re-renders it on every change.
 *
 * The store is read through `getStore` because a page's `store` property is
 * set after the element is constructed.
 */
export class StoreController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #getStore: () => GameStore | undefined;
  #unsubscribe: (() => void) | undefined;

  constructor(host: ReactiveControllerHost, getStore: () => GameStore | undefined) {
    this.#host = host;
    this.#getStore = getStore;
    host.addController(this);
  }

  /** The store's current state, or undefined if no store has been set yet. */
  get state(): StoreState | undefined {
    return this.#getStore()?.getState();
  }

  hostConnected(): void {
    this.#unsubscribe = this.#getStore()?.subscribe(() => this.#host.requestUpdate());
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
}
