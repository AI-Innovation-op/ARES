import * as sqlite from 'node:sqlite';

/** Node 26 renamed DatabaseSync; keep Node 24 support without a deprecated constructor. */
export function openDatabase(
  file: string,
  options: sqlite.DatabaseSyncOptions = {},
): sqlite.DatabaseSync {
  const constructors = sqlite as typeof sqlite & { Database?: typeof sqlite.DatabaseSync };
  const Database = constructors.Database ?? sqlite.DatabaseSync;
  return new Database(file, options);
}
