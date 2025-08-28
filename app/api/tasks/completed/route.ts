import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb } from "@/lib/db";
import { Task } from "@/types";

/**
 * Completed tasks endpoint
 * - GET: return all completed tasks for the current user, ordered by completion date descending
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
      console.log("Completed Tasks API: Unauthorized - no session");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";

    console.log(
      `Completed Tasks API: Processing request for user ${userId} in ${
        isProduction ? "production" : "development"
      }`
    );

    if (isProduction) {
      // PostgreSQL implementation for production
      console.log("Completed Tasks API: Executing PostgreSQL query...");

      try {
        const completedTasksResult = await sql`
          SELECT id, userid, title, iscompleted, isactive, createdat, completedat, addedtoactiveat
          FROM task
          WHERE userid = ${userId} AND iscompleted = 1
          ORDER BY completedat DESC
        `;

        console.log(
          "Completed Tasks API: Raw database result:",
          JSON.stringify(completedTasksResult.rows, null, 2)
        );

        // Transform the data to match frontend expectations (camelCase)
        const completedTasks = (completedTasksResult.rows || []).map(
          (task) => ({
            id: task.id,
            userId: task.userid,
            title: task.title,
            isCompleted: task.iscompleted,
            isActive: task.isactive,
            createdAt: task.createdat,
            completedAt: task.completedat,
            addedToActiveAt: task.addedtoactiveat,
          })
        );

        console.log(
          "Completed Tasks API: Transformed tasks:",
          JSON.stringify(completedTasks, null, 2)
        );

        console.log(
          `Completed Tasks API: Production response - ${completedTasks.length} completed tasks`
        );
        return Response.json({ tasks: completedTasks });
      } catch (dbError) {
        console.error("Completed Tasks API: Database error:", dbError);
        return Response.json(
          { error: "Database error occurred" },
          { status: 500 }
        );
      }
    } else {
      // SQLite implementation for development
      console.log("Completed Tasks API: Executing SQLite query...");

      const completedTasks = appDb
        .prepare(
          `SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt
           FROM task
           WHERE userId = ? AND isCompleted = 1
           ORDER BY completedAt DESC`
        )
        .all(userId) as Task[];

      console.log(
        "Completed Tasks API: SQLite result:",
        JSON.stringify(completedTasks, null, 2)
      );

      console.log(
        `Completed Tasks API: Development response - ${completedTasks.length} completed tasks`
      );
      return Response.json({ tasks: completedTasks });
    }
  } catch (error) {
    console.error("Completed Tasks API: Unexpected error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
