/** A page the app can show, keyed by its base hash in ROUTES. */
export interface Route {
  /** The page's custom element tag. */
  tag: 'ss-page-home' | 'ss-page-new-game' | 'ss-page-game' | 'ss-page-turn';
  /** The document title while this page is shown. */
  title: string;
}

/** A route plus the parameter after its base hash, e.g. a turn id. */
export interface ResolvedRoute extends Route {
  param?: string;
}

export const HOME = '#/';
export const NEW_GAME = '#/new';
export const GAME = '#/game';
export const TURN = '#/turn';

export const APP_NAME = 'Scrabble Scorer';

const HOME_ROUTE: Route = { tag: 'ss-page-home', title: APP_NAME };

/** Pages by base hash. A Map, so lookups never hit inherited keys like "toString". */
export const ROUTES: ReadonlyMap<string, Route> = new Map([
  [HOME, HOME_ROUTE],
  [NEW_GAME, { tag: 'ss-page-new-game', title: `New game - ${APP_NAME}` }],
  [GAME, { tag: 'ss-page-game', title: `Scoreboard - ${APP_NAME}` }],
  [TURN, { tag: 'ss-page-turn', title: `Turn - ${APP_NAME}` }],
]);

/** Decodes a hash parameter. A malformed escape is kept as typed, so the page can say it wasn't found. */
const decodeParam = (raw: string): string | undefined => {
  if (!raw) {
    return undefined;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

/**
 * The route for a URL hash such as `#/turn/t12`: the base (`#/turn`) picks
 * the page and the rest is its parameter. An empty hash and unknown hashes
 * show the home page.
 */
export const resolveRoute = (hash: string): ResolvedRoute => {
  const [, section = '', ...rest] = hash.split('/');
  const route = ROUTES.get(`#/${section}`);
  if (!route) {
    return HOME_ROUTE;
  }
  const param = decodeParam(rest.join('/'));
  return param === undefined ? { ...route } : { ...route, param };
};

/** The hash for recording a new turn, or editing the turn with this id. */
export const turnPath = (turnId?: string): string =>
  turnId === undefined ? TURN : `${TURN}/${encodeURIComponent(turnId)}`;

/** Navigates to a route by changing the URL hash. */
export const navigate = (
  hash: string,
  location: Pick<Location, 'hash'> = window.location,
): void => {
  location.hash = hash;
};
