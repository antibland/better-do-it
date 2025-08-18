import { sql } from '@vercel/postgres';
import Database from 'better-sqlite3';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Database interface for consistent API
export interface DatabaseInterface {
  exec(query: string): void | Promise<void>;
  prepare(query: string): any;
  close(): void;
}

// SQLite wrapper for development
class SQLiteWrapper implements DatabaseInterface {
  private db: Database.Database;

  constructor() {
    this.db = new Database('./sqlite.db');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  exec(query: string) {
    this.db.exec(query);
  }

  prepare(query: string) {
    return this.db.prepare(query);
  }

  close() {
    this.db.close();
  }
}

// PostgreSQL wrapper for production
class PostgresWrapper implements DatabaseInterface {
  async exec(query: string) {
    // For schema initialization, we'll handle this differently
    console.log('Postgres exec:', query);
  }

  prepare(query: string) {
    return {
      all: (...params: any[]) => sql.query(query, params),
      get: (...params: any[]) => sql.query(query, params).then(result => result.rows[0]),
      run: (...params: any[]) => sql.query(query, params)
    };
  }

  close() {
    // Postgres connection is managed by Vercel
  }
}

// Export the appropriate database instance
export const db: DatabaseInterface = isProduction 
  ? new PostgresWrapper()
  : new SQLiteWrapper();

// Helper function to get database type
export const getDbType = () => isProduction ? 'postgres' : 'sqlite';

// Export sql for direct use when needed
export { sql };
