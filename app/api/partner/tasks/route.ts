import { auth } from "@/lib/auth";
import { appDb, TaskRow } from "@/lib/db";
import {
  getCurrentWeekStartEt,
  getNextWeekStartEt,
  toSqliteUtc,
} from "@/lib/week";

/**
 * Partner tasks route (read-only)
 * - GET: return partner's open tasks and completed count for this week
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

function getPartnershipForUser(
  userId: string
): { id: string; userA: string; userB: string } | undefined {
  return appDb
    .prepare(
      `SELECT id, userA, userB FROM partnership WHERE userA = ? OR userB = ?`
    )
    .get(userId, userId) as
    | { id: string; userA: string; userB: string }
    | undefined;
}

export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const partnership = getPartnershipForUser(userId);

  if (!partnership) {
    return Response.json({ error: "No partnership found" }, { status: 404 });
  }

  // Determine which user is the partner
  const partnerId =
    partnership.userA === userId ? partnership.userB : partnership.userA;

  // Fetch partner's active tasks only
  const activeTasks = appDb
    .prepare(
      `SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt
       FROM task
       WHERE userId = ? AND isActive = 1
       ORDER BY isCompleted ASC, createdAt ASC`
    )
    .all(partnerId) as TaskRow[];

  // Compute partner's completed count for the current ET week window (active tasks only)
  const weekStart = toSqliteUtc(getCurrentWeekStartEt());
  const nextWeekStart = toSqliteUtc(getNextWeekStartEt());
  const completedThisWeek = appDb
    .prepare(
      `SELECT COUNT(*) as cnt
       FROM task
       WHERE userId = ? AND isActive = 1 AND isCompleted = 1 AND completedAt >= ? AND completedAt < ?`
    )
    .get(partnerId, weekStart, nextWeekStart) as { cnt: number };

  // Get partner's user info
  const partner = appDb
    .prepare(`SELECT id, email, name FROM user WHERE id = ?`)
    .get(partnerId) as { id: string; email: string; name: string } | undefined;

  if (!partner) {
    return Response.json({ error: "Partner not found" }, { status: 404 });
  }

  return Response.json({
    partner: {
      id: partner.id,
      email: partner.email,
      name: partner.name,
    },
    tasks: activeTasks,
    completedThisWeek: completedThisWeek?.cnt ?? 0,
  });
}
