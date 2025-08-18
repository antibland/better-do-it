import { sql } from "@vercel/postgres";
import Database from "better-sqlite3";

// Environment detection
const isProduction = process.env.NODE_ENV === "production";

// Database operation interfaces
export interface DatabaseRow {
  [key: string]: unknown;
}

export interface DatabaseResult {
  rows?: DatabaseRow[];
  rowCount?: number | null;
}

export interface PreparedStatement {
  all: (...params: unknown[]) => DatabaseRow[] | Promise<DatabaseResult>;
  get: (...params: unknown[]) => DatabaseRow | Promise<DatabaseResult>;
  run: (...params: unknown[]) => DatabaseResult | Promise<DatabaseResult>;
}

// Database interface for consistent API
export interface DatabaseInterface {
  exec(query: string): void | Promise<void>;
  prepare(query: string): PreparedStatement;
  close(): void;
}

// SQLite wrapper for development
class SQLiteWrapper implements DatabaseInterface {
  private db: Database.Database;

  constructor() {
    this.db = new Database("./sqlite.db");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  exec(query: string) {
    this.db.exec(query);
  }

  prepare(query: string): PreparedStatement {
    const stmt = this.db.prepare(query);
    return {
      all: (...params: unknown[]) => stmt.all(...params) as DatabaseRow[],
      get: (...params: unknown[]) => stmt.get(...params) as DatabaseRow,
      run: (...params: unknown[]) => stmt.run(...params) as DatabaseResult,
    };
  }

  close() {
    this.db.close();
  }
}

// PostgreSQL wrapper for production
class PostgresWrapper implements DatabaseInterface {
  async exec(query: string) {
    // For schema initialization, we'll handle this differently
    console.log("Postgres exec:", query);
  }

  prepare(query: string): PreparedStatement {
    return {
      all: (...params: unknown[]) => sql.query(query, params),
      get: (...params: unknown[]) =>
        sql.query(query, params).then((result) => result.rows[0]),
      run: (...params: unknown[]) => sql.query(query, params),
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
export const getDbType = () => (isProduction ? "postgres" : "sqlite");

// Export sql for direct use when needed
export { sql };
