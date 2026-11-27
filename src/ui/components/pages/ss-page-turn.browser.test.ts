import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { play, word } from '../../../domain/testing.ts';
import type { GameStore } from '../../../state/store.ts';
import { GAME } from '../../router.ts';
import { create, mount, storeWithGame, testStore } from '../../testing.ts';
import './ss-page-turn.ts';

const heading = () => page.getByRole('heading', { level: 1 });
const lettersField = () =>
  page
    .getByRole('group', { name: 'Main word', exact: true })
    .getByRole('textbox', { name: 'Letters' });
const saveButton = () => page.getByRole('button', { name: 'Save turn' });

/** A game where Ann has played CAT and it's Bob's turn. */
const storeWithCat = (): GameStore => {
  const store = storeWithGame();
  store.addTurn(play([word('CAT')]));
  return store;
};

const turns = (store: GameStore) => store.getState().game?.turns ?? [];

describe('ss-page-turn', () => {
  describe('recording a new turn', () => {
    it("names the next player's turn", async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: storeWithGame() }));

      // Act
      const title = heading();

      // Assert
      await expect.element(title).toHaveTextContent("Ann's turn");
    });

    it('says which round it is', async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: storeWithGame() }));

      // Act
      const round = page.getByText('Round 1', { exact: true });

      // Assert
      await expect.element(round).toBeVisible();
    });

    it('records the turn for the next player', async () => {
      // Arrange
      const store = storeWithGame();
      await mount(create('ss-page-turn', { store }));
      await userEvent.fill(lettersField(), 'cat');

      // Act
      await userEvent.click(saveButton());

      // Assert
      expect(turns(store).map((t) => t.kind)).toEqual(['play']);
    });

    it('goes back to the scoreboard after saving', async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: storeWithGame() }));
      await userEvent.fill(lettersField(), 'cat');

      // Act
      await userEvent.click(saveButton());

      // Assert
      expect(window.location.hash).toBe(GAME);
    });

    it('offers a way back without saving', async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: storeWithGame() }));

      // Act
      const cancel = page.getByRole('link', { name: 'Cancel' });

      // Assert
      await expect.element(cancel).toHaveAttribute('href', GAME);
    });
  });

  describe('editing a turn', () => {
    it('names whose turn is being edited', async () => {
      // Arrange
      const store = storeWithCat();
      const turnId = turns(store)[0]?.id;
      await mount(create('ss-page-turn', { store, turnId }));

      // Act
      const title = heading();

      // Assert
      await expect.element(title).toHaveTextContent("Edit Ann's turn");
    });

    it('starts from the existing turn', async () => {
      // Arrange
      const store = storeWithCat();
      const turnId = turns(store)[0]?.id;
      await mount(create('ss-page-turn', { store, turnId }));

      // Act
      const field = lettersField();

      // Assert
      await expect.element(field).toHaveValue('CAT');
    });

    it('saves the change to that turn', async () => {
      // Arrange
      const store = storeWithCat();
      const turnId = turns(store)[0]?.id;
      await mount(create('ss-page-turn', { store, turnId }));
      await userEvent.click(page.getByRole('radio', { name: 'Passed' }));

      // Act
      await userEvent.click(saveButton());

      // Assert
      expect(turns(store).map((t) => t.kind)).toEqual(['pass']);
    });

    it('does not add a new turn', async () => {
      // Arrange
      const store = storeWithCat();
      const turnId = turns(store)[0]?.id;
      await mount(create('ss-page-turn', { store, turnId }));

      // Act
      await userEvent.click(saveButton());

      // Assert
      expect(turns(store)).toHaveLength(1);
    });

    it('says when the turn is not in the game', async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: storeWithGame(), turnId: 'nope' }));

      // Act
      const title = heading();

      // Assert
      await expect.element(title).toHaveTextContent('Turn not found');
    });

    it('links back to the scoreboard when the turn is not found', async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: storeWithGame(), turnId: 'nope' }));

      // Act
      const link = page.getByRole('link', { name: 'Back to the scoreboard' });

      // Assert
      await expect.element(link).toHaveAttribute('href', GAME);
    });

    it('starts the form again when moving to a different turn', async () => {
      // Arrange
      const store = storeWithCat();
      store.addTurn({ kind: 'pass' });
      const [cat, pass] = turns(store);
      const turnPage = await mount(create('ss-page-turn', { store, turnId: cat?.id }));

      // Act
      turnPage.turnId = pass?.id;
      await turnPage.updateComplete;

      // Assert
      await expect.element(page.getByRole('radio', { name: 'Passed' })).toBeChecked();
    });
  });

  describe('when a turn cannot be entered', () => {
    it('says there is no game', async () => {
      // Arrange
      await mount(create('ss-page-turn', { store: testStore() }));

      // Act
      const message = page.getByText("There's no game in progress.");

      // Assert
      await expect.element(message).toBeVisible();
    });

    it('says the game has finished', async () => {
      // Arrange
      const store = storeWithGame();
      store.finishGame({ wentOutPlayerId: null, remaining: {} });
      await mount(create('ss-page-turn', { store }));

      // Act
      const message = page.getByText('This game has finished.');

      // Assert
      await expect.element(message).toBeVisible();
    });
  });

  describe('when the store rejects the turn', () => {
    it('shows the error', async () => {
      // Arrange
      const store = storeWithGame();
      store.addTurn = () => ({ ok: false, error: 'That turn broke a rule.' });
      await mount(create('ss-page-turn', { store }));
      await userEvent.fill(lettersField(), 'cat');

      // Act
      await userEvent.click(saveButton());

      // Assert
      await expect.element(page.getByRole('alert')).toHaveTextContent('That turn broke a rule.');
    });

    it('stays on the page', async () => {
      // Arrange
      const store = storeWithGame();
      store.addTurn = () => ({ ok: false, error: 'Nope.' });
      await mount(create('ss-page-turn', { store }));
      await userEvent.fill(lettersField(), 'cat');

      // Act
      await userEvent.click(saveButton());

      // Assert
      expect(window.location.hash).toBe('');
    });
  });

  it('shows the no-game message if its store is taken away', async () => {
    // Arrange
    const turnPage = await mount(create('ss-page-turn', { store: storeWithGame() }));
    turnPage.store = undefined;
    await turnPage.updateComplete;

    // Act
    const message = page.getByText("There's no game in progress.");

    // Assert
    await expect.element(message).toBeVisible();
  });
});
