/** The parts of `beforeinstallprompt` (Chromium) this app uses. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** What happened when the player chose Install. */
export type InstallOutcome = 'installed' | 'dismissed' | 'failed';

/** `navigator.install()` (Web Install API), where the browser has it. */
type NativeInstall = () => Promise<void>;

export interface InstallPromptOptions {
  /** Where `beforeinstallprompt` and `appinstalled` fire. Defaults to `window`. */
  events?: EventTarget;
  /** Defaults to `navigator.install`, if the browser has it. */
  nativeInstall?: NativeInstall | undefined;
}

const browserInstall = (): NativeInstall | undefined => {
  const nav = globalThis.navigator as (Navigator & { install?: () => Promise<void> }) | undefined;
  return typeof nav?.install === 'function'
    ? () => nav.install?.() ?? Promise.resolve()
    : undefined;
};

/**
 * Offers to install the app when the browser allows it: through the Web
 * Install API where available, otherwise through a captured
 * `beforeinstallprompt` event. Nothing is offered in other browsers; they
 * have their own install menus.
 *
 * Create it at start-up: `beforeinstallprompt` can fire before any page shows.
 */
export class InstallPrompt {
  readonly #nativeInstall: NativeInstall | undefined;
  readonly #listeners = new Set<() => void>();
  #deferred: BeforeInstallPromptEvent | undefined;

  constructor(options: InstallPromptOptions = {}) {
    const { events = globalThis.window } = options;
    // An explicit `nativeInstall: undefined` means "none", so check for the key
    // rather than using a default parameter (which would also replace undefined).
    this.#nativeInstall = 'nativeInstall' in options ? options.nativeInstall : browserInstall();
    events.addEventListener('beforeinstallprompt', this.#onBeforeInstallPrompt);
    events.addEventListener('appinstalled', this.#onInstalled);
  }

  /** Whether an Install app button can work right now. */
  get available(): boolean {
    return this.#nativeInstall !== undefined || this.#deferred !== undefined;
  }

  /** Calls `listener` when `available` may have changed. Returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /**
   * Starts installing. Call it straight from the click handler: browsers
   * only allow it as a direct result of the player's action.
   */
  install = async (): Promise<InstallOutcome> => {
    if (this.#nativeInstall) {
      return this.#nativeInstall().then(
        (): InstallOutcome => 'installed',
        (error: unknown): InstallOutcome =>
          error instanceof DOMException && error.name === 'AbortError' ? 'dismissed' : 'failed',
      );
    }
    const deferred = this.#deferred;
    if (!deferred) {
      return 'failed';
    }
    // The event can only be used once.
    this.#deferred = undefined;
    this.#notify();
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      return outcome === 'accepted' ? 'installed' : 'dismissed';
    } catch {
      return 'failed';
    }
  };

  #onBeforeInstallPrompt = (event: Event): void => {
    // Stop the browser's own banner; the app shows its own button instead.
    event.preventDefault();
    this.#deferred = event as BeforeInstallPromptEvent;
    this.#notify();
  };

  #onInstalled = (): void => {
    this.#deferred = undefined;
    this.#notify();
  };

  #notify(): void {
    this.#listeners.forEach((listener) => listener());
  }
}
