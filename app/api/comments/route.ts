import { auth } from "@/lib/auth";
import { appDb, generateId } from "@/lib/db";
import { sql } from "@/lib/db-config";
import { CommentWithAuthor } from "@/types/comment";

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
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";

    // Get taskId from query parameters
    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");

    if (!taskId) {
      return Response.json({ error: "Task ID is required" }, { status: 400 });
    }

    if (isProduction) {
      // PostgreSQL implementation
      // First, verify the user has access to this task (either owns it or is a partner)
      const taskResult = await sql`
        SELECT t.id, t.userid 
        FROM task t
        WHERE t.id = ${taskId}
      `;
      const task = taskResult.rows?.[0];

      if (!task) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }

      const taskOwnerId = task.userid;
      const isTaskOwner = taskOwnerId === userId;

      // If not the task owner, verify partnership exists
      if (!isTaskOwner) {
        const partnershipResult = await sql`
          SELECT id FROM partnership 
          WHERE (usera = ${userId} AND userb = ${taskOwnerId}) 
             OR (usera = ${taskOwnerId} AND userb = ${userId})
        `;

        if (!partnershipResult.rows || partnershipResult.rows.length === 0) {
          return Response.json(
            { error: "Not authorized to view comments on this task" },
            { status: 403 }
          );
        }
      }

      // Fetch comments based on user's role
      let commentsResult;
      if (isTaskOwner) {
        // Task owner sees all unread comments from others
        commentsResult = await sql`
          SELECT c.id, c.taskid, c.authorid, c.content, c.createdat, c.updatedat, c.readat, c.isread,
                 u.name as authorname, u.email as authoremail
          FROM comment c
          JOIN "user" u ON c.authorid = u.id
          WHERE c.taskid = ${taskId} AND c.isread = 0
          ORDER BY c.createdat DESC
        `;
      } else {
        // Comment author sees only their own comments (read or unread)
        commentsResult = await sql`
          SELECT c.id, c.taskid, c.authorid, c.content, c.createdat, c.updatedat, c.readat, c.isread,
                 u.name as authorname, u.email as authoremail
          FROM comment c
          JOIN "user" u ON c.authorid = u.id
          WHERE c.taskid = ${taskId} AND c.authorid = ${userId}
          ORDER BY c.createdat DESC
        `;
      }

      // Transform to camelCase
      const comments: CommentWithAuthor[] = (commentsResult.rows || []).map(
        (row) => ({
          id: row.id,
          taskId: row.taskid,
          authorId: row.authorid,
          content: row.content,
          createdAt: row.createdat,
          updatedAt: row.updatedat,
          readAt: row.readat,
          isRead: row.isread,
          authorName: row.authorname,
          authorEmail: row.authoremail,
        })
      );

      return Response.json({ comments });
    } else {
      // SQLite implementation
      // First, verify the user has access to this task
      const task = appDb
        .prepare("SELECT id, userId FROM task WHERE id = ?")
        .get(taskId) as { id: string; userId: string } | undefined;

      if (!task) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }

      const taskOwnerId = task.userId;
      const isTaskOwner = taskOwnerId === userId;

      // If not the task owner, verify partnership exists
      if (!isTaskOwner) {
        const partnership = appDb
          .prepare(
            `SELECT id FROM partnership 
             WHERE (userA = ? AND userB = ?) OR (userA = ? AND userB = ?)`
          )
          .get(userId, taskOwnerId, taskOwnerId, userId);

        if (!partnership) {
          return Response.json(
            { error: "Not authorized to view comments on this task" },
            { status: 403 }
          );
        }
      }

      // Fetch comments based on user's role
      let comments: CommentWithAuthor[];
      if (isTaskOwner) {
        // Task owner sees all unread comments from others
        comments = appDb
          .prepare(
            `SELECT c.id, c.taskId, c.authorId, c.content, c.createdAt, c.updatedAt, c.readAt, c.isRead,
                    u.name as authorName, u.email as authorEmail
             FROM comment c
             JOIN user u ON c.authorId = u.id
             WHERE c.taskId = ? AND c.isRead = 0
             ORDER BY c.createdAt DESC`
          )
          .all(taskId) as CommentWithAuthor[];
      } else {
        // Comment author sees only their own comments
        comments = appDb
          .prepare(
            `SELECT c.id, c.taskId, c.authorId, c.content, c.createdAt, c.updatedAt, c.readAt, c.isRead,
                    u.name as authorName, u.email as authorEmail
             FROM comment c
             JOIN user u ON c.authorId = u.id
             WHERE c.taskId = ? AND c.authorId = ?
             ORDER BY c.createdAt DESC`
          )
          .all(taskId, userId) as CommentWithAuthor[];
      }

      return Response.json({ comments });
    }
  } catch (error) {
    console.error("Comments GET error:", error);
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
  try {
    const session = await requireSession(req);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";

    // Parse request body
    let body: { taskId?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { taskId, content } = body;

    // Validate taskId
    if (!taskId || typeof taskId !== "string") {
      return Response.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Validate content
    if (!content || typeof content !== "string") {
      return Response.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return Response.json(
        { error: "Comment content cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 500) {
      return Response.json(
        { error: "Comment content cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    if (isProduction) {
      // PostgreSQL implementation
      // Verify task exists and belongs to user's partner
      const taskResult = await sql`
        SELECT t.id, t.userid 
        FROM task t
        WHERE t.id = ${taskId}
      `;
      const task = taskResult.rows?.[0];

      if (!task) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }

      const taskOwnerId = task.userid;

      // Verify user is NOT the task owner (can't comment on own tasks)
      if (taskOwnerId === userId) {
        return Response.json(
          { error: "Cannot comment on your own tasks" },
          { status: 400 }
        );
      }

      // Verify partnership exists
      const partnershipResult = await sql`
        SELECT id FROM partnership 
        WHERE (usera = ${userId} AND userb = ${taskOwnerId}) 
           OR (usera = ${taskOwnerId} AND userb = ${userId})
      `;

      if (!partnershipResult.rows || partnershipResult.rows.length === 0) {
        return Response.json(
          { error: "Can only comment on partner's tasks" },
          { status: 403 }
        );
      }

      // Check for existing comment (UNIQUE constraint will also catch this)
      const existingResult = await sql`
        SELECT id FROM comment 
        WHERE taskid = ${taskId} AND authorid = ${userId}
      `;

      if (existingResult.rows && existingResult.rows.length > 0) {
        return Response.json(
          {
            error:
              "You already have a comment on this task. Edit your existing comment instead.",
          },
          { status: 400 }
        );
      }

      // Create comment
      const id = generateId();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO comment (id, taskid, authorid, content, createdat, updatedat, readat, isread)
        VALUES (${id}, ${taskId}, ${userId}, ${trimmedContent}, ${now}, ${now}, NULL, 0)
      `;

      // Fetch the created comment with author info
      const createdResult = await sql`
        SELECT c.id, c.taskid, c.authorid, c.content, c.createdat, c.updatedat, c.readat, c.isread,
               u.name as authorname, u.email as authoremail
        FROM comment c
        JOIN "user" u ON c.authorid = u.id
        WHERE c.id = ${id}
      `;

      const created = createdResult.rows?.[0];
      if (!created) {
        return Response.json(
          { error: "Failed to create comment" },
          { status: 500 }
        );
      }

      const comment: CommentWithAuthor = {
        id: created.id,
        taskId: created.taskid,
        authorId: created.authorid,
        content: created.content,
        createdAt: created.createdat,
        updatedAt: created.updatedat,
        readAt: created.readat,
        isRead: created.isread,
        authorName: created.authorname,
        authorEmail: created.authoremail,
      };

      return Response.json({ comment }, { status: 201 });
    } else {
      // SQLite implementation
      // Verify task exists and belongs to user's partner
      const task = appDb
        .prepare("SELECT id, userId FROM task WHERE id = ?")
        .get(taskId) as { id: string; userId: string } | undefined;

      if (!task) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }

      const taskOwnerId = task.userId;

      // Verify user is NOT the task owner
      if (taskOwnerId === userId) {
        return Response.json(
          { error: "Cannot comment on your own tasks" },
          { status: 400 }
        );
      }

      // Verify partnership exists
      const partnership = appDb
        .prepare(
          `SELECT id FROM partnership 
           WHERE (userA = ? AND userB = ?) OR (userA = ? AND userB = ?)`
        )
        .get(userId, taskOwnerId, taskOwnerId, userId);

      if (!partnership) {
        return Response.json(
          { error: "Can only comment on partner's tasks" },
          { status: 403 }
        );
      }

      // Check for existing comment
      const existing = appDb
        .prepare("SELECT id FROM comment WHERE taskId = ? AND authorId = ?")
        .get(taskId, userId);

      if (existing) {
        return Response.json(
          {
            error:
              "You already have a comment on this task. Edit your existing comment instead.",
          },
          { status: 400 }
        );
      }

      // Create comment
      const id = generateId();
      const now = new Date().toISOString();

      appDb
        .prepare(
          `INSERT INTO comment (id, taskId, authorId, content, createdAt, updatedAt, readAt, isRead)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 0)`
        )
        .run(id, taskId, userId, trimmedContent, now, now);

      // Fetch the created comment with author info
      const comment = appDb
        .prepare(
          `SELECT c.id, c.taskId, c.authorId, c.content, c.createdAt, c.updatedAt, c.readAt, c.isRead,
                  u.name as authorName, u.email as authorEmail
           FROM comment c
           JOIN user u ON c.authorId = u.id
           WHERE c.id = ?`
        )
        .get(id) as CommentWithAuthor;

      return Response.json({ comment }, { status: 201 });
    }
  } catch (error) {
    console.error("Comments POST error:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
