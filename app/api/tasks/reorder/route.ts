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

    console.log(
      `Reorder API: Processing request for user ${userId} in ${
        isProduction ? "production" : "development"
      }`
    );

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
          SELECT id, sort_order, isactive
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

        // Handle reordering within the same list
        if (sourceDroppableId === destinationDroppableId) {
          // Get all tasks in the list (excluding the moved task) ordered by sort_order
          const listTasksResult = await sql`
            SELECT id, sort_order
            FROM task
            WHERE userid = ${userId} 
              AND isactive = ${sourceDroppableId === "active-tasks" ? 1 : 0}
              AND iscompleted = 0
              AND id != ${draggableId}
            ORDER BY sort_order ASC
          `;
          const listTasks = listTasksResult.rows || [];

          // Calculate new sort order for the moved task
          let newSortOrder: number;

          if (destinationIndex === 0) {
            // Moving to the beginning
            newSortOrder =
              listTasks.length > 0 ? listTasks[0].sort_order - 1 : 0;
          } else if (destinationIndex >= listTasks.length) {
            // Moving to the end
            newSortOrder =
              listTasks.length > 0
                ? listTasks[listTasks.length - 1].sort_order + 1
                : 0;
          } else {
            // Moving to a specific position between two tasks
            const beforeTask = listTasks[destinationIndex - 1];
            const afterTask = listTasks[destinationIndex];
            newSortOrder = Math.floor(
              (beforeTask.sort_order + afterTask.sort_order) / 2
            );
          }

          // Update the moved task's sort order
          await sql`
            UPDATE task
            SET sort_order = ${newSortOrder}
            WHERE id = ${draggableId} AND userid = ${userId}
          `;
        } else {
          // Moving between lists - calculate new sort order based on destination
          if (destinationDroppableId === "active-tasks") {
            // Get active tasks ordered by sort_order (excluding the task being moved)
            const activeTasksResult = await sql`
              SELECT id, sort_order
              FROM task
              WHERE userid = ${userId} AND isactive = 1 AND iscompleted = 0 AND id != ${draggableId}
              ORDER BY sort_order ASC
            `;
            const activeTasks = activeTasksResult.rows || [];

            // Calculate the new sort order based on destination index
            let newSortOrder: number;
            if (destinationIndex === 0) {
              newSortOrder =
                activeTasks.length > 0 ? activeTasks[0].sort_order - 1 : 0;
            } else if (destinationIndex >= activeTasks.length) {
              newSortOrder =
                activeTasks.length > 0
                  ? activeTasks[activeTasks.length - 1].sort_order + 1
                  : 0;
            } else {
              const beforeTask = activeTasks[destinationIndex - 1];
              const afterTask = activeTasks[destinationIndex];
              newSortOrder = Math.floor(
                (beforeTask.sort_order + afterTask.sort_order) / 2
              );
            }

            await sql`
              UPDATE task
              SET sort_order = ${newSortOrder}
              WHERE id = ${draggableId} AND userid = ${userId}
            `;
          } else {
            // Moving to master list - calculate new sort order based on destination index
            const masterTasksResult = await sql`
              SELECT id, sort_order
              FROM task
              WHERE userid = ${userId} AND isactive = 0 AND iscompleted = 0 AND id != ${draggableId}
              ORDER BY sort_order ASC
            `;
            const masterTasks = masterTasksResult.rows || [];

            // Calculate the new sort order based on destination index
            let newSortOrder: number;
            if (destinationIndex === 0) {
              newSortOrder =
                masterTasks.length > 0 ? masterTasks[0].sort_order - 1 : 0;
            } else if (destinationIndex >= masterTasks.length) {
              newSortOrder =
                masterTasks.length > 0
                  ? masterTasks[masterTasks.length - 1].sort_order + 1
                  : 0;
            } else {
              const beforeTask = masterTasks[destinationIndex - 1];
              const afterTask = masterTasks[destinationIndex];
              newSortOrder = Math.floor(
                (beforeTask.sort_order + afterTask.sort_order) / 2
              );
            }

            await sql`
              UPDATE task
              SET sort_order = ${newSortOrder}
              WHERE id = ${draggableId} AND userid = ${userId}
            `;
          }
        }

        await sql`COMMIT`;

        // Verify the update was committed by reading the task back
        const verifyResult = await sql`
          SELECT sort_order FROM task WHERE id = ${draggableId} AND userid = ${userId}
        `;

        console.log(
          `Reorder API: Successfully reordered task ${draggableId} for user ${userId}, new sort_order: ${verifyResult.rows?.[0]?.sort_order}`
        );
        return Response.json({ success: true });
      } catch (error) {
        await sql`ROLLBACK`;
        console.error(
          `Reorder API: PostgreSQL error for user ${userId}:`,
          error
        );
        throw error;
      }
    } else {
      // SQLite implementation for development
      try {
        // Get the task being moved
        const task = appDb
          .prepare(
            `SELECT id, sortOrder, isActive FROM task WHERE id = ? AND userId = ?`
          )
          .get(draggableId, userId) as {
          id: string;
          sortOrder: number;
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

        // Handle reordering within the same list
        if (sourceDroppableId === destinationDroppableId) {
          // Get all tasks in the list (excluding the moved task) ordered by sortOrder
          const listTasks = appDb
            .prepare(
              `SELECT id, sortOrder
               FROM task
               WHERE userId = ? 
                 AND isActive = ${sourceDroppableId === "active-tasks" ? 1 : 0}
                 AND isCompleted = 0
                 AND id != ?
               ORDER BY sortOrder ASC`
            )
            .all(userId, draggableId) as Array<{
            id: string;
            sortOrder: number;
          }>;

          // Calculate new sort order for the moved task
          let newSortOrder: number;

          if (destinationIndex === 0) {
            // Moving to the beginning
            newSortOrder =
              listTasks.length > 0 ? listTasks[0].sortOrder - 1 : 0;
          } else if (destinationIndex >= listTasks.length) {
            // Moving to the end
            newSortOrder =
              listTasks.length > 0
                ? listTasks[listTasks.length - 1].sortOrder + 1
                : 0;
          } else {
            // Moving to a specific position between two tasks
            const beforeTask = listTasks[destinationIndex - 1];
            const afterTask = listTasks[destinationIndex];
            newSortOrder = Math.floor(
              (beforeTask.sortOrder + afterTask.sortOrder) / 2
            );
          }

          // Update the moved task's sort order
          appDb
            .prepare(
              `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
            )
            .run(newSortOrder, draggableId, userId);
        } else {
          // Moving between lists - calculate new sort order based on destination
          if (destinationDroppableId === "active-tasks") {
            // Get active tasks ordered by sortOrder (excluding the task being moved)
            const activeTasks = appDb
              .prepare(
                `SELECT id, sortOrder FROM task WHERE userId = ? AND isActive = 1 AND isCompleted = 0 AND id != ? ORDER BY sortOrder ASC`
              )
              .all(userId, draggableId) as Array<{
              id: string;
              sortOrder: number;
            }>;

            // Calculate the new sort order based on destination index
            let newSortOrder: number;
            if (destinationIndex === 0) {
              newSortOrder =
                activeTasks.length > 0 ? activeTasks[0].sortOrder - 1 : 0;
            } else if (destinationIndex >= activeTasks.length) {
              newSortOrder =
                activeTasks.length > 0
                  ? activeTasks[activeTasks.length - 1].sortOrder + 1
                  : 0;
            } else {
              const beforeTask = activeTasks[destinationIndex - 1];
              const afterTask = activeTasks[destinationIndex];
              newSortOrder = Math.floor(
                (beforeTask.sortOrder + afterTask.sortOrder) / 2
              );
            }

            appDb
              .prepare(
                `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
              )
              .run(newSortOrder, draggableId, userId);
          } else {
            // Moving to master list - calculate new sort order based on destination index
            const masterTasks = appDb
              .prepare(
                `SELECT id, sortOrder FROM task WHERE userId = ? AND isActive = 0 AND isCompleted = 0 AND id != ? ORDER BY sortOrder ASC`
              )
              .all(userId, draggableId) as Array<{
              id: string;
              sortOrder: number;
            }>;

            // Calculate the new sort order based on destination index
            let newSortOrder: number;
            if (destinationIndex === 0) {
              newSortOrder =
                masterTasks.length > 0 ? masterTasks[0].sortOrder - 1 : 0;
            } else if (destinationIndex >= masterTasks.length) {
              newSortOrder =
                masterTasks.length > 0
                  ? masterTasks[masterTasks.length - 1].sortOrder + 1
                  : 0;
            } else {
              const beforeTask = masterTasks[destinationIndex - 1];
              const afterTask = masterTasks[destinationIndex];
              newSortOrder = Math.floor(
                (beforeTask.sortOrder + afterTask.sortOrder) / 2
              );
            }

            appDb
              .prepare(
                `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
              )
              .run(newSortOrder, draggableId, userId);
          }
        }

        console.log(
          `Reorder API: Successfully reordered task ${draggableId} for user ${userId} (SQLite)`
        );
        return Response.json({ success: true });
      } catch (error) {
        console.error(`Reorder API: SQLite error for user ${userId}:`, error);
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
