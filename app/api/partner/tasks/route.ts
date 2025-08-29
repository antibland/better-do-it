import { auth } from "@/lib/auth";
import { appDb } from "@/lib/db";
import { Task } from "@/types";
import { sql } from "@vercel/postgres";
import {
  getCurrentWeekStartEt,
  getNextWeekStartEt,
  toSqliteUtc,
  debugWeekBoundaries,
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
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // PostgreSQL implementation for production
    try {
      // Get partnership
      const partnershipResult = await sql`
        SELECT id, usera, userb FROM partnership WHERE usera = ${userId} OR userb = ${userId}
      `;
      const partnership = partnershipResult.rows?.[0];

      if (!partnership) {
        // Return empty response instead of 404 error
        return Response.json({
          partner: null,
          tasks: [],
          completedThisWeek: 0,
        });
      }

      // Determine which user is the partner
      const partnerId =
        partnership.usera === userId ? partnership.userb : partnership.usera;

      // Fetch partner's active tasks only
      const activeTasksResult = await sql`
        SELECT id, userid, title, iscompleted, isactive, createdat, completedat, addedtoactiveat
        FROM task
        WHERE userid = ${partnerId} AND isactive = 1
        ORDER BY iscompleted ASC, createdat DESC
      `;

      // Transform the data to match frontend expectations (camelCase)
      const activeTasks = (activeTasksResult.rows || []).map((task) => ({
        id: task.id,
        userId: task.userid,
        title: task.title,
        isCompleted: task.iscompleted,
        isActive: task.isactive,
        createdAt: task.createdat,
        completedAt: task.completedat,
        addedToActiveAt: task.addedtoactiveat,
      }));

      // Compute partner's completed count for the current ET week window (active tasks only)
      const weekStart = toSqliteUtc(getCurrentWeekStartEt());
      const nextWeekStart = toSqliteUtc(getNextWeekStartEt());

      // Debug: Log the week boundaries and check what completed tasks exist
      debugWeekBoundaries();
      console.log(
        `Partner tasks API: Week boundaries - start: ${weekStart}, end: ${nextWeekStart}`
      );
      console.log(
        `Partner tasks API: Current time: ${new Date().toISOString()}`
      );

      // First, let's see all completed active tasks for the partner
      const allCompletedActiveTasksResult = await sql`
        SELECT id, title, completedat, to_char(completedat, 'YYYY-MM-DD HH24:MI:SS') as formatted_date
        FROM task
        WHERE userid = ${partnerId} AND isactive = 1 AND iscompleted = 1
        ORDER BY completedat DESC
      `;
      console.log(
        `Partner tasks API: All completed active tasks:`,
        allCompletedActiveTasksResult.rows
      );

      // Let's also check what the actual completedAt values look like in the database
      const sampleCompletedTask = allCompletedActiveTasksResult.rows?.[0];
      if (sampleCompletedTask) {
        console.log(
          `Partner tasks API: Sample completed task date:`,
          sampleCompletedTask.completedat
        );
        console.log(
          `Partner tasks API: Sample formatted date:`,
          sampleCompletedTask.formatted_date
        );
      }

      // TEMPORARY FIX: Check if there are any completed tasks in the last 7 days
      // This will help us understand if the week boundary calculation is the issue
      const sevenDaysAgo = toSqliteUtc(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      const completedThisWeekResult = await sql`
        SELECT COUNT(*) as cnt
        FROM task
        WHERE userid = ${partnerId} AND isactive = 1 AND iscompleted = 1 AND completedat >= ${weekStart} AND completedat < ${nextWeekStart}
      `;
      const completedThisWeek = completedThisWeekResult.rows?.[0]?.cnt || 0;

      const completedLast7DaysResult = await sql`
        SELECT COUNT(*) as cnt
        FROM task
        WHERE userid = ${partnerId} AND isactive = 1 AND iscompleted = 1 AND completedat >= ${sevenDaysAgo}
      `;
      const completedLast7Days = completedLast7DaysResult.rows?.[0]?.cnt || 0;

      console.log(
        `Partner tasks API: Completed this week (strict): ${completedThisWeek}`
      );
      console.log(
        `Partner tasks API: Completed last 7 days: ${completedLast7Days}`
      );

      // Use the 7-day count as a temporary fix
      const finalCompletedCount = completedLast7Days;

      console.log(
        `Partner tasks API: Completed this week count: ${completedThisWeek}`
      );

      // Get partner's user info
      const partnerResult = await sql`
        SELECT id, email, name FROM "user" WHERE id = ${partnerId}
      `;
      const partner = partnerResult.rows?.[0];

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
        completedThisWeek: finalCompletedCount,
      });
    } catch (error) {
      console.error("Partner tasks API error:", error);

      // If it's a table doesn't exist error, return empty response
      if (error instanceof Error && error.message.includes("does not exist")) {
        return Response.json({
          partner: null,
          tasks: [],
          completedThisWeek: 0,
        });
      }

      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  } else {
    // SQLite implementation for development
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
         ORDER BY isCompleted ASC, createdAt DESC`
      )
      .all(partnerId) as Task[];

    // Compute partner's completed count for the current ET week window (active tasks only)
    const weekStart = toSqliteUtc(getCurrentWeekStartEt());
    const nextWeekStart = toSqliteUtc(getNextWeekStartEt());

    // Debug: Log the week boundaries for SQLite
    debugWeekBoundaries();
    console.log(
      `Partner tasks API (SQLite): Week boundaries - start: ${weekStart}, end: ${nextWeekStart}`
    );
    console.log(
      `Partner tasks API (SQLite): Current time: ${new Date().toISOString()}`
    );

    // First, let's see all completed active tasks for the partner
    const allCompletedActiveTasks = appDb
      .prepare(
        `SELECT id, title, completedAt
         FROM task
         WHERE userId = ? AND isActive = 1 AND isCompleted = 1
         ORDER BY completedAt DESC`
      )
      .all(partnerId) as Task[];
    console.log(
      `Partner tasks API (SQLite): All completed active tasks:`,
      allCompletedActiveTasks
    );

    // TEMPORARY FIX: Check if there are any completed tasks in the last 7 days
    const sevenDaysAgo = toSqliteUtc(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const completedThisWeek = appDb
      .prepare(
        `SELECT COUNT(*) as cnt
         FROM task
         WHERE userId = ? AND isActive = 1 AND isCompleted = 1 AND completedAt >= ? AND completedAt < ?`
      )
      .get(partnerId, weekStart, nextWeekStart) as { cnt: number };

    const completedLast7Days = appDb
      .prepare(
        `SELECT COUNT(*) as cnt
         FROM task
         WHERE userId = ? AND isActive = 1 AND isCompleted = 1 AND completedAt >= ?`
      )
      .get(partnerId, sevenDaysAgo) as { cnt: number };

    console.log(
      `Partner tasks API (SQLite): Completed this week (strict): ${
        completedThisWeek?.cnt ?? 0
      }`
    );
    console.log(
      `Partner tasks API (SQLite): Completed last 7 days: ${
        completedLast7Days?.cnt ?? 0
      }`
    );

    // Use the 7-day count as a temporary fix
    const finalCompletedCount = completedLast7Days?.cnt ?? 0;

    // Get partner's user info
    const partner = appDb
      .prepare(`SELECT id, email, name FROM user WHERE id = ?`)
      .get(partnerId) as
      | { id: string; email: string; name: string }
      | undefined;

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
      completedThisWeek: finalCompletedCount,
    });
  }
}
