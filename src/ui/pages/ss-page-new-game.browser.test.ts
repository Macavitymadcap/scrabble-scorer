import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import type { GameStore } from '../../state/store.ts';
import { GAME } from '../router.ts';
import { create, mount, storeWithGame, testStore } from '../testing.ts';
import './ss-page-new-game.ts';

const nameField = (position: number) => page.getByRole('textbox', { name: `Player ${position}` });
const startButton = () => page.getByRole('button', { name: 'Start game' });

const fillNames = async (...names: string[]) => {
  for (const [index, name] of names.entries()) {
    await userEvent.fill(nameField(index + 1), name);
  }
};

const playerNames = (store: GameStore) => store.getState().game?.players.map((p) => p.name);

describe('ss-page-new-game', () => {
  it('has "New game" as its heading', async () => {
    // Arrange
    await mount(create('ss-page-new-game', { store: testStore() }));

    // Act
    const heading = page.getByRole('heading', { level: 1 });

    // Assert
    await expect.element(heading).toHaveTextContent('New game');
  });

  describe('starting names', () => {
    it('are empty with no previous game', async () => {
      // Arrange
      await mount(create('ss-page-new-game', { store: testStore() }));

      // Act
      const first = nameField(1);

      // Assert
      await expect.element(first).toHaveValue('');
    });

    it("are the current game's players", async () => {
      // Arrange
      await mount(create('ss-page-new-game', { store: storeWithGame(['Cat', 'Dan']) }));

      // Act
      const second = nameField(2);

      // Assert
      await expect.element(second).toHaveValue('Dan');
    });

    it("are the last finished game's players when there is no current game", async () => {
      // Arrange
      const store = storeWithGame(['Cat', 'Dan']);
      store.finishGame({ wentOutPlayerId: null, remaining: {} });
      store.startGame(['Eve', 'Fay']);
      store.discardGame();
      await mount(create('ss-page-new-game', { store }));

      // Act
      const first = nameField(1);

      // Assert
      await expect.element(first).toHaveValue('Cat');
    });
  });

  describe('with no game in progress', () => {
    it('starts the game with the names entered', async () => {
      // Arrange
      const store = testStore();
      await mount(create('ss-page-new-game', { store }));
      await fillNames('Ann', 'Bob');

      // Act
      await userEvent.click(startButton());

      // Assert
      expect(playerNames(store)).toEqual(['Ann', 'Bob']);
    });

    it('goes to the scoreboard', async () => {
      // Arrange
      await mount(create('ss-page-new-game', { store: testStore() }));
      await fillNames('Ann', 'Bob');

      // Act
      await userEvent.click(startButton());

      // Assert
      expect(window.location.hash).toBe(GAME);
    });

    it('starts without asking when the current game has finished', async () => {
      // Arrange
      const store = storeWithGame(['Cat', 'Dan']);
      store.finishGame({ wentOutPlayerId: null, remaining: {} });
      await mount(create('ss-page-new-game', { store }));

      // Act
      await userEvent.click(startButton());

      // Assert
      expect(store.getState().history).toHaveLength(1);
    });
  });

  describe('with a game in progress', () => {
    it('asks before discarding it', async () => {
      // Arrange
      await mount(create('ss-page-new-game', { store: storeWithGame(['Cat', 'Dan']) }));

      // Act
      await userEvent.click(startButton());

      // Assert
      await expect
        .element(page.getByRole('dialog', { name: 'Start a new game?' }))
        .toHaveAccessibleDescription(
          "The game between Cat and Dan hasn't finished. It will be discarded.",
        );
    });

    it('lists three or more players with commas', async () => {
      // Arrange
      await mount(create('ss-page-new-game', { store: storeWithGame(['Cat', 'Dan', 'Eve']) }));

      // Act
      await userEvent.click(startButton());

      // Assert
      await expect
        .element(page.getByRole('dialog'))
        .toHaveAccessibleDescription(
          "The game between Cat, Dan and Eve hasn't finished. It will be discarded.",
        );
    });

    it('keeps the current game when the player cancels', async () => {
      // Arrange
      const store = storeWithGame(['Cat', 'Dan']);
      const current = store.getState().game;
      await mount(create('ss-page-new-game', { store }));
      await userEvent.click(startButton());

      // Act
      await userEvent.click(page.getByRole('button', { name: 'Cancel' }));

      // Assert
      await expect.poll(() => store.getState().game).toBe(current);
    });

    it('starts the new game when the player confirms', async () => {
      // Arrange
      const store = storeWithGame(['Cat', 'Dan']);
      await mount(create('ss-page-new-game', { store }));
      await fillNames('Ann', 'Bob');
      await userEvent.click(startButton());

      // Act
      await userEvent.click(page.getByRole('button', { name: 'Discard and start' }));

      // Assert
      await expect.poll(() => playerNames(store)).toEqual(['Ann', 'Bob']);
    });
  });

  it('shows the error when the store rejects the game', async () => {
    // Arrange
    const store = testStore();
    store.startGame = () => ({ ok: false, error: 'Something was wrong with the players.' });
    await mount(create('ss-page-new-game', { store }));
    await fillNames('Ann', 'Bob');

    // Act
    await userEvent.click(startButton());

    // Assert
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Something was wrong with the players.');
  });

  it('stays on the page when the store rejects the game', async () => {
    // Arrange
    const store = testStore();
    store.startGame = () => ({ ok: false, error: 'Nope.' });
    await mount(create('ss-page-new-game', { store }));
    await fillNames('Ann', 'Bob');

    // Act
    await userEvent.click(startButton());

    // Assert
    expect(window.location.hash).toBe('');
  });

  it('does nothing without a store', async () => {
    // Arrange
    await mount(create('ss-page-new-game'));
    await fillNames('Ann', 'Bob');

    // Act
    await userEvent.click(startButton());

    // Assert
    expect(window.location.hash).toBe('');
  });
});
