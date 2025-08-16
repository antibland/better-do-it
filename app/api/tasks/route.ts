import { auth } from "@/lib/auth";
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

  // Fetch all tasks (both open and completed)
  const allTasks = appDb
    .prepare(
      `SELECT id, userId, title, isCompleted, createdAt, completedAt
       FROM task
       WHERE userId = ?
       ORDER BY isCompleted ASC, createdAt ASC`
    )
    .all(userId) as TaskRow[];

  // Compute completed count for the current ET week window
  const weekStart = toSqliteUtc(getCurrentWeekStartEt());
  const nextWeekStart = toSqliteUtc(getNextWeekStartEt());
  const completedThisWeek = appDb
    .prepare(
      `SELECT COUNT(*) as cnt
       FROM task
       WHERE userId = ? AND isCompleted = 1 AND completedAt >= ? AND completedAt < ?`
    )
    .get(userId, weekStart, nextWeekStart) as { cnt: number };

  const openTasks = allTasks.filter((task) => task.isCompleted === 0);
  const needsTopOff = openTasks.length < 3;

  return Response.json({
    tasks: allTasks,
    open: openTasks,
    completedThisWeek: completedThisWeek?.cnt ?? 0,
    needsTopOff,
  });
}

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  let body: { title?: string };
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

  // Enforce maximum of 3 open tasks per user.
  // We count only tasks with isCompleted = 0. Completed tasks do not count toward the limit.
  const openCountRow = appDb
    .prepare(
      `SELECT COUNT(*) as cnt FROM task WHERE userId = ? AND isCompleted = 0`
    )
    .get(userId) as { cnt: number };
  if ((openCountRow?.cnt ?? 0) >= 3) {
    return Response.json(
      { error: "Task limit reached: complete a task before adding another" },
      { status: 400 }
    );
  }

  const id = generateId();
  const now = toSqliteUtc(new Date());

  // Insert task. We set createdAt explicitly for consistency.
  const stmt = appDb.prepare(
    `INSERT INTO task (id, userId, title, isCompleted, createdAt, completedAt)
     VALUES (?, ?, ?, 0, ?, NULL)`
  );
  stmt.run(id, userId, title, now);

  const created = appDb
    .prepare(
      `SELECT id, userId, title, isCompleted, createdAt, completedAt FROM task WHERE id = ?`
    )
    .get(id) as TaskRow;

  return Response.json({ task: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  // Delete all tasks for the user (both open and completed)
  appDb.prepare(`DELETE FROM task WHERE userId = ?`).run(userId);

  return Response.json({ ok: true });
}
