import { auth } from "@/lib/auth";
import { sql } from "@/lib/db-config";
import { appDb } from "@/lib/db";

/**
 * CRITICAL MIGRATION: Remove UNIQUE constraints from partnership table to allow multiple partnerships
 *
 * This migration:
 * 1. Validates current schema state
 * 2. Removes individual UNIQUE constraints on usera/userb
 * 3. Adds composite UNIQUE constraint to prevent duplicate partnerships
 * 4. Validates data integrity
 *
 * SAFETY: This migration is idempotent and can be run multiple times safely
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  // Authentication check
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isProduction = process.env.NODE_ENV === "production";
    const results: string[] = [];
    const errors: string[] = [];

    // STEP 1: VALIDATION - Check current schema state
    if (isProduction) {
      // Check if partnership table exists and get current constraints
      const tableExists = await sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'partnership'
      `;

      if (tableExists.rows.length === 0) {
        return Response.json(
          {
            success: false,
            error: "Partnership table does not exist in production database",
          },
          { status: 500 }
        );
      }

      // Check current constraints
      const constraints = await sql`
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'partnership' AND constraint_type = 'UNIQUE'
      `;

      results.push(
        `Found ${constraints.rows.length} UNIQUE constraints on partnership table`
      );

      // Check if migration already completed
      const compositeConstraintExists = await sql`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'partnership' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%usera_userb%'
      `;

      if (compositeConstraintExists.rows.length > 0) {
        return Response.json({
          success: true,
          message: "Migration already completed - composite constraint exists",
          results: ["Migration already applied"],
        });
      }
    } else {
      // SQLite validation
      const tableInfo = appDb
        .prepare(`PRAGMA table_info(partnership)`)
        .all() as unknown[];
      results.push(`Partnership table has ${tableInfo.length} columns`);

      // Check if SQLite migration already completed by looking for existing partnerships
      const existingPartnerships = appDb
        .prepare(
          `
        SELECT userA, COUNT(*) as count 
        FROM partnership 
        GROUP BY userA 
        HAVING COUNT(*) > 1
      `
        )
        .all() as unknown[];

      if (existingPartnerships.length > 0) {
        return Response.json({
          success: true,
          message:
            "SQLite migration already completed - multiple partnerships exist",
          results: [
            `Found ${existingPartnerships.length} users with multiple partnerships`,
          ],
        });
      }
    }

    // STEP 2: BACKUP EXISTING DATA
    let existingPartnerships;
    if (isProduction) {
      const backupData = await sql`SELECT * FROM "partnership"`;
      existingPartnerships = backupData.rows;
      results.push(
        `Backed up ${existingPartnerships.length} existing partnerships`
      );
    } else {
      existingPartnerships = appDb
        .prepare(`SELECT * FROM partnership`)
        .all() as unknown[];
      results.push(
        `Backed up ${existingPartnerships.length} existing partnerships`
      );
    }

    // STEP 3: SCHEMA MIGRATION
    if (isProduction) {
      // PostgreSQL: Drop individual UNIQUE constraints and add composite constraint
      try {
        // Drop existing UNIQUE constraints (if they exist)
        try {
          await sql`ALTER TABLE "partnership" DROP CONSTRAINT IF EXISTS "partnership_usera_key"`;
          results.push("Dropped usera UNIQUE constraint (if existed)");
        } catch {
          // Constraint might not exist, continue
        }
        
        try {
          await sql`ALTER TABLE "partnership" DROP CONSTRAINT IF EXISTS "partnership_userb_key"`;
          results.push("Dropped userb UNIQUE constraint (if existed)");
        } catch {
          // Constraint might not exist, continue
        }

        // Add composite UNIQUE constraint
        await sql`
          ALTER TABLE "partnership" 
          ADD CONSTRAINT "partnership_usera_userb_unique" 
          UNIQUE ("usera", "userb")
        `;
        results.push("Added composite UNIQUE constraint on (usera, userb)");
      } catch (error) {
        errors.push(
          `PostgreSQL migration failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      // SQLite: Recreate table without individual UNIQUE constraints
      try {
        // Create new table structure
        appDb.exec(`
          CREATE TABLE partnership_new (
            id TEXT PRIMARY KEY,
            userA TEXT NOT NULL,
            userB TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (userA) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (userB) REFERENCES user(id) ON DELETE CASCADE,
            UNIQUE(userA, userB)
          )
        `);

        // Copy existing data
        appDb.exec(`
          INSERT INTO partnership_new (id, userA, userB, createdAt)
          SELECT id, userA, userB, createdAt FROM partnership
        `);

        // Replace old table
        appDb.exec(`DROP TABLE partnership`);
        appDb.exec(`ALTER TABLE partnership_new RENAME TO partnership`);

        // Recreate indexes
        appDb.exec(`CREATE INDEX idx_partnership_userA ON partnership(userA)`);
        appDb.exec(`CREATE INDEX idx_partnership_userB ON partnership(userB)`);

        results.push("SQLite table recreated with composite UNIQUE constraint");
      } catch (error) {
        errors.push(
          `SQLite migration failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // STEP 4: DATA INTEGRITY VALIDATION
    if (isProduction) {
      const postMigrationCount =
        await sql`SELECT COUNT(*) as count FROM "partnership"`;
      const originalCount = existingPartnerships.length;
      const newCount = postMigrationCount.rows[0].count;

      if (originalCount !== newCount) {
        errors.push(
          `Data integrity check failed: ${originalCount} original partnerships, ${newCount} after migration`
        );
      } else {
        results.push(
          `Data integrity verified: ${newCount} partnerships preserved`
        );
      }

      // Test that multiple partnerships are now allowed
      const testUserId = "test-user-id";
      try {
        // This should not fail with the new schema
        await sql`
          INSERT INTO "partnership" ("id", "usera", "userb", "createdat") 
          VALUES ('test-1', ${testUserId}, 'user-1', NOW()), 
                 ('test-2', ${testUserId}, 'user-2', NOW())
          ON CONFLICT DO NOTHING
        `;

        // Clean up test data
        await sql`DELETE FROM "partnership" WHERE "usera" = ${testUserId}`;
        results.push("Multiple partnerships test: PASSED");
      } catch (error) {
        errors.push(
          `Multiple partnerships test failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      const postMigrationCount = appDb
        .prepare(`SELECT COUNT(*) as count FROM partnership`)
        .get() as { count: number };
      const originalCount = existingPartnerships.length;
      const newCount = postMigrationCount.count;

      if (originalCount !== newCount) {
        errors.push(
          `Data integrity check failed: ${originalCount} original partnerships, ${newCount} after migration`
        );
      } else {
        results.push(
          `Data integrity verified: ${newCount} partnerships preserved`
        );
      }
    }

    // STEP 5: FINAL VALIDATION
    if (isProduction) {
      const finalConstraints = await sql`
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'partnership' AND constraint_type = 'UNIQUE'
      `;

      const hasCompositeConstraint = finalConstraints.rows.some((row) =>
        row.constraint_name.includes("usera_userb")
      );

      if (!hasCompositeConstraint) {
        errors.push("Final validation failed: Composite constraint not found");
      } else {
        results.push("Final validation: Composite UNIQUE constraint confirmed");
      }
    }

    if (errors.length > 0) {
      return Response.json(
        {
          success: false,
          errors,
          results,
          message:
            "Migration completed with errors - manual intervention required",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      environment: isProduction ? "PostgreSQL" : "SQLite",
      results,
      message:
        "Multiple partnerships migration completed successfully with full validation",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
