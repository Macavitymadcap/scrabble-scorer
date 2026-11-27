import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { InstallPrompt } from '../../install-prompt.ts';
import { create, mount, storeWithGame, testStore } from '../../testing.ts';
import './ss-page-home.ts';

const finishGame = (store = storeWithGame()) => {
  store.finishGame({ wentOutPlayerId: null, remaining: {} });
  return store;
};

describe('ss-page-home', () => {
  it('has the app name as its heading', async () => {
    // Arrange
    await mount(create('ss-page-home', { store: testStore() }));

    // Act
    const heading = page.getByRole('heading', { level: 1 });

    // Assert
    await expect.element(heading).toHaveTextContent('Scrabble Scorer');
  });

  describe('with no game', () => {
    it('explains what the app does', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const intro = page.getByText('Keep score for a game of Scrabble on a real board.');

      // Assert
      await expect.element(intro).toBeVisible();
    });

    it('offers a new game as the main action', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const link = page.getByRole('link', { name: 'New game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/new');
      await expect.element(link).toHaveClass('primary');
    });

    it('does not offer to resume', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const resume = page.getByRole('link', { name: 'Resume game' });

      // Assert
      await expect.element(resume).not.toBeInTheDocument();
    });
  });

  describe('with a game in progress', () => {
    it('says whose turn it is', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: storeWithGame() }));

      // Act
      const summary = page.getByText('Round 1: Ann to play.');

      // Assert
      await expect.element(summary).toBeVisible();
    });

    it('offers to resume it as the main action', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: storeWithGame() }));

      // Act
      const link = page.getByRole('link', { name: 'Resume game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/game');
      await expect.element(link).toHaveClass('primary');
    });

    it('still offers a new game, as a secondary action', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: storeWithGame() }));

      // Act
      const link = page.getByRole('link', { name: 'New game' });

      // Assert
      await expect.element(link).not.toHaveClass('primary');
    });
  });

  describe('with a finished game', () => {
    it('offers to see the results', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: finishGame() }));

      // Act
      const link = page.getByRole('link', { name: 'See the results' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/results');
    });

    it('offers a new game as a main action', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: finishGame() }));

      // Act
      const link = page.getByRole('link', { name: 'New game' });

      // Assert
      await expect.element(link).toHaveClass('primary');
    });
  });

  describe('history', () => {
    it('is not mentioned when empty', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const saved = page.getByText(/finished game/);

      // Assert
      await expect.element(saved).not.toBeInTheDocument();
    });

    it('counts one saved game', async () => {
      // Arrange
      const store = finishGame();
      store.startGame(['Cat', 'Dan']);
      await mount(create('ss-page-home', { store }));

      // Act
      const saved = page.getByText('1 finished game saved.');

      // Assert
      await expect.element(saved).toBeVisible();
    });

    it('counts several saved games', async () => {
      // Arrange
      const store = finishGame();
      store.startGame(['Cat', 'Dan']);
      finishGame(store);
      store.startGame(['Eve', 'Fay']);
      await mount(create('ss-page-home', { store }));

      // Act
      const saved = page.getByText('2 finished games saved.');

      // Assert
      await expect.element(saved).toBeVisible();
    });
  });

  it('links the saved games count to the history', async () => {
    // Arrange
    const store = finishGame();
    store.startGame(['Cat', 'Dan']);
    await mount(create('ss-page-home', { store }));

    // Act
    const link = page.getByRole('link', { name: '1 finished game saved.' });

    // Assert
    await expect.element(link).toHaveAttribute('href', '#/history');
  });

  describe('how it works', () => {
    it('has its own heading', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const heading = page.getByRole('heading', { level: 2, name: 'How it works' });

      // Assert
      await expect.element(heading).toBeVisible();
    });

    it('lists the three steps of a game', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const steps = page.getByRole('region', { name: 'How it works' }).getByRole('listitem');

      // Assert
      expect(steps.elements()).toHaveLength(3);
    });

    it('links to the full help', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: testStore() }));

      // Act
      const link = page.getByRole('link', { name: 'Read the full help' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/help');
    });
  });

  describe('install app', () => {
    /** An installer driven by a fake Web Install API. */
    const nativeInstaller = (nativeInstall: () => Promise<void>) =>
      new InstallPrompt({ events: new EventTarget(), nativeInstall });

    const installButton = () => page.getByRole('button', { name: 'Install app' });

    it('is not offered when the browser cannot install', async () => {
      // Arrange
      const installer = new InstallPrompt({ events: new EventTarget(), nativeInstall: undefined });

      // Act
      await mount(create('ss-page-home', { store: testStore(), installer }));

      // Assert
      await expect.element(installButton()).not.toBeInTheDocument();
    });

    it('is offered when the browser can install', async () => {
      // Arrange
      const installer = nativeInstaller(async () => undefined);

      // Act
      await mount(create('ss-page-home', { store: testStore(), installer }));

      // Assert
      await expect.element(installButton()).toBeVisible();
    });

    it('appears once the browser says installing is possible', async () => {
      // Arrange
      const events = new EventTarget();
      const installer = new InstallPrompt({ events, nativeInstall: undefined });
      await mount(create('ss-page-home', { store: testStore(), installer }));
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: async () => undefined,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });

      // Act
      events.dispatchEvent(event);

      // Assert
      await expect.element(installButton()).toBeVisible();
    });

    it('installs and says so', async () => {
      // Arrange
      const nativeInstall = vi.fn(async () => undefined);
      await mount(
        create('ss-page-home', { store: testStore(), installer: nativeInstaller(nativeInstall) }),
      );

      // Act
      await userEvent.click(installButton());

      // Assert
      expect(nativeInstall).toHaveBeenCalledOnce();
      await expect.element(page.getByText('The app has been installed.')).toBeVisible();
    });

    it('says when installation was cancelled', async () => {
      // Arrange
      const installer = nativeInstaller(() => Promise.reject(new DOMException('No', 'AbortError')));
      await mount(create('ss-page-home', { store: testStore(), installer }));

      // Act
      await userEvent.click(installButton());

      // Assert
      await expect.element(page.getByText('Installation was cancelled.')).toBeVisible();
    });

    it('ignores a second press while installing', async () => {
      // Arrange
      let finish: () => void = () => undefined;
      const nativeInstall = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      await mount(
        create('ss-page-home', { store: testStore(), installer: nativeInstaller(nativeInstall) }),
      );
      await userEvent.click(installButton());

      // Act
      await userEvent.click(installButton());
      finish();

      // Assert
      expect(nativeInstall).toHaveBeenCalledOnce();
    });
  });

  it('updates when the store changes', async () => {
    // Arrange
    const store = testStore();
    const home = await mount(create('ss-page-home', { store }));

    // Act
    store.startGame(['Ann', 'Bob']);
    await home.updateComplete;

    // Assert
    await expect.element(page.getByRole('link', { name: 'Resume game' })).toBeVisible();
  });

  it('renders an empty state without a store', async () => {
    // Arrange
    await mount(create('ss-page-home'));

    // Act
    const link = page.getByRole('link', { name: 'New game' });

    // Assert
    await expect.element(link).toBeVisible();
  });

  it('can move focus to its heading', async () => {
    // Arrange
    const home = await mount(create('ss-page-home', { store: testStore() }));

    // Act
    home.focusHeading();

    // Assert
    expect(home.shadowRoot?.activeElement?.tagName).toBe('H1');
  });
});
