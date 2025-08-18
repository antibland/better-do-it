import { db, getDbType, sql } from "./db-config";

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

  if (dbType === "sqlite") {
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
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0,1)),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE NULL,
        is_active INTEGER DEFAULT 0,
        added_to_active_at TIMESTAMP WITH TIME ZONE NULL
      )`;
    } catch (error) {
      console.log("Task table creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_user_is_completed ON task(user_id, is_completed)`;
    } catch (error) {
      console.log("Task index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_completed_at ON task(completed_at)`;
    } catch (error) {
      console.log("Task completed_at index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_user_is_active ON task(user_id, is_active)`;
    } catch (error) {
      console.log("Task is_active index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_added_to_active_at ON task(added_to_active_at)`;
    } catch (error) {
      console.log("Task added_to_active_at index creation:", error);
    }

    try {
      await sql`CREATE TABLE IF NOT EXISTS partnership (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL UNIQUE,
        user_b TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CHECK (user_a <> user_b)
      )`;
    } catch (error) {
      console.log("Partnership table creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_partnership_user_a ON partnership(user_a)`;
    } catch (error) {
      console.log("Partnership user_a index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_partnership_user_b ON partnership(user_b)`;
    } catch (error) {
      console.log("Partnership user_b index creation:", error);
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
