/** A page the app can show, keyed by its URL hash in ROUTES. */
export interface Route {
  /** The page's custom element tag. */
  tag: 'ss-page-home' | 'ss-page-new-game' | 'ss-page-game';
  /** The document title while this page is shown. */
  title: string;
}

export const HOME = '#/';
export const NEW_GAME = '#/new';
export const GAME = '#/game';

export const APP_NAME = 'Scrabble Scorer';

const HOME_ROUTE: Route = { tag: 'ss-page-home', title: APP_NAME };

/** Pages by URL hash. A Map, so lookups never hit inherited keys like "toString". */
export const ROUTES: ReadonlyMap<string, Route> = new Map([
  [HOME, HOME_ROUTE],
  [NEW_GAME, { tag: 'ss-page-new-game', title: `New game - ${APP_NAME}` }],
  [GAME, { tag: 'ss-page-game', title: `Scoreboard - ${APP_NAME}` }],
]);

/** The route for a URL hash. An empty hash and unknown hashes show the home page. */
export const resolveRoute = (hash: string): Route => ROUTES.get(hash) ?? HOME_ROUTE;

/** Navigates to a route by changing the URL hash. */
export const navigate = (
  hash: string,
  location: Pick<Location, 'hash'> = window.location,
): void => {
  location.hash = hash;
};
