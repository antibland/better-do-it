import { db, getDbType, sql } from "./db-config";
import { Task } from "@/types";

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
        userid TEXT NOT NULL,
        title TEXT NOT NULL,
        iscompleted INTEGER NOT NULL DEFAULT 0 CHECK (iscompleted IN (0,1)),
        createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completedat TIMESTAMP WITH TIME ZONE NULL,
        isactive INTEGER DEFAULT 0,
        addedtoactiveat TIMESTAMP WITH TIME ZONE NULL
      )`;
    } catch (error) {
      console.log("Task table creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_user_iscompleted ON task(userid, iscompleted)`;
    } catch (error) {
      console.log("Task index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_completedat ON task(completedat)`;
    } catch (error) {
      console.log("Task completedat index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_user_isactive ON task(userid, isactive)`;
    } catch (error) {
      console.log("Task isactive index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_task_addedtoactiveat ON task(addedtoactiveat)`;
    } catch (error) {
      console.log("Task addedtoactiveat index creation:", error);
    }

    try {
      await sql`CREATE TABLE IF NOT EXISTS partnership (
        id TEXT PRIMARY KEY,
        usera TEXT NOT NULL UNIQUE,
        userb TEXT NOT NULL UNIQUE,
        createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CHECK (usera <> userb)
      )`;
    } catch (error) {
      console.log("Partnership table creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_partnership_usera ON partnership(usera)`;
    } catch (error) {
      console.log("Partnership usera index creation:", error);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_partnership_userb ON partnership(userb)`;
    } catch (error) {
      console.log("Partnership userb index creation:", error);
    }
  }
}

// Initialize schema on module load
initializeSchema().catch(console.error);

// Re-export Task type for backward compatibility
export type TaskRow = Task;

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
