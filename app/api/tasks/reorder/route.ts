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
              {
                error:
                  "Active task limit reached: you can only have 3 active tasks at a time",
              },
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

        // Reorder within the same list or after moving between lists
        if (sourceDroppableId === destinationDroppableId) {
          // Same list reordering
          const currentSortOrder = task.sort_order;

          if (sourceIndex < destinationIndex) {
            // Moving down: shift tasks up
            await sql`
              UPDATE task
              SET sort_order = sort_order - 1
              WHERE userid = ${userId} 
                AND sort_order > ${currentSortOrder} 
                AND sort_order <= ${
                  currentSortOrder + (destinationIndex - sourceIndex)
                }
            `;
          } else {
            // Moving up: shift tasks down
            await sql`
              UPDATE task
              SET sort_order = sort_order + 1
              WHERE userid = ${userId} 
                AND sort_order >= ${
                  currentSortOrder + (destinationIndex - sourceIndex)
                } 
                AND sort_order < ${currentSortOrder}
            `;
          }

          // Set the moved task's new sort order
          await sql`
            UPDATE task
            SET sort_order = ${
              currentSortOrder + (destinationIndex - sourceIndex)
            }
            WHERE id = ${draggableId} AND userid = ${userId}
          `;
        } else {
          // Moving between lists - respect the destination index
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
            let newSortOrder;
            if (destinationIndex === 0) {
              // Insert at the beginning
              newSortOrder =
                activeTasks.length > 0 ? activeTasks[0].sort_order - 1 : 0;
            } else if (destinationIndex >= activeTasks.length) {
              // Insert at the end
              newSortOrder =
                activeTasks.length > 0
                  ? activeTasks[activeTasks.length - 1].sort_order + 1
                  : 0;
            } else {
              // Insert between two tasks
              const beforeTask = activeTasks[destinationIndex - 1];
              const afterTask = activeTasks[destinationIndex];
              newSortOrder = (beforeTask.sort_order + afterTask.sort_order) / 2;
            }

            await sql`
              UPDATE task
              SET sort_order = ${newSortOrder}
              WHERE id = ${draggableId} AND userid = ${userId}
            `;
          } else {
            // Moving to master list - respect the destination index
            // Get master tasks ordered by sort_order (excluding the task being moved)
            const masterTasksResult = await sql`
              SELECT id, sort_order
              FROM task
              WHERE userid = ${userId} AND isactive = 0 AND iscompleted = 0 AND id != ${draggableId}
              ORDER BY sort_order ASC
            `;
            const masterTasks = masterTasksResult.rows || [];

            // Calculate the new sort order based on destination index
            let newSortOrder;
            if (destinationIndex === 0) {
              // Insert at the beginning
              newSortOrder =
                masterTasks.length > 0 ? masterTasks[0].sort_order - 1 : 0;
            } else if (destinationIndex >= masterTasks.length) {
              // Insert at the end
              newSortOrder =
                masterTasks.length > 0
                  ? masterTasks[masterTasks.length - 1].sort_order + 1
                  : 0;
            } else {
              // Insert between two tasks
              const beforeTask = masterTasks[destinationIndex - 1];
              const afterTask = masterTasks[destinationIndex];
              newSortOrder = (beforeTask.sort_order + afterTask.sort_order) / 2;
            }

            await sql`
              UPDATE task
              SET sort_order = ${newSortOrder}
              WHERE id = ${draggableId} AND userid = ${userId}
            `;
          }
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
          const activeCountRow = appDb
            .prepare(
              `SELECT COUNT(*) as cnt FROM task WHERE userId = ? AND isActive = 1 AND isCompleted = 0`
            )
            .get(userId) as { cnt: number };

          if ((activeCountRow?.cnt ?? 0) >= 3) {
            return Response.json(
              {
                error:
                  "Active task limit reached: you can only have 3 active tasks at a time",
              },
              { status: 400 }
            );
          }

          // Move from master to active (activate task)
          appDb
            .prepare(
              `UPDATE task SET isActive = 1, addedToActiveAt = ? WHERE id = ? AND userId = ?`
            )
            .run(new Date().toISOString(), draggableId, userId);
        }

        // Reorder within the same list or after moving between lists
        if (sourceDroppableId === destinationDroppableId) {
          // Same list reordering
          const currentSortOrder = task.sortOrder;

          if (sourceIndex < destinationIndex) {
            // Moving down: shift tasks up
            appDb
              .prepare(
                `UPDATE task SET sortOrder = sortOrder - 1 WHERE userId = ? AND sortOrder > ? AND sortOrder <= ?`
              )
              .run(
                userId,
                currentSortOrder,
                currentSortOrder + (destinationIndex - sourceIndex)
              );
          } else {
            // Moving up: shift tasks down
            appDb
              .prepare(
                `UPDATE task SET sortOrder = sortOrder + 1 WHERE userId = ? AND sortOrder >= ? AND sortOrder < ?`
              )
              .run(
                userId,
                currentSortOrder + (destinationIndex - sourceIndex),
                currentSortOrder
              );
          }

          // Set the moved task's new sort order
          appDb
            .prepare(
              `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
            )
            .run(
              currentSortOrder + (destinationIndex - sourceIndex),
              draggableId,
              userId
            );
        } else {
          // Moving between lists - respect the destination index
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
            let newSortOrder;
            if (destinationIndex === 0) {
              // Insert at the beginning
              newSortOrder =
                activeTasks.length > 0 ? activeTasks[0].sortOrder - 1 : 0;
            } else if (destinationIndex >= activeTasks.length) {
              // Insert at the end
              newSortOrder =
                activeTasks.length > 0
                  ? activeTasks[activeTasks.length - 1].sortOrder + 1
                  : 0;
            } else {
              // Insert between two tasks
              const beforeTask = activeTasks[destinationIndex - 1];
              const afterTask = activeTasks[destinationIndex];
              newSortOrder = (beforeTask.sortOrder + afterTask.sortOrder) / 2;
            }

            appDb
              .prepare(
                `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
              )
              .run(newSortOrder, draggableId, userId);
          } else {
            // Moving to master list - respect the destination index
            // Get master tasks ordered by sortOrder (excluding the task being moved)
            const masterTasks = appDb
              .prepare(
                `SELECT id, sortOrder FROM task WHERE userId = ? AND isActive = 0 AND isCompleted = 0 AND id != ? ORDER BY sortOrder ASC`
              )
              .all(userId, draggableId) as Array<{
              id: string;
              sortOrder: number;
            }>;

            // Calculate the new sort order based on destination index
            let newSortOrder;
            if (destinationIndex === 0) {
              // Insert at the beginning
              newSortOrder =
                masterTasks.length > 0 ? masterTasks[0].sortOrder - 1 : 0;
            } else if (destinationIndex >= masterTasks.length) {
              // Insert at the end
              newSortOrder =
                masterTasks.length > 0
                  ? masterTasks[masterTasks.length - 1].sortOrder + 1
                  : 0;
            } else {
              // Insert between two tasks
              const beforeTask = masterTasks[destinationIndex - 1];
              const afterTask = masterTasks[destinationIndex];
              newSortOrder = (beforeTask.sortOrder + afterTask.sortOrder) / 2;
            }

            appDb
              .prepare(
                `UPDATE task SET sortOrder = ? WHERE id = ? AND userId = ?`
              )
              .run(newSortOrder, draggableId, userId);
          }
        }

        return Response.json({ success: true });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error("Task reorder API: Error processing request:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
