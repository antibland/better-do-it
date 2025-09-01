import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb } from "@/lib/db";

/**
 * Safe migration endpoint for adding sort_order column
 * Handles both PostgreSQL (production) and SQLite (development)
 * Avoids data loss by checking existing state first
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const results: string[] = [];

    if (isProduction) {
      // PostgreSQL migration
      try {
        // Check if sort_order column already exists
        const checkColumn = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'task' AND column_name = 'sort_order'
        `;

        if (checkColumn.rows.length === 0) {
          // Column doesn't exist, add it safely
          await sql`ALTER TABLE "task" ADD COLUMN "sort_order" INTEGER DEFAULT 0`;
          await sql`ALTER TABLE "task" ALTER COLUMN "sort_order" SET NOT NULL`;
          results.push("Added sort_order column to PostgreSQL");
        } else {
          results.push("sort_order column already exists in PostgreSQL");
        }

        // Update existing tasks to have proper sort_order based on creation time
        const updateResult = await sql`
          UPDATE "task" 
          SET "sort_order" = (
            SELECT COUNT(*) 
            FROM "task" t2 
            WHERE t2."userid" = "task"."userid" 
            AND t2."createdat" <= "task"."createdat"
            AND t2."id" <= "task"."id"
          )
          WHERE "sort_order" = 0
        `;

        if (updateResult.rowCount > 0) {
          results.push(
            `Updated ${updateResult.rowCount} tasks with sort_order in PostgreSQL`
          );
        } else {
          results.push("All tasks already have sort_order in PostgreSQL");
        }

        // Create index if it doesn't exist
        try {
          await sql`CREATE INDEX "idx_task_user_sort_order" ON "task"("userid", "sort_order")`;
          results.push("Created sort_order index in PostgreSQL");
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            results.push("sort_order index already exists in PostgreSQL");
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("PostgreSQL migration error:", error);
        return Response.json(
          {
            error: "PostgreSQL migration failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    } else {
      // SQLite migration
      try {
        // Check if sortOrder column already exists
        const checkColumn = appDb
          .prepare("PRAGMA table_info(task)")
          .all() as Array<{ name: string; type: string }>;

        const hasSortOrder = checkColumn.some(
          (col) => col.name === "sortOrder"
        );

        if (!hasSortOrder) {
          // Column doesn't exist, add it safely
          appDb
            .prepare(
              "ALTER TABLE task ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0"
            )
            .run();
          results.push("Added sortOrder column to SQLite");
        } else {
          results.push("sortOrder column already exists in SQLite");
        }

        // Update existing tasks to have proper sortOrder based on creation time
        const updateResult = appDb
          .prepare(
            `
            UPDATE task 
            SET sortOrder = (
              SELECT COUNT(*) 
              FROM task t2 
              WHERE t2.userId = task.userId 
              AND t2.createdAt <= task.createdAt
              AND t2.id <= task.id
            )
            WHERE sortOrder = 0
          `
          )
          .run();

        if (updateResult.changes > 0) {
          results.push(
            `Updated ${updateResult.changes} tasks with sortOrder in SQLite`
          );
        } else {
          results.push("All tasks already have sortOrder in SQLite");
        }

        // Create index if it doesn't exist
        try {
          appDb
            .prepare(
              "CREATE INDEX idx_task_user_sort_order ON task(userId, sortOrder)"
            )
            .run();
          results.push("Created sortOrder index in SQLite");
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("already exists")
          ) {
            results.push("sortOrder index already exists in SQLite");
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("SQLite migration error:", error);
        return Response.json(
          {
            error: "SQLite migration failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    return Response.json({
      success: true,
      environment: isProduction ? "PostgreSQL" : "SQLite",
      results,
      message: "Migration completed successfully",
    });
  } catch (error) {
    console.error("Migration API error:", error);
    return Response.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
