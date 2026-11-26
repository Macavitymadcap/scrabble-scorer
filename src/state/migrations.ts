import { SchemaError, isRecord } from './schema.ts';

export const CURRENT_SCHEMA_VERSION = 1;

type Data = Record<string, unknown>;

/** Upgrades stored data by one version. `schemaVersion` is set by `migrate`. */
export type Migration = (data: Data) => Data;

/**
 * Migrations keyed by the version they upgrade FROM. When the schema changes,
 * bump CURRENT_SCHEMA_VERSION and add an entry here, e.g.
 * `1: (data) => ({ ...data, newField: defaultValue })`.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export interface MigrateOptions {
  migrations?: Readonly<Record<number, Migration>>;
  target?: number;
}

/**
 * Brings stored data up to the target schema version, one step at a time.
 * Returns the input unchanged if it's already current. Throws SchemaError if
 * the version is missing, newer than the app, or has no migration path.
 */
export const migrate = (
  data: unknown,
  { migrations = MIGRATIONS, target = CURRENT_SCHEMA_VERSION }: MigrateOptions = {},
): unknown => {
  const from = isRecord(data) ? data.schemaVersion : undefined;
  if (!isRecord(data) || typeof from !== 'number' || !Number.isInteger(from)) {
    throw new SchemaError('Saved data has no schema version.');
  }
  if (from > target) {
    throw new SchemaError(`Saved data is from a newer version of the app (v${from}).`);
  }
  let current = data;
  for (let version = from; version < target; version += 1) {
    const step = migrations[version];
    if (!step) {
      throw new SchemaError(`No migration from schema v${version}.`);
    }
    current = { ...step(current), schemaVersion: version + 1 };
  }
  return current;
};
