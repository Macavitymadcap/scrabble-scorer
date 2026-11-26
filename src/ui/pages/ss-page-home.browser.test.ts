import { describe, expect, it } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser/context';
import { create, mount, storeWithGame, testStore } from '../testing.ts';
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
    it('offers to see the scores', async () => {
      // Arrange
      await mount(create('ss-page-home', { store: finishGame() }));

      // Act
      const link = page.getByRole('link', { name: 'See the scores' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/game');
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
