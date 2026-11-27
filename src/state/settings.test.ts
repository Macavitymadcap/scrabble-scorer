import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings } from './settings.ts';
import { createMemoryStorage } from './storage.ts';
import { failingStorage } from './testing.ts';

const storageWith = (raw: string) => {
  const storage = createMemoryStorage();
  storage.setItem(SETTINGS_KEY, raw);
  return storage;
};

describe('loadSettings', () => {
  it('uses the defaults when nothing is saved', () => {
    // Arrange
    const storage = createMemoryStorage();

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the screen on by default', () => {
    // Arrange
    const defaults = DEFAULT_SETTINGS;

    // Act
    const { keepScreenOn } = defaults;

    // Assert
    expect(keepScreenOn).toBe(true);
  });

  it('loads saved settings', () => {
    // Arrange
    const storage = storageWith(JSON.stringify({ keepScreenOn: false }));

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual({ keepScreenOn: false });
  });

  it('uses the default for a value of the wrong type', () => {
    // Arrange
    const storage = storageWith(JSON.stringify({ keepScreenOn: 'no' }));

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('uses the defaults for data that is not an object', () => {
    // Arrange
    const storage = storageWith(JSON.stringify([false]));

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('uses the defaults for data that is not JSON', () => {
    // Arrange
    const storage = storageWith('{');

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('uses the defaults when storage is blocked', () => {
    // Arrange
    const storage = failingStorage(['getItem']);

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('ignores unknown saved fields', () => {
    // Arrange
    const storage = storageWith(JSON.stringify({ keepScreenOn: false, theme: 'pink' }));

    // Act
    const settings = loadSettings(storage);

    // Assert
    expect(settings).toEqual({ keepScreenOn: false });
  });

  it('returns a copy, so changing it cannot change the defaults', () => {
    // Arrange
    const settings = loadSettings(createMemoryStorage());

    // Act
    settings.keepScreenOn = false;

    // Assert
    expect(DEFAULT_SETTINGS.keepScreenOn).toBe(true);
  });
});

describe('saveSettings', () => {
  it('saves settings that load back the same', () => {
    // Arrange
    const storage = createMemoryStorage();

    // Act
    saveSettings(storage, { keepScreenOn: false });

    // Assert
    expect(loadSettings(storage)).toEqual({ keepScreenOn: false });
  });

  it('reports success', () => {
    // Arrange
    const storage = createMemoryStorage();

    // Act
    const saved = saveSettings(storage, DEFAULT_SETTINGS);

    // Assert
    expect(saved).toBe(true);
  });

  it('reports failure when storage refuses', () => {
    // Arrange
    const storage = failingStorage(['setItem']);

    // Act
    const saved = saveSettings(storage, DEFAULT_SETTINGS);

    // Assert
    expect(saved).toBe(false);
  });
});
