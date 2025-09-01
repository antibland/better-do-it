import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb, generateId } from "@/lib/db";
import { Task } from "@/types";
import {
  getCurrentWeekStartEt,
  getNextWeekStartEt,
  toSqliteUtc,
} from "@/lib/week";

/**
 * Tasks collection route
 * - GET: return current user's open tasks and completed count for this week
 * - POST: create a new task for current user
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      console.log("Tasks API: Unauthorized - no session");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";

    console.log(
      `Tasks API: Processing request for user ${userId} in ${
        isProduction ? "production" : "development"
      }`
    );

    if (isProduction) {
      // PostgreSQL implementation for production - using actual column names from database
      console.log("Tasks API: Executing PostgreSQL query...");

      try {
        // Check if sort_order column exists
        const checkColumn = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'task' AND column_name = 'sort_order'
        `;
        
        const hasSortOrder = checkColumn.rows.length > 0;
        
        const allTasksResult = await sql`
          SELECT id, userid, title, iscompleted, isactive, ${hasSortOrder ? sql`sort_order` : sql`0 as sort_order`}, createdat, completedat, addedtoactiveat
          FROM task
          WHERE userid = ${userId}
          ORDER BY isactive DESC, iscompleted ASC, ${hasSortOrder ? sql`sort_order ASC,` : sql``} createdat DESC
        `;

        console.log(
          "Tasks API: Raw database result:",
          JSON.stringify(allTasksResult.rows, null, 2)
        );

        // Transform the data to match frontend expectations (camelCase)
        const allTasks = (allTasksResult.rows || []).map((task) => ({
          id: task.id,
          userId: task.userid,
          title: task.title,
          isCompleted: task.iscompleted,
          isActive: task.isactive,
          sortOrder: task.sort_order,
          createdAt: task.createdat,
          completedAt: task.completedat,
          addedToActiveAt: task.addedtoactiveat,
        }));

        console.log(
          "Tasks API: Transformed tasks:",
          JSON.stringify(allTasks, null, 2)
        );

        // PROPER FIX: Use the correct week boundary calculation
        // The week starts on Wednesday 6 PM ET as designed
        const weekStart = toSqliteUtc(getCurrentWeekStartEt());
        const nextWeekStart = toSqliteUtc(getNextWeekStartEt());
        const completedThisWeekResult = await sql`
          SELECT COUNT(*) as cnt
          FROM task
          WHERE userid = ${userId} AND isactive = 1 AND iscompleted = 1 AND completedat >= ${weekStart} AND completedat < ${nextWeekStart}
        `;
        const completedThisWeek = completedThisWeekResult.rows?.[0]?.cnt || 0;

        // Filter tasks for different views
        const activeTasks = allTasks.filter((task) => task.isActive === 1);
        const masterTasks = allTasks.filter((task) => task.isActive === 0);
        const openActiveTasks = activeTasks.filter(
          (task) => task.isCompleted === 0
        );

        const response = {
          tasks: allTasks, // This is the key - the frontend expects this
          activeTasks: activeTasks,
          masterTasks: masterTasks,
          openActiveTasks: openActiveTasks,
          completedThisWeek: completedThisWeek,
        };

        console.log(
          "Tasks API: Final response:",
          JSON.stringify(response, null, 2)
        );
        console.log(
          `Tasks API: Production response - ${allTasks.length} total tasks, ${activeTasks.length} active, ${completedThisWeek} completed this week`
        );
        return Response.json(response);
      } catch (dbError) {
        console.error("Tasks API: Database error:", dbError);

        // If it's a table doesn't exist error, return empty arrays
        if (
          dbError instanceof Error &&
          dbError.message.includes("does not exist")
        ) {
          const emptyResponse = {
            tasks: [],
            activeTasks: [],
            masterTasks: [],
            openActiveTasks: [],
            completedThisWeek: 0,
          };
          console.log(
            "Tasks API: Returning empty response due to missing table"
          );
          return Response.json(emptyResponse);
        }

        return Response.json(
          {
            error: "Database error",
            details:
              dbError instanceof Error
                ? dbError.message
                : "Unknown database error",
          },
          { status: 500 }
        );
      }
    } else {
      // SQLite implementation for development
      const allTasks = appDb
        .prepare(
          `SELECT id, userId, title, isCompleted, isActive, sortOrder, createdAt, completedAt, addedToActiveAt
           FROM task
           WHERE userId = ?
           ORDER BY isActive DESC, isCompleted ASC, sortOrder ASC, createdAt DESC`
        )
        .all(userId) as Task[];

      // PROPER FIX: Use the correct week boundary calculation
      const weekStart = toSqliteUtc(getCurrentWeekStartEt());
      const nextWeekStart = toSqliteUtc(getNextWeekStartEt());
      const completedThisWeek = appDb
        .prepare(
          `SELECT COUNT(*) as cnt
           FROM task
           WHERE userId = ? AND isActive = 1 AND isCompleted = 1 AND completedAt >= ? AND completedAt < ?`
        )
        .get(userId, weekStart, nextWeekStart) as { cnt: number };

      // Filter tasks for different views
      const activeTasks = allTasks.filter((task) => task.isActive === 1);
      const masterTasks = allTasks.filter((task) => task.isActive === 0);
      const openActiveTasks = activeTasks.filter(
        (task) => task.isCompleted === 0
      );

      const response = {
        tasks: allTasks,
        activeTasks: activeTasks,
        masterTasks: masterTasks,
        openActiveTasks: openActiveTasks,
        completedThisWeek: completedThisWeek?.cnt ?? 0,
      };

      console.log(
        `Tasks API: Development response - ${allTasks.length} total tasks, ${
          activeTasks.length
        } active, ${completedThisWeek?.cnt ?? 0} completed this week`
      );
      return Response.json(response);
    }
  } catch (error) {
    console.error("Tasks API: Error processing request:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  let body: { title?: string; isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (title.length > 200) {
    return Response.json(
      { error: "Title too long (max 200 chars)" },
      { status: 400 }
    );
  }

  // Determine if task should be active or master list
  const isActive = body?.isActive === true;

  if (isProduction) {
    // PostgreSQL implementation for production
    // If adding to active list, check the 3-task limit for open active tasks
    if (isActive) {
      const activeCountResult = await sql`
        SELECT COUNT(*) as cnt FROM task WHERE userid = ${userId} AND isactive = 1 AND iscompleted = 0
      `;
      const activeCount = activeCountResult.rows?.[0]?.cnt || 0;
      if (activeCount >= 3) {
        return Response.json(
          {
            error:
              "Active task limit reached: you can only have 3 active tasks at a time",
          },
          { status: 400 }
        );
      }
    }

    const id = generateId();
    const now = new Date().toISOString();
    const addedToActiveAt = isActive ? now : null;

    // Get the next sort order for this user
    const maxSortOrderResult = await sql`
      SELECT COALESCE(MAX(sort_order), 0) as max_sort_order
      FROM task
      WHERE userid = ${userId}
    `;
    const nextSortOrder =
      (maxSortOrderResult.rows?.[0]?.max_sort_order || 0) + 1;

    // Insert task with active status and sort order
    await sql`
      INSERT INTO task (id, userid, title, iscompleted, isactive, sort_order, createdat, completedat, addedtoactiveat)
      VALUES (${id}, ${userId}, ${title}, 0, ${
      isActive ? 1 : 0
    }, ${nextSortOrder}, ${now}, NULL, ${addedToActiveAt})
    `;

    const createdResult = await sql`
      SELECT id, userid, title, iscompleted, isactive, sort_order, createdat, completedat, addedtoactiveat 
      FROM task WHERE id = ${id}
    `;
    const created = createdResult.rows?.[0];

    return Response.json({ task: created }, { status: 201 });
  } else {
    // SQLite implementation for development
    // If adding to active list, check the 3-task limit for open active tasks
    if (isActive) {
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
    }

    const id = generateId();
    const now = toSqliteUtc(new Date());
    const addedToActiveAt = isActive ? now : null;

    // Get the next sort order for this user
    const maxSortOrderRow = appDb
      .prepare(
        `SELECT COALESCE(MAX(sortOrder), 0) as maxSortOrder FROM task WHERE userId = ?`
      )
      .get(userId) as { maxSortOrder: number };
    const nextSortOrder = (maxSortOrderRow?.maxSortOrder || 0) + 1;

    // Insert task with active status and sort order
    const stmt = appDb.prepare(
      `INSERT INTO task (id, userId, title, isCompleted, isActive, sortOrder, createdAt, completedAt, addedToActiveAt)
       VALUES (?, ?, ?, 0, ?, ?, ?, NULL, ?)`
    );
    stmt.run(
      id,
      userId,
      title,
      isActive ? 1 : 0,
      nextSortOrder,
      now,
      addedToActiveAt
    );

    const created = appDb
      .prepare(
        `SELECT id, userId, title, isCompleted, isActive, sortOrder, createdAt, completedAt, addedToActiveAt FROM task WHERE id = ?`
      )
      .get(id) as Task;

    return Response.json({ task: created }, { status: 201 });
  }
}

// Removed DELETE endpoint for clearing all tasks - no longer needed
// This prevents accidental deletion of all user tasks
// Individual task deletion is still available via DELETE /api/tasks/[id]
