import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { END, GAME, NEW_GAME } from '../router.ts';
import { create, mount, storeWithGame, testStore } from '../testing.ts';
import './ss-page-results.ts';

const finishedStore = () => {
  const store = storeWithGame();
  store.finishGame({ wentOutPlayerId: null, remaining: {} });
  return store;
};

describe('ss-page-results', () => {
  describe('with a finished game', () => {
    it('has "Results" as its heading', async () => {
      // Arrange
      await mount(create('ss-page-results', { store: finishedStore() }));

      // Act
      const heading = page.getByRole('heading', { level: 1 });

      // Assert
      await expect.element(heading).toHaveTextContent('Results');
    });

    it('shows the final scores', async () => {
      // Arrange
      await mount(create('ss-page-results', { store: finishedStore() }));

      // Act
      const table = page.getByRole('table', { name: 'Final scores' });

      // Assert
      await expect.element(table).toBeVisible();
    });

    it('offers a new game as the main action', async () => {
      // Arrange
      await mount(create('ss-page-results', { store: finishedStore() }));

      // Act
      const link = page.getByRole('link', { name: 'New game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', NEW_GAME);
    });

    it('links to the final scoreboard', async () => {
      // Arrange
      await mount(create('ss-page-results', { store: finishedStore() }));

      // Act
      const link = page.getByRole('link', { name: 'See the scoreboard' });

      // Assert
      await expect.element(link).toHaveAttribute('href', GAME);
    });
  });

  describe('reopening', () => {
    it('asks first', async () => {
      // Arrange
      await mount(create('ss-page-results', { store: finishedStore() }));

      // Act
      await userEvent.click(page.getByRole('button', { name: 'Reopen game' }));

      // Assert
      await expect.element(page.getByRole('dialog', { name: 'Reopen this game?' })).toBeVisible();
    });

    it('reopens the game when confirmed', async () => {
      // Arrange
      const store = finishedStore();
      await mount(create('ss-page-results', { store }));
      await userEvent.click(page.getByRole('button', { name: 'Reopen game' }));

      // Act
      await userEvent.click(page.getByRole('dialog').getByRole('button', { name: 'Reopen game' }));

      // Assert
      await expect.poll(() => store.getState().game?.status).toBe('active');
    });

    it('goes to the scoreboard after reopening', async () => {
      // Arrange
      await mount(create('ss-page-results', { store: finishedStore() }));
      await userEvent.click(page.getByRole('button', { name: 'Reopen game' }));

      // Act
      await userEvent.click(page.getByRole('dialog').getByRole('button', { name: 'Reopen game' }));

      // Assert
      await expect.poll(() => window.location.hash).toBe(GAME);
    });

    it('keeps the game finished when cancelled', async () => {
      // Arrange
      const store = finishedStore();
      await mount(create('ss-page-results', { store }));
      await userEvent.click(page.getByRole('button', { name: 'Reopen game' }));

      // Act
      await userEvent.click(page.getByRole('button', { name: 'Cancel' }));

      // Assert
      expect(store.getState().game?.status).toBe('finished');
    });

    it('shows the error when the store refuses', async () => {
      // Arrange
      const store = finishedStore();
      store.reopenGame = () => ({ ok: false, error: 'Cannot reopen.' });
      await mount(create('ss-page-results', { store }));
      await userEvent.click(page.getByRole('button', { name: 'Reopen game' }));

      // Act
      await userEvent.click(page.getByRole('dialog').getByRole('button', { name: 'Reopen game' }));

      // Assert
      await expect.element(page.getByRole('alert')).toHaveTextContent('Cannot reopen.');
    });
  });

  it('says there is no game to show', async () => {
    // Arrange
    await mount(create('ss-page-results', { store: testStore() }));

    // Act
    const message = page.getByText("There's no game to show.");

    // Assert
    await expect.element(message).toBeVisible();
  });

  it('offers to end a game that has not finished', async () => {
    // Arrange
    await mount(create('ss-page-results', { store: storeWithGame() }));

    // Act
    const link = page.getByRole('link', { name: 'End game' });

    // Assert
    await expect.element(link).toHaveAttribute('href', END);
  });
});
