import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb } from "@/lib/db";

/**
 * Fix sort orders endpoint
 * - POST: Rebalance all sort orders to use integer-based ordering with proper gaps
 * - This fixes any precision issues or corrupted sort orders
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

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";

    console.log(
      `Fix Sort Orders API: Processing request for user ${userId} in ${
        isProduction ? "production" : "development"
      }`
    );

    if (isProduction) {
      // PostgreSQL implementation for production
      await sql`BEGIN`;

      try {
        // Fix active tasks sort orders
        const activeTasksResult = await sql`
          SELECT id, sort_order
          FROM task
          WHERE userid = ${userId} AND isactive = 1 AND iscompleted = 0
          ORDER BY sort_order ASC
        `;
        const activeTasks = activeTasksResult.rows || [];

        // Rebalance active tasks with gaps of 1000
        for (let i = 0; i < activeTasks.length; i++) {
          const newSortOrder = (i + 1) * 1000;
          await sql`
            UPDATE task
            SET sort_order = ${newSortOrder}
            WHERE id = ${activeTasks[i].id} AND userid = ${userId}
          `;
        }

        // Fix master tasks sort orders
        const masterTasksResult = await sql`
          SELECT id, sort_order
          FROM task
          WHERE userid = ${userId} AND isactive = 0 AND iscompleted = 0
          ORDER BY sort_order ASC
        `;
        const masterTasks = masterTasksResult.rows || [];

        // Rebalance master tasks with gaps of 1000
        for (let i = 0; i < masterTasks.length; i++) {
          const newSortOrder = (i + 1) * 1000;
          await sql`
            UPDATE task
            SET sort_order = ${newSortOrder}
            WHERE id = ${masterTasks[i].id} AND userid = ${userId}
          `;
        }

        await sql`COMMIT`;
        console.log(
          `Fix Sort Orders API: Successfully rebalanced sort orders for user ${userId} - ${activeTasks.length} active tasks, ${masterTasks.length} master tasks`
        );
        return Response.json({
          success: true,
          activeTasksFixed: activeTasks.length,
          masterTasksFixed: masterTasks.length,
        });
      } catch (error) {
        await sql`ROLLBACK`;
        console.error(
          `Fix Sort Orders API: PostgreSQL error for user ${userId}:`,
          error
        );
        throw error;
      }
    } else {
      // SQLite implementation for development
      try {
        // Fix active tasks sort orders
        const activeTasks = appDb
          .prepare(
            `SELECT id, sortOrder
             FROM task
             WHERE userId = ? AND isActive = 1 AND isCompleted = 0
             ORDER BY sortOrder ASC`
          )
          .all(userId) as Array<{ id: string; sortOrder: number }>;

        // Rebalance active tasks with gaps of 1000
        for (let i = 0; i < activeTasks.length; i++) {
          const newSortOrder = (i + 1) * 1000;
          appDb
            .prepare(
              `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
            )
            .run(newSortOrder, activeTasks[i].id, userId);
        }

        // Fix master tasks sort orders
        const masterTasks = appDb
          .prepare(
            `SELECT id, sortOrder
             FROM task
             WHERE userId = ? AND isActive = 0 AND isCompleted = 0
             ORDER BY sortOrder ASC`
          )
          .all(userId) as Array<{ id: string; sortOrder: number }>;

        // Rebalance master tasks with gaps of 1000
        for (let i = 0; i < masterTasks.length; i++) {
          const newSortOrder = (i + 1) * 1000;
          appDb
            .prepare(
              `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
            )
            .run(newSortOrder, masterTasks[i].id, userId);
        }

        console.log(
          `Fix Sort Orders API: Successfully rebalanced sort orders for user ${userId} (SQLite) - ${activeTasks.length} active tasks, ${masterTasks.length} master tasks`
        );
        return Response.json({
          success: true,
          activeTasksFixed: activeTasks.length,
          masterTasksFixed: masterTasks.length,
        });
      } catch (error) {
        console.error(
          `Fix Sort Orders API: SQLite error for user ${userId}:`,
          error
        );
        return Response.json(
          {
            error: "SQLite fix sort orders failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Fix Sort Orders API error:", error);
    return Response.json(
      {
        error: "Fix sort orders failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
