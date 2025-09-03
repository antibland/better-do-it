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

  // Check if current user is already in a partnership
  const isProduction = process.env.NODE_ENV === "production";
  let existingPartnership;

  if (isProduction) {
    try {
      const result = await sql`
        SELECT id FROM partnership WHERE usera = ${userId} OR userb = ${userId}
      `;
      existingPartnership = result.rows[0];
    } catch (error) {
      console.error("PostgreSQL partnership check error:", error);
      return Response.json({ error: "Database error" }, { status: 500 });
    }
  } else {
    existingPartnership = appDb
      .prepare(`SELECT id FROM partnership WHERE userA = ? OR userB = ?`)
      .get(userId, userId);
  }

  if (existingPartnership) {
    return Response.json(
      { error: "You are already in a partnership" },
      { status: 400 }
    );
  }

  // Check if invitee is already in a partnership
  let inviteePartnership;
  if (isProduction) {
    try {
      const inviteeResult = await sql`
        SELECT p.id FROM partnership p 
        JOIN "user" u ON (p.usera = u.id OR p.userb = u.id)
        WHERE u.email = ${inviteeEmail}
      `;
      inviteePartnership = inviteeResult.rows[0];
    } catch (error) {
      console.error("PostgreSQL invitee partnership check error:", error);
      return Response.json({ error: "Database error" }, { status: 500 });
    }
  } else {
    inviteePartnership = appDb
      .prepare(
        `
        SELECT p.id FROM partnership p 
        JOIN user u ON (p.userA = u.id OR p.userB = u.id)
        WHERE u.email = ?
      `
      )
      .get(inviteeEmail);
  }

  if (inviteePartnership) {
    return Response.json(
      { error: "Invitee is already in a partnership" },
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

  const isProduction = process.env.NODE_ENV === "production";

  try {
    let invites;

    if (isProduction) {
      const result = await sql`
        SELECT i.id, i.code, i.inviterid, i.inviteeemail, i.status, i.expiresat, i.createdat, i.acceptedat,
               u.name as inviterName
        FROM invite i
        JOIN "user" u ON i.inviterid = u.id
        WHERE i.inviteeemail = ${session.user.email}
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
          WHERE i.inviteeEmail = ?
          AND i.status = 'pending'
          AND datetime(i.expiresAt) > datetime('now')
          ORDER BY i.createdAt DESC
        `
        )
        .all(session.user.email);

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
