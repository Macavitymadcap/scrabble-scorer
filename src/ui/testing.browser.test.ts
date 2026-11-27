import { describe, expect, it } from 'vite-plus/test';
import './templates/ss-app-shell.ts';
import { create, mount, storeWithGame, testStore } from './testing.ts';

describe('create (test helper)', () => {
  it('makes an element with the given properties', () => {
    // Arrange
    const properties = { notice: 'Hello' };

    // Act
    const shell = create('ss-app-shell', properties);

    // Assert
    expect(shell.notice).toBe('Hello');
    expect(shell.isConnected).toBe(false);
  });
});

describe('mount (test helper)', () => {
  it('adds the element to the page and waits for it to render', async () => {
    // Arrange
    const shell = create('ss-app-shell');

    // Act
    await mount(shell);

    // Assert
    expect(shell.isConnected).toBe(true);
    expect(shell.shadowRoot?.querySelector('header')).not.toBeNull();
  });
});

describe('testStore (test helper)', () => {
  it('starts with no game', () => {
    // Arrange
    const store = testStore();

    // Act
    const { game } = store.getState();

    // Assert
    expect(game).toBeNull();
  });
});

describe('storeWithGame (test helper)', () => {
  it('starts a game for the given players', () => {
    // Arrange
    const names = ['Cat', 'Dan', 'Eve'];

    // Act
    const store = storeWithGame(names);

    // Assert
    expect(store.getState().game?.players.map((p) => p.name)).toEqual(names);
  });
});
