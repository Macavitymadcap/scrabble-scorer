import { describe, expect, it } from 'vite-plus/test';
import {
  APP_NAME,
  GAME,
  HOME,
  NEW_GAME,
  ROUTES,
  TURN,
  historyPath,
  navigate,
  resolveRoute,
  turnPath,
} from './router.ts';

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

describe('resolveRoute with a parameter', () => {
  it('resolves the turn hash to the turn page with no parameter', () => {
    // Arrange
    const hash = TURN;

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route).toEqual({ tag: 'ss-page-turn', title: `Turn - ${APP_NAME}` });
  });

  it('passes the rest of the hash as the parameter', () => {
    // Arrange
    const hash = '#/turn/t12';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.param).toBe('t12');
  });

  it('decodes an escaped parameter', () => {
    // Arrange
    const hash = '#/turn/a%20b';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.param).toBe('a b');
  });

  it('keeps a malformed escape as typed', () => {
    // Arrange
    const hash = '#/turn/t%2';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.param).toBe('t%2');
  });

  it('keeps slashes within the parameter', () => {
    // Arrange
    const hash = '#/turn/a/b';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.param).toBe('a/b');
  });

  it('treats a trailing slash as no parameter', () => {
    // Arrange
    const hash = '#/turn/';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route).not.toHaveProperty('param');
  });

  it('shows the home page for an unknown section with a parameter', () => {
    // Arrange
    const hash = '#/nowhere/t1';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route).toEqual({ tag: 'ss-page-home', title: APP_NAME });
  });

  it('returns a new object each time, so a change of parameter is a change of route', () => {
    // Arrange
    const first = resolveRoute(TURN);

    // Act
    const second = resolveRoute(TURN);

    // Assert
    expect(second).not.toBe(first);
  });
});

describe('turnPath', () => {
  it('is the turn hash for a new turn', () => {
    // Arrange
    const turnId = undefined;

    // Act
    const path = turnPath(turnId);

    // Assert
    expect(path).toBe('#/turn');
  });

  it('adds the turn id to edit a turn', () => {
    // Arrange
    const turnId = 'b1d5';

    // Act
    const path = turnPath(turnId);

    // Assert
    expect(path).toBe('#/turn/b1d5');
  });

  it('escapes characters that would break the hash', () => {
    // Arrange
    const turnId = 'a/b c';

    // Act
    const path = turnPath(turnId);

    // Assert
    expect(resolveRoute(path).param).toBe(turnId);
  });
});

describe('end game, results and history routes', () => {
  it.each([
    ['#/end', 'ss-page-end'],
    ['#/results', 'ss-page-results'],
    ['#/history', 'ss-page-history'],
  ])('resolves %s to %s', (hash, tag) => {
    // Arrange
    const input = hash;

    // Act
    const route = resolveRoute(input);

    // Assert
    expect(route.tag).toBe(tag);
  });

  it('passes a past game id to the history page', () => {
    // Arrange
    const hash = '#/history/g42';

    // Act
    const route = resolveRoute(hash);

    // Assert
    expect(route.param).toBe('g42');
  });
});

describe('historyPath', () => {
  it('is the history hash for the list', () => {
    // Arrange
    const gameId = undefined;

    // Act
    const path = historyPath(gameId);

    // Assert
    expect(path).toBe('#/history');
  });

  it("adds the game id for one game's results", () => {
    // Arrange
    const gameId = 'a b';

    // Act
    const path = historyPath(gameId);

    // Assert
    expect(resolveRoute(path).param).toBe('a b');
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
