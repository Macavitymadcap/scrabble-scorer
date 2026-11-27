import { registerSW } from 'virtual:pwa-register';
import { GameStore } from './state/store.ts';
import { chooseStorage } from './state/storage.ts';
import { InstallPrompt } from './ui/install-prompt.ts';
import './ui/ss-app.ts';

const { storage, persistent } = chooseStorage(() => globalThis.localStorage);
const app = document.querySelector('ss-app');
if (app) {
  app.store = new GameStore({ storage });
  app.persistent = persistent;
  // Created at start-up: the browser's install event can fire before any page shows.
  app.installer = new InstallPrompt();

  // A new version waits until the player chooses Reload, so a game is never
  // reloaded mid-turn.
  const updateServiceWorker = registerSW({
    onNeedRefresh: () => {
      app.updateAvailable = true;
    },
  });
  app.onReload = () => {
    void updateServiceWorker(true);
  };
}
