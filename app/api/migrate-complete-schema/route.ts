import { sql } from "@/lib/db-config";
import { appDb } from "@/lib/db";

/**
 * CRITICAL: Complete Production Database Schema Migration
 *
 * This endpoint safely adds all missing columns and tables to the production database.
 * It follows the bulletproof migration process and is idempotent.
 *
 * Missing items identified:
 * - task.addedtoactiveat column
 * - partnership table (usera, userb, createdat)
 * - invite table (code, inviterid, inviteeemail, status, expiresat, createdat, acceptedat)
 */

export async function POST() {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const results: string[] = [];
    const errors: string[] = [];

    console.log(
      `🚀 Starting schema completion migration in ${isProduction ? "production" : "development"}`
    );

    if (isProduction) {
      // PRODUCTION: PostgreSQL migrations
      console.log("📊 Running PostgreSQL schema completion...");

      // 1. Add missing addedtoactiveat column to task table
      try {
        const hasAddedToActiveAt = await sql`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'task' AND column_name = 'addedtoactiveat'
        `;

        if (hasAddedToActiveAt.rows.length === 0) {
          await sql`ALTER TABLE "task" ADD COLUMN "addedtoactiveat" TIMESTAMP WITH TIME ZONE NULL`;
          await sql`CREATE INDEX IF NOT EXISTS "idx_task_addedtoactiveat" ON "task"("addedtoactiveat")`;
          results.push("Added addedtoactiveat column and index to task table");
        } else {
          results.push("addedtoactiveat column already exists in task table");
        }
      } catch (error) {
        errors.push(
          `Failed to add addedtoactiveat column: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // 2. Create partnership table if it doesn't exist
      try {
        const hasPartnershipTable = await sql`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name = 'partnership'
        `;

        if (hasPartnershipTable.rows.length === 0) {
          await sql`CREATE TABLE "partnership" (
            "id" TEXT PRIMARY KEY,
            "usera" TEXT NOT NULL UNIQUE,
            "userb" TEXT NOT NULL UNIQUE,
            "createdat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CHECK ("usera" <> "userb")
          )`;
          results.push("Created partnership table");
        } else {
          results.push("partnership table already exists");
        }

        // Add indexes for partnership table
        try {
          await sql`CREATE INDEX IF NOT EXISTS "idx_partnership_usera" ON "partnership"("usera")`;
          await sql`CREATE INDEX IF NOT EXISTS "idx_partnership_userb" ON "partnership"("userb")`;
          results.push("Created partnership table indexes");
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            results.push("Partnership table indexes already exist");
          } else {
            errors.push(
              `Failed to create partnership indexes: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      } catch (error) {
        errors.push(
          `Failed to create partnership table: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // 3. Create invite table if it doesn't exist
      try {
        const hasInviteTable = await sql`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name = 'invite'
        `;

        if (hasInviteTable.rows.length === 0) {
          await sql`CREATE TABLE "invite" (
            "id" TEXT PRIMARY KEY,
            "code" TEXT NOT NULL UNIQUE,
            "inviterid" TEXT NOT NULL,
            "inviteeemail" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'expired')),
            "expiresat" TIMESTAMP WITH TIME ZONE NOT NULL,
            "createdat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "acceptedat" TIMESTAMP WITH TIME ZONE NULL
          )`;
          results.push("Created invite table");
        } else {
          results.push("invite table already exists");
        }

        // Add indexes for invite table
        try {
          await sql`CREATE INDEX IF NOT EXISTS "idx_invite_code" ON "invite"("code")`;
          await sql`CREATE INDEX IF NOT EXISTS "idx_invite_inviterid" ON "invite"("inviterid")`;
          await sql`CREATE INDEX IF NOT EXISTS "idx_invite_inviteeemail" ON "invite"("inviteeemail")`;
          await sql`CREATE INDEX IF NOT EXISTS "idx_invite_status" ON "invite"("status")`;
          await sql`CREATE INDEX IF NOT EXISTS "idx_invite_expiresat" ON "invite"("expiresat")`;
          results.push("Created invite table indexes");
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            results.push("Invite table indexes already exist");
          } else {
            errors.push(
              `Failed to create invite indexes: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      } catch (error) {
        errors.push(
          `Failed to create invite table: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // 4. Final validation - check all required tables and columns
      try {
        const taskColumns = await sql`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'task'
          ORDER BY column_name
        `;

        const partnershipExists = await sql`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_name = 'partnership'
        `;

        const inviteExists = await sql`
          SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_name = 'invite'
        `;

        const requiredTaskColumns = [
          "id",
          "userid",
          "title",
          "iscompleted",
          "createdat",
          "completedat",
          "isactive",
          "addedtoactiveat",
          "sort_order",
        ];
        const existingTaskColumns = taskColumns.rows.map(
          (row) => row.column_name
        );

        const missingTaskColumns = requiredTaskColumns.filter(
          (col) => !existingTaskColumns.includes(col)
        );

        if (missingTaskColumns.length > 0) {
          errors.push(
            `Missing task table columns: ${missingTaskColumns.join(", ")}`
          );
        } else {
          results.push(
            `Task table validation passed: ${existingTaskColumns.length} columns present`
          );
        }

        if (partnershipExists.rows[0].count === 0) {
          errors.push("partnership table is missing");
        } else {
          results.push("partnership table validation passed");
        }

        if (inviteExists.rows[0].count === 0) {
          errors.push("invite table is missing");
        } else {
          results.push("invite table validation passed");
        }
      } catch (error) {
        errors.push(
          `Schema validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      // DEVELOPMENT: SQLite migrations
      console.log("📊 Running SQLite schema completion...");

      try {
        // Check and add missing columns to task table
        const taskColumns = appDb
          .prepare("PRAGMA table_info(task)")
          .all() as Array<{ name: string }>;
        const existingTaskColumns = taskColumns.map((col) => col.name);

        if (!existingTaskColumns.includes("addedToActiveAt")) {
          appDb.exec(`ALTER TABLE task ADD COLUMN addedToActiveAt TEXT NULL`);
          appDb.exec(
            `CREATE INDEX IF NOT EXISTS idx_task_addedToActiveAt ON task(userId, addedToActiveAt)`
          );
          results.push("Added addedToActiveAt column to task table");
        } else {
          results.push("addedToActiveAt column already exists in task table");
        }

        // Check partnership table
        try {
          appDb.exec(`
            CREATE TABLE IF NOT EXISTS partnership (
              id TEXT PRIMARY KEY,
              userA TEXT NOT NULL UNIQUE,
              userB TEXT NOT NULL UNIQUE,
              createdAt TEXT NOT NULL DEFAULT (datetime('now')),
              CHECK (userA <> userB)
            )
          `);
          appDb.exec(
            `CREATE INDEX IF NOT EXISTS idx_partnership_userA ON partnership(userA)`
          );
          appDb.exec(
            `CREATE INDEX IF NOT EXISTS idx_partnership_userB ON partnership(userB)`
          );
          results.push("Ensured partnership table and indexes exist");
        } catch (error) {
          results.push(
            `Partnership table setup: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }

        // Check invite table
        try {
          appDb.exec(`
            CREATE TABLE IF NOT EXISTS invite (
              id TEXT PRIMARY KEY,
              code TEXT NOT NULL UNIQUE,
              inviterId TEXT NOT NULL,
              inviteeEmail TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
              expiresAt TEXT NOT NULL,
              createdAt TEXT NOT NULL DEFAULT (datetime('now')),
              acceptedAt TEXT NULL
            )
          `);
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
          results.push("Ensured invite table and indexes exist");
        } catch (error) {
          results.push(
            `Invite table setup: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      } catch (error) {
        errors.push(
          `SQLite migration failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Final status report
    if (errors.length > 0) {
      console.error(
        "❌ Schema completion migration completed with errors:",
        errors
      );
      return Response.json(
        {
          success: false,
          environment: isProduction ? "PostgreSQL" : "SQLite",
          errors,
          results,
          message:
            "Schema completion completed with errors - manual intervention required",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    console.log("✅ Schema completion migration completed successfully");
    return Response.json({
      success: true,
      environment: isProduction ? "PostgreSQL" : "SQLite",
      results,
      message: "Production database schema completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("🚨 Schema completion migration failed:", error);
    return Response.json(
      {
        success: false,
        error: "Schema completion migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
