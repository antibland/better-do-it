import { db, getDbType, sql } from './db-config';

/**
 * Centralized database connection for app-specific data (tasks, partnerships).
 * 
 * Supports both SQLite (development) and PostgreSQL (production).
 * Auth uses its own connection via `lib/auth.ts`.
 */
export const appDb = db;

/**
 * Run idempotent schema initialization. Keep this minimal and well-documented.
 * Tables:
 * - task: per-user tasks with completion metadata
 * - partnership: pairs two users; each user can only be in one partnership at a time
 */
async function initializeSchema(): Promise<void> {
  const dbType = getDbType();
  
  if (dbType === 'sqlite') {
    // SQLite schema initialization
    appDb.exec(`
      CREATE TABLE IF NOT EXISTS task (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        isCompleted INTEGER NOT NULL DEFAULT 0 CHECK (isCompleted IN (0,1)),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        completedAt TEXT NULL,
        FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_user_isCompleted ON task(userId, isCompleted);
      CREATE INDEX IF NOT EXISTS idx_task_completedAt ON task(completedAt);

      CREATE TABLE IF NOT EXISTS partnership (
        id TEXT PRIMARY KEY,
        userA TEXT NOT NULL UNIQUE,
        userB TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK (userA <> userB),
        FOREIGN KEY (userA) REFERENCES user(id) ON DELETE CASCADE,
        FOREIGN KEY (userB) REFERENCES user(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_partnership_userA ON partnership(userA);
      CREATE INDEX IF NOT EXISTS idx_partnership_userB ON partnership(userB);
    `);

    // Check if isActive column exists, if not add it
    try {
      const result = appDb.prepare("PRAGMA table_info(task)").all() as Array<{
        name: string;
      }>;
      const hasIsActive = result.some((col) => col.name === "isActive");

      if (!hasIsActive) {
        appDb.exec(`ALTER TABLE task ADD COLUMN isActive INTEGER DEFAULT 0;`);
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_user_isActive ON task(userId, isActive);`
        );
      }
    } catch (error) {
      console.error("Error checking/adding isActive column:", error);
    }

    // Check if addedToActiveAt column exists, if not add it
    try {
      const result = appDb.prepare("PRAGMA table_info(task)").all() as Array<{
        name: string;
      }>;
      const hasAddedToActiveAt = result.some(
        (col) => col.name === "addedToActiveAt"
      );

      if (!hasAddedToActiveAt) {
        appDb.exec(`ALTER TABLE task ADD COLUMN addedToActiveAt TEXT NULL;`);
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_addedToActiveAt ON task(addedToActiveAt);`
        );
      }
    } catch (error) {
      console.error("Error checking/adding addedToActiveAt column:", error);
    }

    // Migration: Set all existing tasks as active (isActive = 1) to maintain current behavior
    try {
      appDb.exec(`UPDATE task SET isActive = 1 WHERE isActive IS NULL;`);
    } catch (error) {
      console.error("Error updating existing tasks:", error);
    }
  } else {
    // PostgreSQL schema initialization - execute each command separately
    try {
      await sql`CREATE TABLE IF NOT EXISTS task (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        isCompleted INTEGER NOT NULL DEFAULT 0 CHECK (isCompleted IN (0,1)),
        createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completedAt TIMESTAMP WITH TIME ZONE NULL,
        isActive INTEGER DEFAULT 0,
        addedToActiveAt TIMESTAMP WITH TIME ZONE NULL
      )`;
    } catch (error) {
      console.log("Task table creation:", error);
    }
    
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_user_isCompleted ON task(userId, isCompleted)`;
    } catch (error) {
      console.log("Task index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_completedAt ON task(completedAt)`;
    } catch (error) {
      console.log("Task completedAt index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_user_isActive ON task(userId, isActive)`;
    } catch (error) {
      console.log("Task isActive index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_addedToActiveAt ON task(addedToActiveAt)`;
    } catch (error) {
      console.log("Task addedToActiveAt index creation:", error);
    }

    try {
      await sql`CREATE TABLE IF NOT EXISTS partnership (
        id TEXT PRIMARY KEY,
        userA TEXT NOT NULL UNIQUE,
        userB TEXT NOT NULL UNIQUE,
        createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CHECK (userA <> userB)
      )`;
    } catch (error) {
      console.log("Partnership table creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_partnership_userA ON partnership(userA)`;
    } catch (error) {
      console.log("Partnership userA index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_partnership_userB ON partnership(userB)`;
    } catch (error) {
      console.log("Partnership userB index creation:", error);
    }
  }
}

// Initialize schema on module load
initializeSchema().catch(console.error);

// Types representing rows in our app tables
export type TaskRow = {
  id: string;
  userId: string;
  title: string;
  isCompleted: 0 | 1;
  isActive: 0 | 1;
  createdAt: string; // UTC timestamp in SQLite format: YYYY-MM-DD HH:MM:SS
  completedAt: string | null; // UTC timestamp or null
  addedToActiveAt: string | null; // UTC timestamp when task was moved to active list
};

export type PartnershipRow = {
  id: string;
  userA: string;
  userB: string;
  createdAt: string; // UTC timestamp in SQLite format
};

/**
 * Generate a stable unique ID for primary keys.
 * Uses `crypto.randomUUID` when available; falls back to a simple random string otherwise.
 */
export function generateId(): string {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - global crypto may not be typed in some Node contexts
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}
