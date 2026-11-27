import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { create, mount, storeWithGame, testStore } from '../../testing.ts';
import './ss-page-game.ts';

const button = (name: string) => page.getByRole('button', { name, exact: true });

const statusText = () => page.getByRole('status').element().textContent?.trim();

describe('ss-page-game', () => {
  describe('with no game', () => {
    it('says there is no game', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: testStore() }));

      // Act
      const message = page.getByText("There's no game in progress.");

      // Assert
      await expect.element(message).toBeVisible();
    });

    it('links to a new game', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: testStore() }));

      // Act
      const link = page.getByRole('link', { name: 'Start a new game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/new');
    });
  });

  describe('with a game in progress', () => {
    it('has "Scoreboard" as its heading', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const heading = page.getByRole('heading', { level: 1 });

      // Assert
      await expect.element(heading).toHaveTextContent('Scoreboard');
    });

    it('says the round and whose turn it is', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const summary = page.getByText('Round 1: Ann to play.');

      // Assert
      await expect.element(summary).toBeVisible();
    });

    it('shows the scoreboard', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const table = page.getByRole('table', { name: 'Scores' });

      // Assert
      await expect.element(table).toBeVisible();
    });

    it("offers to enter the next player's turn as the main action", async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const link = page.getByRole('link', { name: 'Enter turn (Ann)' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/turn');
      await expect.element(link).toHaveClass('primary');
    });

    it('offers to end the game', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const link = page.getByRole('link', { name: 'End game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/end');
    });

    it('names the next player on the Pass button', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const pass = button('Pass (Ann)');

      // Assert
      await expect.element(pass).toBeVisible();
    });

    it('records a pass for the next player', async () => {
      // Arrange
      const store = storeWithGame();
      await mount(create('ss-page-game', { store }));

      // Act
      await userEvent.click(button('Pass (Ann)'));

      // Assert
      expect(store.getState().game?.turns.map((t) => t.kind)).toEqual(['pass']);
    });

    it('announces the pass', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      await userEvent.click(button('Pass (Ann)'));

      // Assert
      expect(statusText()).toBe('Ann passed.');
    });

    it('moves on to the next player after a pass', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      await userEvent.click(button('Pass (Ann)'));

      // Assert
      await expect.element(page.getByText('Round 1: Bob to play.')).toBeVisible();
    });

    it('does not offer undo before the first turn', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const undo = button('Undo last turn');

      // Assert
      await expect.element(undo).not.toBeInTheDocument();
    });

    it('links to a new game', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithGame() }));

      // Act
      const link = page.getByRole('link', { name: 'New game' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/new');
    });
  });

  describe('undo', () => {
    const storeWithPass = () => {
      const store = storeWithGame();
      store.addTurn({ kind: 'pass' });
      return store;
    };

    it('asks before undoing, naming the player and round', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: storeWithPass() }));

      // Act
      await userEvent.click(button('Undo last turn'));

      // Assert
      await expect
        .element(page.getByRole('dialog', { name: "Undo Ann's turn?" }))
        .toHaveAccessibleDescription("This removes Ann's turn from round 1.");
    });

    it('undoes the turn when confirmed', async () => {
      // Arrange
      const store = storeWithPass();
      await mount(create('ss-page-game', { store }));
      await userEvent.click(button('Undo last turn'));

      // Act
      await userEvent.click(button('Undo turn'));

      // Assert
      await expect.poll(() => store.getState().game?.turns).toEqual([]);
    });

    it('announces the undo', async () => {
      // Arrange
      const gamePage = await mount(create('ss-page-game', { store: storeWithPass() }));
      await userEvent.click(button('Undo last turn'));

      // Act
      await userEvent.click(button('Undo turn'));

      // Assert
      await expect.poll(() => gamePage.status).toBe("Ann's turn was undone.");
    });

    it('keeps the turn when cancelled', async () => {
      // Arrange
      const store = storeWithPass();
      await mount(create('ss-page-game', { store }));
      await userEvent.click(button('Undo last turn'));

      // Act
      await userEvent.click(button('Cancel'));

      // Assert
      expect(store.getState().game?.turns).toHaveLength(1);
    });
  });

  describe('with a finished game', () => {
    const finishedStore = () => {
      const store = storeWithGame();
      store.finishGame({ wentOutPlayerId: null, remaining: {} });
      return store;
    };

    it('says the game has finished', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: finishedStore() }));

      // Act
      const summary = page.getByText('This game has finished.');

      // Assert
      await expect.element(summary).toBeVisible();
    });

    it('links to the results', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: finishedStore() }));

      // Act
      const link = page.getByRole('link', { name: 'See the results' });

      // Assert
      await expect.element(link).toHaveAttribute('href', '#/results');
    });

    it('offers no pass or undo', async () => {
      // Arrange
      await mount(create('ss-page-game', { store: finishedStore() }));

      // Act
      const pass = button('Pass (Ann)');

      // Assert
      await expect.element(pass).not.toBeInTheDocument();
    });
  });

  it('shows an error when the store rejects an action', async () => {
    // Arrange
    const store = storeWithGame();
    store.addTurn = () => ({ ok: false, error: 'That turn broke a rule.' });
    await mount(create('ss-page-game', { store }));

    // Act
    await userEvent.click(button('Pass (Ann)'));

    // Assert
    await expect.element(page.getByRole('alert')).toHaveTextContent('That turn broke a rule.');
  });

  it('does not announce a rejected action', async () => {
    // Arrange
    const store = storeWithGame();
    store.addTurn = () => ({ ok: false, error: 'Nope.' });
    await mount(create('ss-page-game', { store }));

    // Act
    await userEvent.click(button('Pass (Ann)'));

    // Assert
    expect(statusText()).toBe('');
  });
});
