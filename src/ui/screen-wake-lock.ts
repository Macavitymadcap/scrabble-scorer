/** The parts of a wake lock sentinel this app uses. */
export interface WakeLockHandle {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

/** The parts of `navigator.wakeLock` this app uses. */
export interface WakeLockApi {
  request(type: 'screen'): Promise<WakeLockHandle>;
}

/** The parts of `document` this app uses: visibility and its change event. */
export type VisibilitySource = Pick<
  Document,
  'visibilityState' | 'addEventListener' | 'removeEventListener'
>;

export interface ScreenWakeLockOptions {
  /** Defaults to `navigator.wakeLock`; undefined where unsupported. */
  api?: WakeLockApi | undefined;
  /** Defaults to `document`. */
  visibility?: VisibilitySource;
}

/**
 * Keeps the screen on while wanted, using the Screen Wake Lock API.
 *
 * The browser releases the lock whenever the page is hidden, so it's
 * requested again when the page becomes visible. Where the API is missing or
 * the request is refused (e.g. low battery), nothing happens.
 */
export class ScreenWakeLock {
  readonly #api: WakeLockApi | undefined;
  readonly #visibility: VisibilitySource;
  #wanted = false;
  #handle: WakeLockHandle | undefined;
  #requesting = false;

  constructor(options: ScreenWakeLockOptions = {}) {
    // An explicit `api: undefined` means "unsupported", so check for the key
    // rather than using a default parameter (which would also replace undefined).
    this.#api = 'api' in options ? options.api : globalThis.navigator?.wakeLock;
    this.#visibility = options.visibility ?? globalThis.document;
  }

  /** Whether the browser supports keeping the screen on. */
  get supported(): boolean {
    return this.#api !== undefined;
  }

  /** Whether the screen is being kept on right now. */
  get held(): boolean {
    return this.#handle !== undefined;
  }

  /** Starts following page visibility. */
  connect = (): void => {
    this.#visibility.addEventListener('visibilitychange', this.#onVisibilityChange);
  };

  /** Stops following page visibility and lets the screen sleep. */
  disconnect = (): void => {
    this.#visibility.removeEventListener('visibilitychange', this.#onVisibilityChange);
    void this.want(false);
  };

  /** Keeps the screen on (true) or lets it sleep (false). */
  want = (wanted: boolean): Promise<void> => {
    this.#wanted = wanted;
    return this.#sync();
  };

  #onVisibilityChange = (): void => {
    void this.#sync();
  };

  async #sync(): Promise<void> {
    const shouldHold = this.#wanted && this.#visibility.visibilityState === 'visible';
    if (shouldHold && !this.#handle && !this.#requesting && this.#api) {
      await this.#request(this.#api);
    } else if (!shouldHold && this.#handle) {
      const handle = this.#handle;
      this.#handle = undefined;
      await handle.release().catch(() => undefined);
    }
  }

  async #request(api: WakeLockApi): Promise<void> {
    this.#requesting = true;
    try {
      const handle = await api.request('screen');
      handle.addEventListener('release', () => {
        if (this.#handle === handle) {
          this.#handle = undefined;
        }
      });
      this.#handle = handle;
      // Wanted state may have changed while waiting for the browser.
      await this.#sync();
    } catch {
      // Refused or unsupported: the screen just sleeps as normal.
    } finally {
      this.#requesting = false;
    }
  }
}
