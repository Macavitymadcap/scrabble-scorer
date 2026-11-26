import { describe, expect, it, vi } from 'vite-plus/test';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrate, type Migration } from './migrations.ts';
import { SchemaError } from './schema.ts';

describe('MIGRATIONS', () => {
  it('has a step from every older version up to the current one', () => {
    // Arrange
    const olderVersions = Array.from({ length: CURRENT_SCHEMA_VERSION - 1 }, (_, i) => i + 1);

    // Act
    const missing = olderVersions.filter((version) => !MIGRATIONS[version]);

    // Assert
    expect(missing).toEqual([]);
  });
});

describe('migrate', () => {
  describe('with data already at the target version', () => {
    it('returns the same object, untouched', () => {
      // Arrange
      const data = { schemaVersion: CURRENT_SCHEMA_VERSION, id: 'g1' };

      // Act
      const result = migrate(data);

      // Assert
      expect(result).toBe(data);
    });
  });

  describe('with older data', () => {
    const renameTitle: Migration = ({ title, ...rest }) => ({ ...rest, name: title });
    const addTags: Migration = (data) => ({ ...data, tags: [] });
    const migrations = { 1: renameTitle, 2: addTags };

    it('applies one step and sets the new version', () => {
      // Arrange
      const v1 = { schemaVersion: 1, title: 'Friday game' };

      // Act
      const result = migrate(v1, { migrations, target: 2 });

      // Assert
      expect(result).toEqual({ schemaVersion: 2, name: 'Friday game' });
    });

    it('applies several steps in order', () => {
      // Arrange
      const v1 = { schemaVersion: 1, title: 'Friday game' };

      // Act
      const result = migrate(v1, { migrations, target: 3 });

      // Assert
      expect(result).toEqual({ schemaVersion: 3, name: 'Friday game', tags: [] });
    });

    it('starts from the stored version, skipping earlier steps', () => {
      // Arrange
      const first = vi.fn(renameTitle);
      const v2 = { schemaVersion: 2, name: 'Friday game' };

      // Act
      migrate(v2, { migrations: { 1: first, 2: addTags }, target: 3 });

      // Assert
      expect(first).not.toHaveBeenCalled();
    });

    it('does not change the data passed in', () => {
      // Arrange
      const v1 = { schemaVersion: 1, title: 'Friday game' };
      const snapshot = structuredClone(v1);

      // Act
      migrate(v1, { migrations, target: 3 });

      // Assert
      expect(v1).toEqual(snapshot);
    });

    it('rejects a gap in the migration steps', () => {
      // Arrange
      const v1 = { schemaVersion: 1, title: 'Friday game' };
      const withGap = { 1: renameTitle };

      // Act
      const act = () => migrate(v1, { migrations: withGap, target: 3 });

      // Assert
      expect(act).toThrow('No migration from schema v2.');
    });
  });

  describe('rejects', () => {
    it('data from a newer version of the app', () => {
      // Arrange
      const future = { schemaVersion: CURRENT_SCHEMA_VERSION + 1 };

      // Act
      const act = () => migrate(future);

      // Assert
      expect(act).toThrow('newer version of the app');
    });

    it('data with no schema version', () => {
      // Arrange
      const unversioned = { id: 'g1' };

      // Act
      const act = () => migrate(unversioned);

      // Assert
      expect(act).toThrow(SchemaError);
    });

    it('a schema version that is not a whole number', () => {
      // Arrange
      const fractional = { schemaVersion: 1.5 };

      // Act
      const act = () => migrate(fractional);

      // Assert
      expect(act).toThrow(SchemaError);
    });

    it('a schema version given as text', () => {
      // Arrange
      const text = { schemaVersion: '1' };

      // Act
      const act = () => migrate(text);

      // Assert
      expect(act).toThrow(SchemaError);
    });

    it('something that is not an object', () => {
      // Arrange
      const notAnObject = 'game';

      // Act
      const act = () => migrate(notAnObject);

      // Assert
      expect(act).toThrow(SchemaError);
    });
  });
});
