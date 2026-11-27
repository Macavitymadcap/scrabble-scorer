import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import type { GameStore } from '../../state/store.ts';
import { HISTORY, NEW_GAME, historyPath } from '../router.ts';
import { create, mount, storeWithGame, testStore } from '../testing.ts';
import './ss-page-history.ts';

/** A store with two finished games in history, newest first. */
const storeWithHistory = (): GameStore => {
  const store = storeWithGame(['Ann', 'Bob']);
  store.addTurn({ kind: 'pass' });
  store.finishGame({ wentOutPlayerId: null, remaining: {} });
  store.startGame(['Cat', 'Dan']);
  store.finishGame({ wentOutPlayerId: null, remaining: {} });
  store.startGame(['Eve', 'Fay']);
  store.discardGame();
  return store;
};

const historyIds = (store: GameStore) => store.getState().history.map((game) => game.id);
const dialogButton = (name: string) => page.getByRole('dialog').getByRole('button', { name });

describe('ss-page-history', () => {
  describe('the list', () => {
    it('has "Game history" as its heading', async () => {
      // Arrange
      await mount(create('ss-page-history', { store: storeWithHistory() }));

      // Act
      const heading = page.getByRole('heading', { level: 1 });

      // Assert
      await expect.element(heading).toHaveTextContent('Game history');
    });

    it('lists the finished games, newest first', async () => {
      // Arrange
      await mount(create('ss-page-history', { store: storeWithHistory() }));

      // Act
      const items = page.getByRole('listitem').elements();

      // Assert
      expect(items.map((item) => item.textContent)).toEqual([
        expect.stringContaining('Cat 0, Dan 0'),
        expect.stringContaining('Ann 0, Bob 0'),
      ]);
    });

    it('says who won each game', async () => {
      // Arrange
      await mount(create('ss-page-history', { store: storeWithHistory() }));

      // Act
      const [newest] = page.getByRole('listitem').elements();

      // Assert
      expect(newest?.textContent).toContain('Cat and Dan tie on 0 points.');
    });

    it('links each game to its results', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store }));

      // Act
      const [firstLink] = page.getByRole('link').elements();

      // Assert
      expect(firstLink?.getAttribute('href')).toBe(historyPath(historyIds(store)[0]));
    });

    it('says when there are no finished games', async () => {
      // Arrange
      await mount(create('ss-page-history', { store: testStore() }));

      // Act
      const message = page.getByText('No finished games yet.');

      // Assert
      await expect.element(message).toBeVisible();
    });

    it('offers a new game when there are none', async () => {
      // Arrange
      await mount(create('ss-page-history', { store: testStore() }));

      // Act
      const link = page.getByRole('link', { name: 'Start a new game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', NEW_GAME);
    });

    it('deletes all games after confirming', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store }));
      await userEvent.click(page.getByRole('button', { name: 'Delete all saved games' }));

      // Act
      await userEvent.click(dialogButton('Delete'));

      // Assert
      await expect.poll(() => store.getState().history).toEqual([]);
    });

    it('keeps the games when deleting all is cancelled', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store }));
      await userEvent.click(page.getByRole('button', { name: 'Delete all saved games' }));

      // Act
      await userEvent.click(dialogButton('Cancel'));

      // Assert
      expect(store.getState().history).toHaveLength(2);
    });
  });

  describe('one game', () => {
    it('shows its results', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store, gameId: historyIds(store)[1] }));

      // Act
      const outcome = page.getByText('Ann and Bob tie on 0 points.');

      // Assert
      await expect.element(outcome).toBeVisible();
    });

    it('names the game by when it was played', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store, gameId: historyIds(store)[0] }));

      // Act
      const heading = page.getByRole('heading', { level: 1 }).element().textContent;

      // Assert
      expect(heading).toMatch(/^Game on \d{1,2} \w{3} \d{4}, \d{2}:\d{2}$/);
    });

    it('links back to the list', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store, gameId: historyIds(store)[0] }));

      // Act
      const link = page.getByRole('link', { name: 'Back to game history' });

      // Assert
      await expect.element(link).toHaveAttribute('href', HISTORY);
    });

    it('deletes the game after confirming', async () => {
      // Arrange
      const store = storeWithHistory();
      const [newest, oldest] = historyIds(store);
      await mount(create('ss-page-history', { store, gameId: newest }));
      await userEvent.click(page.getByRole('button', { name: 'Delete this game' }));

      // Act
      await userEvent.click(dialogButton('Delete'));

      // Assert
      await expect.poll(() => historyIds(store)).toEqual([oldest]);
    });

    it('goes back to the list after deleting', async () => {
      // Arrange
      const store = storeWithHistory();
      await mount(create('ss-page-history', { store, gameId: historyIds(store)[0] }));
      await userEvent.click(page.getByRole('button', { name: 'Delete this game' }));

      // Act
      await userEvent.click(dialogButton('Delete'));

      // Assert
      await expect.poll(() => window.location.hash).toBe(HISTORY);
    });

    it('says when the game is not in the history', async () => {
      // Arrange
      await mount(create('ss-page-history', { store: storeWithHistory(), gameId: 'nope' }));

      // Act
      const heading = page.getByRole('heading', { level: 1 });

      // Assert
      await expect.element(heading).toHaveTextContent('Game not found');
    });
  });
});
