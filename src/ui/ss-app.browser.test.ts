import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { KEYS, createMemoryStorage } from '../state/storage.ts';
import { GameStore } from '../state/store.ts';
import { APP_NAME, GAME, NEW_GAME, historyPath, turnPath } from './router.ts';
import './ss-app.ts';
import type { SsApp } from './ss-app.ts';
import { InstallPrompt } from './install-prompt.ts';
import { ScreenWakeLock } from './screen-wake-lock.ts';
import { create, mount, storeWithGame, testStore, testWordList } from './testing.ts';

/** Resolves after the next hashchange event (the app's own listener runs first). */
const nextHashChange = () =>
  new Promise((resolve) => window.addEventListener('hashchange', resolve, { once: true }));

/** Changes the hash and waits for the app to render the new page. */
const goTo = async (app: SsApp, hash: string) => {
  const changed = nextHashChange();
  window.location.hash = hash;
  await changed;
  await app.updateComplete;
};

const currentPage = (app: SsApp) => app.querySelector(app.route.tag);

describe('ss-app', () => {
  it('shows the home page by default', async () => {
    // Arrange
    const app = create('ss-app', { store: testStore() });

    // Act
    await mount(app);

    // Assert
    expect(currentPage(app)?.tagName).toBe('SS-PAGE-HOME');
  });

  it('shows the page for the hash it starts with', async () => {
    // Arrange
    window.location.hash = NEW_GAME;
    const app = create('ss-app', { store: testStore() });

    // Act
    await mount(app);

    // Assert
    expect(currentPage(app)?.tagName).toBe('SS-PAGE-NEW-GAME');
  });

  it('sets the document title for the page', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, NEW_GAME);

    // Assert
    expect(document.title).toBe(`New game - ${APP_NAME}`);
  });

  it('follows hash changes', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, GAME);

    // Assert
    await expect.poll(() => currentPage(app)?.tagName).toBe('SS-PAGE-GAME');
  });

  it('passes the turn id from the hash to the turn page', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, turnPath('t7'));

    // Assert
    expect((currentPage(app) as { turnId?: string } | null)?.turnId).toBe('t7');
  });

  it('passes the game id from the hash to the history page', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, historyPath('g9'));

    // Assert
    expect((currentPage(app) as { gameId?: string } | null)?.gameId).toBe('g9');
  });

  it.each([
    ['#/end', 'SS-PAGE-END'],
    ['#/results', 'SS-PAGE-RESULTS'],
  ])('shows the page for %s', async (hash, tagName) => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, hash);

    // Assert
    expect(currentPage(app)?.tagName).toBe(tagName);
  });

  it.each([
    ['#/help', 'SS-PAGE-HELP'],
    ['#/settings', 'SS-PAGE-SETTINGS'],
    ['#/lookup', 'SS-PAGE-LOOKUP'],
  ])('shows the page for %s', async (hash, tagName) => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, hash);

    // Assert
    expect(currentPage(app)?.tagName).toBe(tagName);
  });

  it('tells the shell which page is showing', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, '#/help');

    // Assert
    expect(app.querySelector('ss-app-shell')?.page).toBe('ss-page-help');
  });

  describe('new version', () => {
    it('tells the shell when a new version is waiting', async () => {
      // Arrange
      const app = create('ss-app', { store: testStore(), updateAvailable: true });

      // Act
      await mount(app);

      // Assert
      expect(app.querySelector('ss-app-shell')?.updateAvailable).toBe(true);
    });

    it('reloads into the new version when the player chooses Reload', async () => {
      // Arrange
      const onReload = vi.fn();
      await mount(create('ss-app', { store: testStore(), updateAvailable: true, onReload }));

      // Act
      await userEvent.click(page.getByRole('button', { name: 'Reload' }));

      // Assert
      expect(onReload).toHaveBeenCalledOnce();
    });

    it('does nothing on Reload when no reload has been set up', async () => {
      // Arrange
      await mount(create('ss-app', { store: testStore(), updateAvailable: true }));

      // Act
      const act = () => userEvent.click(page.getByRole('button', { name: 'Reload' }));

      // Assert
      await expect(act()).resolves.toBeUndefined();
    });
  });

  describe('keeping saved games', () => {
    it('asks the browser to keep saved data once there is a game', async () => {
      // Arrange
      const requestPersistence = vi.fn(async () => true);

      // Act
      await mount(create('ss-app', { store: storeWithGame(), requestPersistence }));

      // Assert
      expect(requestPersistence).toHaveBeenCalledOnce();
    });

    it('does not ask before there is a game', async () => {
      // Arrange
      const requestPersistence = vi.fn(async () => true);

      // Act
      await mount(create('ss-app', { store: testStore(), requestPersistence }));

      // Assert
      expect(requestPersistence).not.toHaveBeenCalled();
    });

    it('asks only once', async () => {
      // Arrange
      const requestPersistence = vi.fn(async () => true);
      const store = testStore();
      const app = await mount(create('ss-app', { store, requestPersistence }));
      store.startGame(['Ann', 'Bob']);
      await app.updateComplete;

      // Act
      store.addTurn({ kind: 'pass' });
      await app.updateComplete;

      // Assert
      expect(requestPersistence).toHaveBeenCalledOnce();
    });

    it('carries on if the browser refuses', async () => {
      // Arrange
      const requestPersistence = vi.fn(() => Promise.reject(new Error('Not allowed')));

      // Act
      const app = await mount(create('ss-app', { store: storeWithGame(), requestPersistence }));

      // Assert
      expect(app.isConnected).toBe(true);
    });
  });

  it.each(['#/lookup', '#/turn', '#/settings'])(
    'passes the shared word list to %s',
    async (hash) => {
      // Arrange
      const wordList = testWordList();
      const app = await mount(create('ss-app', { store: storeWithGame(), wordList }));

      // Act
      await goTo(app, hash);

      // Assert
      expect((currentPage(app) as { wordList?: unknown } | null)?.wordList).toBe(wordList);
    },
  );

  it('passes the installer to the home page', async () => {
    // Arrange
    const installer = new InstallPrompt({ events: new EventTarget(), nativeInstall: undefined });
    const app = create('ss-app', { store: testStore(), installer });

    // Act
    await mount(app);

    // Assert
    expect((currentPage(app) as { installer?: InstallPrompt } | null)?.installer).toBe(installer);
  });

  describe('keeping the screen on', () => {
    /** A wake lock with no browser API behind it, spied on. */
    const spiedWakeLock = () => {
      const wakeLock = new ScreenWakeLock({ api: undefined });
      const want = vi.spyOn(wakeLock, 'want');
      return { wakeLock, want };
    };

    it('keeps the screen on during an active game', async () => {
      // Arrange
      const { wakeLock, want } = spiedWakeLock();

      // Act
      await mount(create('ss-app', { store: storeWithGame(), wakeLock }));

      // Assert
      expect(want).toHaveBeenLastCalledWith(true);
    });

    it('lets the screen sleep with no game', async () => {
      // Arrange
      const { wakeLock, want } = spiedWakeLock();

      // Act
      await mount(create('ss-app', { store: testStore(), wakeLock }));

      // Assert
      expect(want).toHaveBeenLastCalledWith(false);
    });

    it('lets the screen sleep once the game has finished', async () => {
      // Arrange
      const { wakeLock, want } = spiedWakeLock();
      const store = storeWithGame();
      const app = await mount(create('ss-app', { store, wakeLock }));

      // Act
      store.finishGame({ wentOutPlayerId: null, remaining: {} });
      await app.updateComplete;

      // Assert
      expect(want).toHaveBeenLastCalledWith(false);
    });

    it('lets the screen sleep when the setting is turned off', async () => {
      // Arrange
      const { wakeLock, want } = spiedWakeLock();
      const store = storeWithGame();
      const app = await mount(create('ss-app', { store, wakeLock }));

      // Act
      store.updateSettings({ keepScreenOn: false });
      await app.updateComplete;

      // Assert
      expect(want).toHaveBeenLastCalledWith(false);
    });

    it('releases the screen when the app is removed', async () => {
      // Arrange
      const { wakeLock, want } = spiedWakeLock();
      const app = await mount(create('ss-app', { store: storeWithGame(), wakeLock }));

      // Act
      app.remove();

      // Assert
      expect(want).toHaveBeenLastCalledWith(false);
    });
  });

  it('shows the home page for an unknown hash', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, '#/nowhere');

    // Assert
    expect(currentPage(app)?.tagName).toBe('SS-PAGE-HOME');
  });

  it("moves focus to the new page's heading after navigating", async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));

    // Act
    await goTo(app, NEW_GAME);

    // Assert
    await expect.poll(() => currentPage(app)?.shadowRoot?.activeElement?.tagName).toBe('H1');
  });

  it('does not move focus on first load', async () => {
    // Arrange
    const app = create('ss-app', { store: testStore() });

    // Act
    await mount(app);

    // Assert
    expect(currentPage(app)?.shadowRoot?.activeElement).toBeNull();
  });

  it('passes the store to the page', async () => {
    // Arrange
    const store = testStore();
    const app = create('ss-app', { store });

    // Act
    await mount(app);

    // Assert
    expect((currentPage(app) as { store?: GameStore } | null)?.store).toBe(store);
  });

  it("shows the store's notice", async () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.current, 'not json');
    await mount(create('ss-app', { store: new GameStore({ storage }) }));

    // Act
    const dismiss = page.getByRole('button', { name: 'Dismiss' });

    // Assert
    await expect.element(dismiss).toBeVisible();
  });

  it('clears the notice when dismissed', async () => {
    // Arrange
    const storage = createMemoryStorage();
    storage.setItem(KEYS.current, 'not json');
    const store = new GameStore({ storage });
    await mount(create('ss-app', { store }));

    // Act
    await userEvent.click(page.getByRole('button', { name: 'Dismiss' }));

    // Assert
    expect(store.getState().notice).toBeNull();
  });

  it('warns when games cannot be saved', async () => {
    // Arrange
    const app = create('ss-app', { store: testStore(), persistent: false });

    // Act
    await mount(app);

    // Assert
    expect(app.querySelector('ss-app-shell')?.persistent).toBe(false);
  });

  it('stops following the hash once removed from the page', async () => {
    // Arrange
    const app = await mount(create('ss-app', { store: testStore() }));
    app.remove();

    // Act
    const changed = nextHashChange();
    window.location.hash = GAME;
    await changed;

    // Assert
    expect(app.route.tag).toBe('ss-page-home');
  });
});
