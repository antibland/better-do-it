import { auth } from "@/lib/auth";
import { appDb, generateId } from "@/lib/db";
import { sql } from "@/lib/db-config";
import {
  generateInviteCode,
  sendInviteToExistingUser,
  sendInviteToNewUser,
} from "@/lib/email";
import { Invite } from "@/types";

// Interface for SQLite invite result
interface SQLiteInviteRow {
  id: string;
  code: string;
  inviterId: string;
  inviteeEmail: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  inviterName: string;
}

/**
 * Invite management route
 * - POST: create a new invitation
 * - GET: get pending invitations for the current user
 * - DELETE: revoke an invitation
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

// Check if user exists by email
async function userExistsByEmail(email: string): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    try {
      const result = await sql`SELECT id FROM "user" WHERE email = ${email}`;
      return result.rows.length > 0;
    } catch (error) {
      console.error("PostgreSQL user check error:", error);
      return false;
    }
  } else {
    try {
      const result = appDb
        .prepare(`SELECT id FROM user WHERE email = ?`)
        .get(email);
      return !!result;
    } catch (error) {
      console.error("SQLite user check error:", error);
      return false;
    }
  }
}

// Delete invite from database
async function deleteInviteFromDb(inviteId: string): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    try {
      await sql`DELETE FROM invite WHERE id = ${inviteId}`;
      return true;
    } catch (error) {
      console.error("PostgreSQL invite deletion error:", error);
      return false;
    }
  } else {
    try {
      appDb.prepare(`DELETE FROM invite WHERE id = ?`).run(inviteId);
      return true;
    } catch (error) {
      console.error("SQLite invite deletion error:", error);
      return false;
    }
  }
}

// Create invite in database
async function createInviteInDb(
  inviterId: string,
  inviteeEmail: string,
  inviteCode: string
): Promise<Invite | null> {
  const isProduction = process.env.NODE_ENV === "production";
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  if (isProduction) {
    try {
      const result = await sql`
        INSERT INTO invite (id, code, inviterid, inviteeemail, status, expiresat, createdat)
        VALUES (${generateId()}, ${inviteCode}, ${inviterId}, ${inviteeEmail}, 'pending', ${expiresAt.toISOString()}, NOW())
        RETURNING id, code, inviterid, inviteeemail, status, expiresat, createdat, acceptedat
      `;

      const row = result.rows[0];
      if (!row) return null;

      return {
        id: row.id,
        code: row.code,
        inviterId: row.inviterid,
        inviteeEmail: row.inviteeemail,
        status: row.status,
        expiresAt: row.expiresat,
        createdAt: row.createdat,
        acceptedAt: row.acceptedat,
      };
    } catch (error) {
      console.error("PostgreSQL invite creation error:", error);
      return null;
    }
  } else {
    try {
      const inviteId = generateId();
      const expiresAtStr = expiresAt
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      appDb
        .prepare(
          `
          INSERT INTO invite (id, code, inviterId, inviteeEmail, status, expiresAt, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          inviteId,
          inviteCode,
          inviterId,
          inviteeEmail,
          "pending",
          expiresAtStr,
          new Date().toISOString().slice(0, 19).replace("T", " ")
        );

      return {
        id: inviteId,
        code: inviteCode,
        inviterId,
        inviteeEmail,
        status: "pending",
        expiresAt: expiresAtStr,
        createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        acceptedAt: null,
      };
    } catch (error) {
      console.error("SQLite invite creation error:", error);
      return null;
    }
  }
}

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const inviterName = session.user.name as string;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inviteeEmail =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!inviteeEmail) {
    return Response.json(
      { error: "Invitee email is required" },
      { status: 400 }
    );
  }

  // Check if partnership already exists between these users
  const isProduction = process.env.NODE_ENV === "production";
  let existingPartnership;
  let existingPendingInvite;

  if (isProduction) {
    try {
      // First check if the invitee exists
      const inviteeResult = await sql`
        SELECT id FROM "user" WHERE email = ${inviteeEmail}
      `;
      const invitee = inviteeResult.rows[0];

      if (invitee) {
        // Check if partnership already exists between these users
        const result = await sql`
          SELECT id FROM partnership WHERE (usera = ${userId} AND userb = ${invitee.id}) OR (usera = ${invitee.id} AND userb = ${userId})
        `;
        existingPartnership = result.rows[0];
      }

      // Check if there's already a pending invite to this email
      const pendingInviteResult = await sql`
        SELECT id FROM invite 
        WHERE inviterid = ${userId} 
        AND inviteeemail = ${inviteeEmail} 
        AND status = 'pending' 
        AND expiresat > NOW()
      `;
      existingPendingInvite = pendingInviteResult.rows[0];
    } catch (error) {
      console.error("PostgreSQL partnership check error:", error);
      return Response.json({ error: "Database error" }, { status: 500 });
    }
  } else {
    // First check if the invitee exists
    const invitee = appDb
      .prepare(`SELECT id FROM user WHERE email = ?`)
      .get(inviteeEmail) as { id: string } | undefined;

    if (invitee) {
      // Check if partnership already exists between these users
      existingPartnership = appDb
        .prepare(
          `SELECT id FROM partnership WHERE (userA = ? AND userB = ?) OR (userA = ? AND userB = ?)`
        )
        .get(userId, invitee.id, invitee.id, userId);
    }

    // Check if there's already a pending invite to this email
    existingPendingInvite = appDb
      .prepare(
        `SELECT id FROM invite 
         WHERE inviterId = ? 
         AND inviteeEmail = ? 
         AND status = 'pending' 
         AND datetime(expiresAt) > datetime('now')`
      )
      .get(userId, inviteeEmail);
  }

  if (existingPartnership) {
    return Response.json(
      { error: "Partnership already exists with this user" },
      { status: 400 }
    );
  }

  if (existingPendingInvite) {
    return Response.json(
      { error: `You've already sent an invite to ${inviteeEmail}` },
      { status: 400 }
    );
  }

  // Generate invite code and create invite
  const inviteCode = generateInviteCode();
  const invite = await createInviteInDb(userId, inviteeEmail, inviteCode);

  if (!invite) {
    return Response.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  // Check if invitee is an existing user or new user
  const isExistingUser = await userExistsByEmail(inviteeEmail);

  // Send appropriate email
  let emailResult;
  if (isExistingUser) {
    emailResult = await sendInviteToExistingUser(
      inviterName,
      inviteeEmail,
      inviteCode
    );
  } else {
    emailResult = await sendInviteToNewUser(
      inviterName,
      inviteeEmail,
      inviteCode
    );
  }

  if (!emailResult.success) {
    // If email fails, delete the invite and return error
    // Note: In production, you might want to queue failed emails for retry
    console.error("Email sending failed:", emailResult.error);

    // Clean up the invite from database since email failed
    await deleteInviteFromDb(invite.id);

    return Response.json(
      {
        error: "Failed to send invitation email",
        details: emailResult.error,
      },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: `Invitation sent to ${inviteeEmail}`,
    invite: {
      id: invite.id,
      code: invite.code,
      inviteeEmail: invite.inviteeEmail,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    },
  });
}

export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  try {
    let invites;

    if (isProduction) {
      const result = await sql`
        SELECT i.id, i.code, i.inviterid, i.inviteeemail, i.status, i.expiresat, i.createdat, i.acceptedat,
               u.name as inviterName
        FROM invite i
        JOIN "user" u ON i.inviterid = u.id
        WHERE i.inviterid = ${userId}
        AND i.status = 'pending'
        AND i.expiresat > NOW()
        ORDER BY i.createdat DESC
      `;

      invites = result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        inviterId: row.inviterid,
        inviteeEmail: row.inviteeemail,
        status: row.status,
        expiresAt: row.expiresat,
        createdAt: row.createdat,
        acceptedAt: row.acceptedat,
        inviterName: row.invitername,
      }));
    } else {
      const result = await appDb
        .prepare(
          `
          SELECT i.id, i.code, i.inviterId, i.inviteeEmail, i.status, i.expiresAt, i.createdAt, i.acceptedAt,
                 u.name as inviterName
          FROM invite i
          JOIN user u ON i.inviterId = u.id
          WHERE i.inviterId = ?
          AND i.status = 'pending'
          AND datetime(i.expiresAt) > datetime('now')
          ORDER BY i.createdAt DESC
        `
        )
        .all(userId);

      invites = (result as SQLiteInviteRow[]).map((row) => ({
        id: row.id,
        code: row.code,
        inviterId: row.inviterId,
        inviteeEmail: row.inviteeEmail,
        status: row.status,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        acceptedAt: row.acceptedAt,
        inviterName: row.inviterName,
      }));
    }

    return Response.json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error("Get invites error:", error);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  let body: { inviteId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inviteId = body?.inviteId;
  if (!inviteId) {
    return Response.json({ error: "Invite ID is required" }, { status: 400 });
  }

  try {
    if (isProduction) {
      // Verify the invite exists and belongs to the current user
      const result = await sql`
        SELECT id FROM invite WHERE id = ${inviteId} AND inviterid = ${userId} AND status = 'pending'
      `;

      if (result.rows.length === 0) {
        return Response.json(
          { error: "Invite not found or access denied" },
          { status: 404 }
        );
      }

      // Delete the invite
      await sql`DELETE FROM invite WHERE id = ${inviteId}`;
    } else {
      // Verify the invite exists and belongs to the current user
      const invite = appDb
        .prepare(
          `SELECT id FROM invite WHERE id = ? AND inviterId = ? AND status = 'pending'`
        )
        .get(inviteId, userId);

      if (!invite) {
        return Response.json(
          { error: "Invite not found or access denied" },
          { status: 404 }
        );
      }

      // Delete the invite
      appDb.prepare(`DELETE FROM invite WHERE id = ?`).run(inviteId);
    }

    return Response.json({ success: true, message: "Invitation revoked" });
  } catch (error) {
    console.error("Revoke invite error:", error);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
