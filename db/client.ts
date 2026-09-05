import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns a singleton SQLite database connection.
 * Opens `medos.db` on first call.
 */
export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    const connection = SQLite.openDatabaseSync('medos.db');
    try {
      // Connection-local setting; enable before any transaction or migration.
      connection.execSync('PRAGMA foreign_keys = ON');
      if (connection.getFirstSync<{ foreign_keys: number }>('PRAGMA foreign_keys')?.foreign_keys !== 1) {
        throw new Error('SQLite foreign-key enforcement could not be enabled.');
      }
      _db = connection;
    } catch (error) {
      connection.closeSync();
      throw error;
    }
  }
  return _db;
}
