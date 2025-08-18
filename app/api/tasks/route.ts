import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb, generateId, TaskRow } from "@/lib/db";
import {
  getCurrentWeekStartEt,
  getNextWeekStartEt,
  toSqliteUtc,
} from "@/lib/week";

/**
 * Tasks collection route
 * - GET: return current user's open tasks, completed count for this week, and needsTopOff flag
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
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // PostgreSQL implementation for production
    const allTasksResult = await sql`
      SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt
      FROM task
      WHERE userId = ${userId}
      ORDER BY isActive DESC, isCompleted ASC, createdAt ASC
    `;
    const allTasks = allTasksResult.rows || [];

    // Compute completed count for the current ET week window (active tasks only)
    const weekStart = toSqliteUtc(getCurrentWeekStartEt());
    const nextWeekStart = toSqliteUtc(getNextWeekStartEt());
    const completedThisWeekResult = await sql`
      SELECT COUNT(*) as cnt
      FROM task
      WHERE userId = ${userId} AND isActive = 1 AND isCompleted = 1 AND completedAt >= ${weekStart} AND completedAt < ${nextWeekStart}
    `;
    const completedThisWeek = completedThisWeekResult.rows?.[0]?.cnt || 0;

    // Filter tasks for different views
    const activeTasks = allTasks.filter((task) => task.isActive === 1);
    const masterTasks = allTasks.filter((task) => task.isActive === 0);
    const openActiveTasks = activeTasks.filter((task) => task.isCompleted === 0);

    // Check if user needs to top off active tasks (should have 3 active tasks)
    const needsTopOff = activeTasks.length < 3;

    return Response.json({
      tasks: allTasks,
      activeTasks: activeTasks,
      masterTasks: masterTasks,
      openActiveTasks: openActiveTasks,
      completedThisWeek: completedThisWeek,
      needsTopOff,
    });
  } else {
    // SQLite implementation for development
    const allTasks = appDb
      .prepare(
        `SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt
         FROM task
         WHERE userId = ?
         ORDER BY isActive DESC, isCompleted ASC, createdAt ASC`
      )
      .all(userId) as TaskRow[];

    // Compute completed count for the current ET week window (active tasks only)
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
    const openActiveTasks = activeTasks.filter((task) => task.isCompleted === 0);

    // Check if user needs to top off active tasks (should have 3 active tasks)
    const needsTopOff = activeTasks.length < 3;

    return Response.json({
      tasks: allTasks,
      activeTasks: activeTasks,
      masterTasks: masterTasks,
      openActiveTasks: openActiveTasks,
      completedThisWeek: completedThisWeek?.cnt ?? 0,
      needsTopOff,
    });
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
    // If adding to active list, check the 3-task limit for active tasks
    if (isActive) {
      const activeCountResult = await sql`
        SELECT COUNT(*) as cnt FROM task WHERE userId = ${userId} AND isActive = 1
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

    // Insert task with active status
    await sql`
      INSERT INTO task (id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt)
      VALUES (${id}, ${userId}, ${title}, 0, ${isActive ? 1 : 0}, ${now}, NULL, ${addedToActiveAt})
    `;

    const createdResult = await sql`
      SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt 
      FROM task WHERE id = ${id}
    `;
    const created = createdResult.rows?.[0];

    return Response.json({ task: created }, { status: 201 });
  } else {
    // SQLite implementation for development
    // If adding to active list, check the 3-task limit for active tasks
    if (isActive) {
      const activeCountRow = appDb
        .prepare(
          `SELECT COUNT(*) as cnt FROM task WHERE userId = ? AND isActive = 1`
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

    // Insert task with active status
    const stmt = appDb.prepare(
      `INSERT INTO task (id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt)
       VALUES (?, ?, ?, 0, ?, ?, NULL, ?)`
    );
    stmt.run(id, userId, title, isActive ? 1 : 0, now, addedToActiveAt);

    const created = appDb
      .prepare(
        `SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt FROM task WHERE id = ?`
      )
      .get(id) as TaskRow;

    return Response.json({ task: created }, { status: 201 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // PostgreSQL implementation for production
    await sql`DELETE FROM task WHERE userId = ${userId}`;
  } else {
    // SQLite implementation for development
    appDb.prepare(`DELETE FROM task WHERE userId = ?`).run(userId);
  }

  return Response.json({ ok: true });
}
