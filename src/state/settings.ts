import { isRecord } from './schema.ts';
import type { KeyValueStorage } from './storage.ts';

/** Device preferences, saved separately from games. */
export interface Settings {
  /** Keep the screen on while a game is in progress. */
  keepScreenOn: boolean;
}

export const SETTINGS_KEY = 'scrabble-scorer:settings';

export const DEFAULT_SETTINGS: Readonly<Settings> = { keepScreenOn: true };

/**
 * The saved settings, filled in from the defaults for anything missing or
 * invalid. Settings are cheap to reset, so unreadable data is never an error.
 */
export const loadSettings = (storage: KeyValueStorage): Settings => {
  try {
    const data: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null');
    const saved = isRecord(data) ? data : {};
    return {
      keepScreenOn:
        typeof saved.keepScreenOn === 'boolean'
          ? saved.keepScreenOn
          : DEFAULT_SETTINGS.keepScreenOn,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

/** Saves the settings. Returns false if storage refused. */
export const saveSettings = (storage: KeyValueStorage, settings: Settings): boolean => {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
};
