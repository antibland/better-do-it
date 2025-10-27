import { auth } from "@/lib/auth";
import { appDb } from "@/lib/db";
import { sql } from "@/lib/db-config";
import { CommentWithAuthor } from "@/types/comment";

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";
    const { id: commentId } = await params;

    // Parse request body
    let body: { content?: string; isRead?: boolean };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { content, isRead } = body;

    // Must provide either content or isRead
    if (content === undefined && isRead === undefined) {
      return Response.json(
        { error: "Must provide either content or isRead" },
        { status: 400 }
      );
    }

    if (isProduction) {
      // PostgreSQL implementation
      // Fetch the comment with task info
      const commentResult = await sql`
        SELECT c.id, c.taskid, c.authorid, c.content, c.createdat, c.updatedat, c.readat, c.isread,
               t.userid as taskownerid,
               u.name as authorname, u.email as authoremail
        FROM comment c
        JOIN task t ON c.taskid = t.id
        JOIN "user" u ON c.authorid = u.id
        WHERE c.id = ${commentId}
      `;

      const comment = commentResult.rows?.[0];
      if (!comment) {
        return Response.json({ error: "Comment not found" }, { status: 404 });
      }

      const isAuthor = comment.authorid === userId;
      const isTaskOwner = comment.taskownerid === userId;

      // If updating content, must be author
      if (content !== undefined) {
        if (!isAuthor) {
          return Response.json(
            { error: "Only the comment author can edit content" },
            { status: 403 }
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

        const now = new Date().toISOString();
        await sql`
          UPDATE comment 
          SET content = ${trimmedContent}, updatedat = ${now}
          WHERE id = ${commentId}
        `;
      }

      // If marking as read, must be task owner
      if (isRead !== undefined) {
        if (!isTaskOwner) {
          return Response.json(
            { error: "Only the task owner can mark comments as read" },
            { status: 403 }
          );
        }

        const now = new Date().toISOString();
        await sql`
          UPDATE comment 
          SET isread = ${isRead ? 1 : 0}, readat = ${isRead ? now : null}
          WHERE id = ${commentId}
        `;
      }

      // Fetch updated comment
      const updatedResult = await sql`
        SELECT c.id, c.taskid, c.authorid, c.content, c.createdat, c.updatedat, c.readat, c.isread,
               u.name as authorname, u.email as authoremail
        FROM comment c
        JOIN "user" u ON c.authorid = u.id
        WHERE c.id = ${commentId}
      `;

      const updated = updatedResult.rows?.[0];
      if (!updated) {
        return Response.json(
          { error: "Failed to fetch updated comment" },
          { status: 500 }
        );
      }

      const updatedComment: CommentWithAuthor = {
        id: updated.id,
        taskId: updated.taskid,
        authorId: updated.authorid,
        content: updated.content,
        createdAt: updated.createdat,
        updatedAt: updated.updatedat,
        readAt: updated.readat,
        isRead: updated.isread,
        authorName: updated.authorname,
        authorEmail: updated.authoremail,
      };

      return Response.json({ comment: updatedComment });
    } else {
      // SQLite implementation
      // Fetch the comment with task info
      const comment = appDb
        .prepare(
          `SELECT c.id, c.taskId, c.authorId, c.content, c.createdAt, c.updatedAt, c.readAt, c.isRead,
                  t.userId as taskOwnerId,
                  u.name as authorName, u.email as authorEmail
           FROM comment c
           JOIN task t ON c.taskId = t.id
           JOIN user u ON c.authorId = u.id
           WHERE c.id = ?`
        )
        .get(commentId) as
        | (CommentWithAuthor & { taskOwnerId: string })
        | undefined;

      if (!comment) {
        return Response.json({ error: "Comment not found" }, { status: 404 });
      }

      const isAuthor = comment.authorId === userId;
      const isTaskOwner = comment.taskOwnerId === userId;

      // If updating content, must be author
      if (content !== undefined) {
        if (!isAuthor) {
          return Response.json(
            { error: "Only the comment author can edit content" },
            { status: 403 }
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

        const now = new Date().toISOString();
        appDb
          .prepare("UPDATE comment SET content = ?, updatedAt = ? WHERE id = ?")
          .run(trimmedContent, now, commentId);
      }

      // If marking as read, must be task owner
      if (isRead !== undefined) {
        if (!isTaskOwner) {
          return Response.json(
            { error: "Only the task owner can mark comments as read" },
            { status: 403 }
          );
        }

        const now = new Date().toISOString();
        appDb
          .prepare("UPDATE comment SET isRead = ?, readAt = ? WHERE id = ?")
          .run(isRead ? 1 : 0, isRead ? now : null, commentId);
      }

      // Fetch updated comment
      const updatedComment = appDb
        .prepare(
          `SELECT c.id, c.taskId, c.authorId, c.content, c.createdAt, c.updatedAt, c.readAt, c.isRead,
                  u.name as authorName, u.email as authorEmail
           FROM comment c
           JOIN user u ON c.authorId = u.id
           WHERE c.id = ?`
        )
        .get(commentId) as CommentWithAuthor;

      return Response.json({ comment: updatedComment });
    }
  } catch (error) {
    console.error("Comment PATCH error:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const isProduction = process.env.NODE_ENV === "production";
    const { id: commentId } = await params;

    if (isProduction) {
      // PostgreSQL implementation
      // Fetch the comment to verify ownership
      const commentResult = await sql`
        SELECT id, authorid FROM comment WHERE id = ${commentId}
      `;

      const comment = commentResult.rows?.[0];
      if (!comment) {
        return Response.json({ error: "Comment not found" }, { status: 404 });
      }

      // Verify user is the author
      if (comment.authorid !== userId) {
        return Response.json(
          { error: "Only the comment author can delete it" },
          { status: 403 }
        );
      }

      // Delete the comment
      await sql`DELETE FROM comment WHERE id = ${commentId}`;

      return Response.json({ success: true, message: "Comment deleted" });
    } else {
      // SQLite implementation
      // Fetch the comment to verify ownership
      const comment = appDb
        .prepare("SELECT id, authorId FROM comment WHERE id = ?")
        .get(commentId) as { id: string; authorId: string } | undefined;

      if (!comment) {
        return Response.json({ error: "Comment not found" }, { status: 404 });
      }

      // Verify user is the author
      if (comment.authorId !== userId) {
        return Response.json(
          { error: "Only the comment author can delete it" },
          { status: 403 }
        );
      }

      // Delete the comment
      appDb.prepare("DELETE FROM comment WHERE id = ?").run(commentId);

      return Response.json({ success: true, message: "Comment deleted" });
    }
  } catch (error) {
    console.error("Comment DELETE error:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
