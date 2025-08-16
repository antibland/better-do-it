import { auth } from "@/lib/auth";
import { appDb, TaskRow } from "@/lib/db";
import { toSqliteUtc } from "@/lib/week";

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

function getTaskForUser(taskId: string, userId: string): TaskRow | undefined {
  return appDb
    .prepare(
      `SELECT id, userId, title, isCompleted, createdAt, completedAt
       FROM task WHERE id = ? AND userId = ?`
    )
    .get(taskId, userId) as TaskRow | undefined;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const taskId = params.id;

  const task = getTaskForUser(taskId, userId);
  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: { toggle?: boolean; isCompleted?: boolean; title?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle different update types
  const toggle = body?.toggle === true;
  const explicit =
    typeof body?.isCompleted === "boolean" ? body.isCompleted : undefined;
  const title = typeof body?.title === "string" ? body.title.trim() : undefined;

  // Validate title if provided
  if (title !== undefined) {
    if (!title) {
      return Response.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (title.length > 200) {
      return Response.json(
        { error: "Title too long (max 200 chars)" },
        { status: 400 }
      );
    }
  }

  // Handle completion updates
  if (toggle || explicit !== undefined) {
    let nextCompleted: 0 | 1;
    if (typeof explicit === "boolean") {
      nextCompleted = explicit ? 1 : 0;
    } else if (toggle) {
      nextCompleted = task.isCompleted ? 0 : 1;
    } else {
      return Response.json(
        { error: "Provide { toggle: true } or { isCompleted: boolean }" },
        { status: 400 }
      );
    }

    const completedAt = nextCompleted === 1 ? toSqliteUtc(new Date()) : null;

    appDb
      .prepare(
        `UPDATE task SET isCompleted = ?, completedAt = ? WHERE id = ? AND userId = ?`
      )
      .run(nextCompleted, completedAt, taskId, userId);
  }

  // Handle title updates
  if (title !== undefined) {
    appDb
      .prepare(`UPDATE task SET title = ? WHERE id = ? AND userId = ?`)
      .run(title, taskId, userId);
  }

  // If no valid update was provided
  if (title === undefined && !toggle && explicit === undefined) {
    return Response.json(
      {
        error:
          "Provide { title: string }, { toggle: true }, or { isCompleted: boolean }",
      },
      { status: 400 }
    );
  }

  const updated = getTaskForUser(taskId, userId)!;
  return Response.json({ task: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;
  const taskId = params.id;

  const task = getTaskForUser(taskId, userId);
  if (!task) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  appDb
    .prepare(`DELETE FROM task WHERE id = ? AND userId = ?`)
    .run(taskId, userId);
  return Response.json({ ok: true });
}
