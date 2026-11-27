import { describe, expect, it } from 'vite-plus/test';
import { APP_NAME, GAME, HOME, NEW_GAME, ROUTES, navigate, resolveRoute } from './router.ts';

describe('resolveRoute', () => {
  it('resolves the home hash to the home page', () => {
    // Arrange
    const hash = HOME;

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route).toEqual({ tag: 'ss-page-home', title: APP_NAME });
  });

  it('resolves the new game hash to the new game page', () => {
    // Arrange
    const hash = NEW_GAME;

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.tag).toBe('ss-page-new-game');
  });

  it('resolves the game hash to the scoreboard page', () => {
    // Arrange
    const hash = GAME;

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.tag).toBe('ss-page-game');
  });

  it('shows the home page for an empty hash', () => {
    // Arrange
    const hash = '';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.tag).toBe('ss-page-home');
  });

  it('shows the home page for an unknown hash', () => {
    // Arrange
    const hash = '#/nowhere';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.tag).toBe('ss-page-home');
  });

  it('shows the home page for a hash naming an inherited property', () => {
    // Arrange
    const hash = 'toString';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.tag).toBe('ss-page-home');
  });
});

describe('ROUTES', () => {
  it('gives every page a title that names the app', () => {
    // Arrange
    const routes = [...ROUTES.values()];

    // Act
    const titles = routes.map((route) => route.title);

    // Assert
    expect(titles.every((title) => title.includes(APP_NAME))).toBe(true);
  });
});

describe('navigate', () => {
  it('sets the location hash', () => {
    // Arrange
    const location = { hash: '' };

    // Act
    navigate(GAME, location);

    // Assert
    expect(location.hash).toBe(GAME);
  });
});
