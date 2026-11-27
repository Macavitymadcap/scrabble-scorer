import { describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser/context';
import { GAME, RESULTS } from '../../router.ts';
import { create, mount, storeWithGame, testStore } from '../../testing.ts';
import './ss-page-end.ts';

const finishButton = () => page.getByRole('button', { name: 'Finish game' });

describe('ss-page-end', () => {
  it('has "End game" as its heading', async () => {
    // Arrange
    await mount(create('ss-page-end', { store: storeWithGame() }));

    // Act
    const heading = page.getByRole('heading', { level: 1 });

    // Assert
    await expect.element(heading).toHaveTextContent('End game');
  });

  it('finishes the game in the store', async () => {
    // Arrange
    const store = storeWithGame();
    await mount(create('ss-page-end', { store }));
    await userEvent.fill(page.getByRole('textbox', { name: 'Bob' }), 'qe');

    // Act
    await userEvent.click(finishButton());

    // Assert
    expect(store.getState().game?.endGame).toEqual({
      wentOutPlayerId: 'id2',
      remaining: { id3: 'QE' },
    });
  });

  it('goes to the results', async () => {
    // Arrange
    await mount(create('ss-page-end', { store: storeWithGame() }));

    // Act
    await userEvent.click(finishButton());

    // Assert
    expect(window.location.hash).toBe(RESULTS);
  });

  it('offers a way back to the scoreboard', async () => {
    // Arrange
    await mount(create('ss-page-end', { store: storeWithGame() }));

    // Act
    const cancel = page.getByRole('link', { name: 'Cancel' });

    // Assert
    await expect.element(cancel).toHaveAttribute('href', GAME);
  });

  it('shows the error when the store rejects the end game', async () => {
    // Arrange
    const store = storeWithGame();
    store.finishGame = () => ({ ok: false, error: 'That end game broke a rule.' });
    await mount(create('ss-page-end', { store }));

    // Act
    await userEvent.click(finishButton());

    // Assert
    await expect.element(page.getByRole('alert')).toHaveTextContent('That end game broke a rule.');
  });

  it('stays on the page when the store rejects the end game', async () => {
    // Arrange
    const store = storeWithGame();
    store.finishGame = () => ({ ok: false, error: 'Nope.' });
    await mount(create('ss-page-end', { store }));

    // Act
    await userEvent.click(finishButton());

    // Assert
    expect(window.location.hash).toBe('');
  });

  it('says there is no game to end', async () => {
    // Arrange
    await mount(create('ss-page-end', { store: testStore() }));

    // Act
    const message = page.getByText("There's no game in progress.");

    // Assert
    await expect.element(message).toBeVisible();
  });

  it('links to the results when the game has already finished', async () => {
    // Arrange
    const store = storeWithGame();
    store.finishGame({ wentOutPlayerId: null, remaining: {} });
    await mount(create('ss-page-end', { store }));

    // Act
    const link = page.getByRole('link', { name: 'See the results' });

    // Assert
    await expect.element(link).toHaveAttribute('href', RESULTS);
  });
});
