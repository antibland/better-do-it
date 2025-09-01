import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb } from "@/lib/db";

/**
 * Task reordering endpoint
 * - POST: reorder tasks based on drag and drop operations
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

    let body: {
      sourceDroppableId: string;
      destinationDroppableId: string;
      sourceIndex: number;
      destinationIndex: number;
      draggableId: string;
    };

    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      sourceDroppableId,
      destinationDroppableId,
      sourceIndex,
      destinationIndex,
      draggableId,
    } = body;

    // Validate required fields
    if (
      !sourceDroppableId ||
      !destinationDroppableId ||
      typeof sourceIndex !== "number" ||
      typeof destinationIndex !== "number" ||
      !draggableId
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (isProduction) {
      // PostgreSQL implementation for production
      await sql`BEGIN`;

      try {
        // Get the task being moved
        const taskResult = await sql`
          SELECT id, isactive
          FROM task
          WHERE id = ${draggableId} AND userid = ${userId}
        `;
        const task = taskResult.rows?.[0];

        if (!task) {
          await sql`ROLLBACK`;
          return Response.json({ error: "Task not found" }, { status: 404 });
        }

        // Handle moving between active tasks and master list
        if (
          sourceDroppableId === "active-tasks" &&
          destinationDroppableId === "master-tasks"
        ) {
          // Move from active to master (deactivate task)
          await sql`
            UPDATE task
            SET isactive = 0, addedtoactiveat = NULL
            WHERE id = ${draggableId} AND userid = ${userId}
          `;
        } else if (
          sourceDroppableId === "master-tasks" &&
          destinationDroppableId === "active-tasks"
        ) {
          // Check if we can add to active (3-task limit)
          const activeCountResult = await sql`
            SELECT COUNT(*) as cnt FROM task WHERE userid = ${userId} AND isactive = 1 AND iscompleted = 0
          `;
          const activeCount = activeCountResult.rows?.[0]?.cnt || 0;

          if (activeCount >= 3) {
            await sql`ROLLBACK`;
            return Response.json(
              { error: "Active task limit reached" },
              { status: 400 }
            );
          }

          // Move from master to active (activate task)
          await sql`
            UPDATE task
            SET isactive = 1, addedtoactiveat = NOW()
            WHERE id = ${draggableId} AND userid = ${userId}
          `;
        }

        await sql`COMMIT`;
        return Response.json({ success: true });
      } catch (error) {
        await sql`ROLLBACK`;
        throw error;
      }
    } else {
      // SQLite implementation for development
      try {
        // Get the task being moved
        const task = appDb
          .prepare(
            `SELECT id, isActive FROM task WHERE id = ? AND userId = ?`
          )
          .get(draggableId, userId) as {
          id: string;
          isActive: number;
        };

        if (!task) {
          return Response.json({ error: "Task not found" }, { status: 404 });
        }

        // Handle moving between active tasks and master list
        if (
          sourceDroppableId === "active-tasks" &&
          destinationDroppableId === "master-tasks"
        ) {
          // Move from active to master (deactivate task)
          appDb
            .prepare(
              `UPDATE task SET isActive = 0, addedToActiveAt = NULL WHERE id = ? AND userId = ?`
            )
            .run(draggableId, userId);
        } else if (
          sourceDroppableId === "master-tasks" &&
          destinationDroppableId === "active-tasks"
        ) {
          // Check if we can add to active (3-task limit)
          const activeCount = appDb
            .prepare(
              `SELECT COUNT(*) as cnt FROM task WHERE userId = ? AND isActive = 1 AND isCompleted = 0`
            )
            .get(userId) as { cnt: number };

          if (activeCount.cnt >= 3) {
            return Response.json(
              { error: "Active task limit reached" },
              { status: 400 }
            );
          }

          // Move from master to active (activate task)
          appDb
            .prepare(
              `UPDATE task SET isActive = 1, addedToActiveAt = datetime('now') WHERE id = ? AND userId = ?`
            )
            .run(draggableId, userId);
        }

        return Response.json({ success: true });
      } catch (error) {
        console.error("SQLite reorder error:", error);
        return Response.json(
          {
            error: "SQLite reorder failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Reorder API error:", error);
    return Response.json(
      {
        error: "Reorder failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
