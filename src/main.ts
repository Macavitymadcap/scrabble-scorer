import { GameStore } from './state/store.ts';
import { chooseStorage } from './state/storage.ts';
import './ui/components/ss-app.ts';

const { storage, persistent } = chooseStorage(() => globalThis.localStorage);
const app = document.querySelector('ss-app');
if (app) {
  app.store = new GameStore({ storage });
  app.persistent = persistent;
}
