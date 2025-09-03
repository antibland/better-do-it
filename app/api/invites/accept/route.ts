import { auth } from "@/lib/auth";
import { appDb, generateId } from "@/lib/db";
import { sql } from "@/lib/db-config";

// Interface for SQLite invite result
interface SQLiteInviteResult {
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
 * Accept invitation route
 * - POST: accept a partnership invitation by invite code
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

// Get invite by code
async function getInviteByCode(inviteCode: string) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    try {
      const result = await sql`
        SELECT i.id, i.code, i.inviterid, i.inviteeemail, i.status, i.expiresat, i.createdat, i.acceptedat,
               u.name as inviterName
        FROM invite i
        JOIN "user" u ON i.inviterid = u.id
        WHERE i.code = ${inviteCode}
      `;
      return result.rows[0];
    } catch (error) {
      console.error("PostgreSQL invite lookup error:", error);
      return null;
    }
  } else {
    try {
      const result = (await appDb
        .prepare(
          `
          SELECT i.id, i.code, i.inviterId, i.inviteeEmail, i.status, i.expiresAt, i.createdAt, i.acceptedAt,
                 u.name as inviterName
          FROM invite i
          JOIN user u ON i.inviterId = u.id
          WHERE i.code = ?
        `
        )
        .get(inviteCode)) as SQLiteInviteResult;

      // Transform SQLite result to match PostgreSQL format
      if (result) {
        return {
          id: result.id,
          code: result.code,
          inviterid: result.inviterId,
          inviteeemail: result.inviteeEmail,
          status: result.status,
          expiresat: result.expiresAt,
          createdat: result.createdAt,
          acceptedat: result.acceptedAt,
          inviterName: result.inviterName,
        };
      }
      return result;
    } catch (error) {
      console.error("SQLite invite lookup error:", error);
      return null;
    }
  }
}

// Update invite status
async function updateInviteStatus(inviteId: string, status: string) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    try {
      await sql`
        UPDATE invite 
        SET status = ${status}, acceptedat = ${status === "accepted" ? "NOW()" : null}
        WHERE id = ${inviteId}
      `;
      return true;
    } catch (error) {
      console.error("PostgreSQL invite update error:", error);
      return false;
    }
  } else {
    try {
      const acceptedAt =
        status === "accepted"
          ? new Date().toISOString().slice(0, 19).replace("T", " ")
          : null;
      appDb
        .prepare(
          `
          UPDATE invite 
          SET status = ?, acceptedAt = ?
          WHERE id = ?
        `
        )
        .run(status, acceptedAt, inviteId);
      return true;
    } catch (error) {
      console.error("SQLite invite update error:", error);
      return false;
    }
  }
}

// Create partnership
async function createPartnership(userA: string, userB: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const partnershipId = generateId();

  if (isProduction) {
    try {
      await sql`
        INSERT INTO partnership (id, usera, userb, createdat)
        VALUES (${partnershipId}, ${userA}, ${userB}, NOW())
      `;
      return partnershipId;
    } catch (error) {
      console.error("PostgreSQL partnership creation error:", error);
      return null;
    }
  } else {
    try {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      appDb
        .prepare(
          `
          INSERT INTO partnership (id, userA, userB, createdAt)
          VALUES (?, ?, ?, ?)
        `
        )
        .run(partnershipId, userA, userB, now);
      return partnershipId;
    } catch (error) {
      console.error("SQLite partnership creation error:", error);
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
  const userEmail = session.user.email as string;

  let body: { inviteCode?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inviteCode =
    typeof body?.inviteCode === "string" ? body.inviteCode.trim() : "";
  if (!inviteCode) {
    return Response.json({ error: "Invite code is required" }, { status: 400 });
  }

  // Get the invite
  const invite = await getInviteByCode(inviteCode);
  if (!invite) {
    return Response.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check if invite is for the current user
  console.log("Email comparison:", {
    inviteeEmail: invite.inviteeemail,
    userEmail: userEmail,
    match: invite.inviteeemail === userEmail,
    inviteeEmailLength: invite.inviteeemail?.length,
    userEmailLength: userEmail?.length,
    inviteeEmailTrimmed: invite.inviteeemail?.trim(),
    userEmailTrimmed: userEmail?.trim(),
    inviteeEmailLower: invite.inviteeemail?.toLowerCase(),
    userEmailLower: userEmail?.toLowerCase(),
    inviteeEmailCharCodes: invite.inviteeemail
      ?.split("")
      .map((c: string) => c.charCodeAt(0)),
    userEmailCharCodes: userEmail
      ?.split("")
      .map((c: string) => c.charCodeAt(0)),
  });

  if (invite.inviteeemail !== userEmail) {
    return Response.json(
      { error: "This invitation is not for you" },
      { status: 403 }
    );
  }

  // Check if invite is still pending
  if (invite.status !== "pending") {
    return Response.json(
      { error: "This invitation has already been used or expired" },
      { status: 400 }
    );
  }

  // Check if invite has expired
  const now = new Date();
  const expiresAt = new Date(invite.expiresat);
  if (now > expiresAt) {
    // Mark invite as expired
    await updateInviteStatus(invite.id, "expired");
    return Response.json(
      { error: "This invitation has expired" },
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

  // Check if inviter is still available (not in another partnership)
  let inviterPartnership;
  if (isProduction) {
    try {
      const result = await sql`
        SELECT id FROM partnership WHERE usera = ${invite.inviterid} OR userb = ${invite.inviterid}
      `;
      inviterPartnership = result.rows[0];
    } catch (error) {
      console.error("PostgreSQL inviter partnership check error:", error);
      return Response.json({ error: "Database error" }, { status: 500 });
    }
  } else {
    inviterPartnership = appDb
      .prepare(`SELECT id FROM partnership WHERE userA = ? OR userB = ?`)
      .get(invite.inviterid, invite.inviterid);
  }

  if (inviterPartnership) {
    // Mark invite as expired since inviter is no longer available
    await updateInviteStatus(invite.id, "expired");
    return Response.json(
      { error: "Inviter is no longer available for partnership" },
      { status: 400 }
    );
  }

  // Create the partnership
  const partnershipId = await createPartnership(invite.inviterid, userId);
  if (!partnershipId) {
    return Response.json(
      { error: "Failed to create partnership" },
      { status: 500 }
    );
  }

  // Mark invite as accepted
  const updateSuccess = await updateInviteStatus(invite.id, "accepted");
  if (!updateSuccess) {
    console.error("Failed to update invite status");
    // Partnership was created but invite status update failed
    // This is not critical, but we should log it
  }

  return Response.json({
    success: true,
    message: "Partnership created successfully!",
    partnership: {
      id: partnershipId,
      inviterId: invite.inviterid,
      inviterName: invite.invitername,
      userId,
      userName: session.user.name,
    },
  });
}
