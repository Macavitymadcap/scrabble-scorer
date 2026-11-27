import { describe, expect, it } from 'vite-plus/test';
import './templates/ss-app-shell.ts';
import { html } from 'lit';
import { create, isoClock, mount, renderTemplate, storeWithGame, testStore } from './testing.ts';

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

describe('isoClock (test helper)', () => {
  it('returns real ISO times a minute apart', () => {
    // Arrange
    const clock = isoClock(Date.UTC(2026, 0, 1, 12, 0));

    // Act
    const times = [clock(), clock()];

    // Assert
    expect(times).toEqual(['2026-01-01T12:00:00.000Z', '2026-01-01T12:01:00.000Z']);
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

describe('renderTemplate (test helper)', () => {
  it('renders the template into a container on the page', () => {
    // Arrange
    const template = html`<p>Hello</p>`;

    // Act
    const container = renderTemplate(template);

    // Assert
    expect(container.isConnected).toBe(true);
    expect(container.textContent).toContain('Hello');
  });
});
