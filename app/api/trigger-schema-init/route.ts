import { sql } from "@/lib/db-config";
import { appDb } from "@/lib/db";

/**
 * Manual Schema Initialization Trigger
 *
 * This endpoint manually triggers the schema initialization to ensure
 * all required tables and columns exist in both development and production.
 *
 * It's safe to call multiple times as it uses CREATE TABLE IF NOT EXISTS.
 */

export async function POST() {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const results: string[] = [];
    const errors: string[] = [];

    console.log(
      `🚀 Manually triggering schema initialization in ${isProduction ? "production" : "development"}`
    );

    if (isProduction) {
      // PRODUCTION: PostgreSQL schema initialization
      try {
        // Task table
        await sql`CREATE TABLE IF NOT EXISTS task (
          id TEXT PRIMARY KEY,
          userid TEXT NOT NULL,
          title TEXT NOT NULL,
          iscompleted INTEGER NOT NULL DEFAULT 0 CHECK (iscompleted IN (0,1)),
          createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completedat TIMESTAMP WITH TIME ZONE NULL,
          isactive INTEGER DEFAULT 0,
          addedtoactiveat TIMESTAMP WITH TIME ZONE NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        )`;
        results.push("Ensured task table exists");

        // Task indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_task_user_iscompleted ON task(userid, iscompleted)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_task_completedat ON task(completedat)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_task_user_isactive ON task(userid, isactive)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_task_addedtoactiveat ON task(addedtoactiveat)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_task_user_sort_order ON task(userid, sort_order)`;
        results.push("Ensured task table indexes exist");

        // Partnership table
        await sql`CREATE TABLE IF NOT EXISTS partnership (
          id TEXT PRIMARY KEY,
          usera TEXT NOT NULL UNIQUE,
          userb TEXT NOT NULL UNIQUE,
          createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CHECK (usera <> userb)
        )`;
        results.push("Ensured partnership table exists");

        // Partnership indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_partnership_usera ON partnership(usera)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_partnership_userb ON partnership(userb)`;
        results.push("Ensured partnership table indexes exist");

        // Invite table
        await sql`CREATE TABLE IF NOT EXISTS invite (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          inviterid TEXT NOT NULL,
          inviteeemail TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
          expiresat TIMESTAMP WITH TIME ZONE NOT NULL,
          createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          acceptedat TIMESTAMP WITH TIME ZONE NULL
        )`;
        results.push("Ensured invite table exists");

        // Invite indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_invite_code ON invite(code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_invite_inviterid ON invite(inviterid)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_invite_inviteeemail ON invite(inviteeemail)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_invite_status ON invite(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_invite_expiresat ON invite(expiresat)`;
        results.push("Ensured invite table indexes exist");
      } catch (error) {
        errors.push(
          `PostgreSQL schema initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      // DEVELOPMENT: SQLite schema initialization
      try {
        // Task table
        appDb.exec(`
          CREATE TABLE IF NOT EXISTS task (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            title TEXT NOT NULL,
            isCompleted INTEGER NOT NULL DEFAULT 0 CHECK (isCompleted IN (0,1)),
            isActive INTEGER DEFAULT 0,
            sortOrder INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            completedAt TEXT NULL,
            addedToActiveAt TEXT NULL,
            FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
          )
        `);
        results.push("Ensured task table exists");

        // Task indexes
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_user_isCompleted ON task(userId, isCompleted)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_completedAt ON task(completedAt)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_user_isActive ON task(userId, isActive)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_addedToActiveAt ON task(userId, addedToActiveAt)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_task_user_sortOrder ON task(userId, sortOrder)`
        );
        results.push("Ensured task table indexes exist");

        // Partnership table
        appDb.exec(`
          CREATE TABLE IF NOT EXISTS partnership (
            id TEXT PRIMARY KEY,
            userA TEXT NOT NULL UNIQUE,
            userB TEXT NOT NULL UNIQUE,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            CHECK (userA <> userB),
            FOREIGN KEY (userA) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (userB) REFERENCES user(id) ON DELETE CASCADE
          )
        `);
        results.push("Ensured partnership table exists");

        // Partnership indexes
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_partnership_userA ON partnership(userA)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_partnership_userB ON partnership(userB)`
        );
        results.push("Ensured partnership table indexes exist");

        // Invite table
        appDb.exec(`
          CREATE TABLE IF NOT EXISTS invite (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            inviterId TEXT NOT NULL,
            inviteeEmail TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
            expiresAt TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            acceptedAt TEXT NULL,
            FOREIGN KEY (inviterId) REFERENCES user(id) ON DELETE CASCADE
          )
        `);
        results.push("Ensured invite table exists");

        // Invite indexes
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_invite_code ON invite(code)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_invite_inviterId ON invite(inviterId)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_invite_inviteeEmail ON invite(inviteeEmail)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_invite_status ON invite(status)`
        );
        appDb.exec(
          `CREATE INDEX IF NOT EXISTS idx_invite_expiresAt ON invite(expiresAt)`
        );
        results.push("Ensured invite table indexes exist");
      } catch (error) {
        errors.push(
          `SQLite schema initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Final validation
    if (errors.length > 0) {
      console.error("❌ Schema initialization completed with errors:", errors);
      return Response.json(
        {
          success: false,
          environment: isProduction ? "PostgreSQL" : "SQLite",
          errors,
          results,
          message: "Schema initialization completed with errors",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    console.log("✅ Schema initialization completed successfully");
    return Response.json({
      success: true,
      environment: isProduction ? "PostgreSQL" : "SQLite",
      results,
      message: "Schema initialization completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("🚨 Schema initialization failed:", error);
    return Response.json(
      {
        success: false,
        error: "Schema initialization failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
