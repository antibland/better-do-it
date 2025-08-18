import { auth } from "@/lib/auth";
import { appDb, generateId, PartnershipRow } from "@/lib/db";
import { sql } from "@vercel/postgres";

/**
 * Partnership management route
 * - GET: return current partner info for the auth user
 * - POST: pair with another user by email
 * - DELETE: unpair from current partnership
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

function getPartnershipForUser(userId: string): PartnershipRow | undefined {
  return appDb
    .prepare(
      `SELECT id, userA, userB, createdAt FROM partnership WHERE userA = ? OR userB = ?`
    )
    .get(userId, userId) as PartnershipRow | undefined;
}

async function getPartnershipForUserPostgres(userId: string) {
  const result = await sql`
    SELECT id, user_a, user_b, created_at FROM partnership WHERE user_a = ${userId} OR user_b = ${userId}
  `;
  const row = result.rows?.[0];
  if (!row) return undefined;
  
  // Transform to match PartnershipRow interface
  return {
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    createdAt: row.created_at,
  };
}

function getUserById(
  userId: string
): { id: string; email: string; name: string } | undefined {
  return appDb
    .prepare(`SELECT id, email, name FROM user WHERE id = ?`)
    .get(userId) as { id: string; email: string; name: string } | undefined;
}

async function getUserByIdPostgres(userId: string) {
  const result = await sql`
    SELECT id, email, name FROM "user" WHERE id = ${userId}
  `;
  const row = result.rows?.[0];
  if (!row) return undefined;
  
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // PostgreSQL implementation
    try {
      const partnership = await getPartnershipForUserPostgres(userId);

      if (!partnership) {
        return Response.json({ partner: null });
      }

      // Determine which user is the partner
      const partnerId =
        partnership.userA === userId ? partnership.userB : partnership.userA;
      const partner = await getUserByIdPostgres(partnerId);

      if (!partner) {
        // Partner user was deleted, clean up the partnership
        await sql`DELETE FROM partnership WHERE id = ${partnership.id}`;
        return Response.json({ partner: null });
      }

      return Response.json({
        partner: {
          id: partner.id,
          email: partner.email,
          name: partner.name,
          partnershipId: partnership.id,
          createdAt: partnership.createdAt,
        },
      });
    } catch (error) {
      console.error("PostgreSQL partner GET error:", error);
      return Response.json(
        { error: "Database error", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  } else {
    // SQLite implementation (existing code)
    const partnership = getPartnershipForUser(userId);

    if (!partnership) {
      return Response.json({ partner: null });
    }

    // Determine which user is the partner
    const partnerId =
      partnership.userA === userId ? partnership.userB : partnership.userA;
    const partner = getUserById(partnerId);

    if (!partner) {
      // Partner user was deleted, clean up the partnership
      appDb.prepare(`DELETE FROM partnership WHERE id = ?`).run(partnership.id);
      return Response.json({ partner: null });
    }

    return Response.json({
      partner: {
        id: partner.id,
        email: partner.email,
        name: partner.name,
        partnershipId: partnership.id,
        createdAt: partnership.createdAt,
      },
    });
  }
}

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerEmail =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!partnerEmail) {
    return Response.json(
      { error: "Partner email is required" },
      { status: 400 }
    );
  }

  if (isProduction) {
    // PostgreSQL implementation
    try {
      // Check if current user is already in a partnership
      const existingPartnership = await getPartnershipForUserPostgres(userId);
      if (existingPartnership) {
        return Response.json(
          { error: "You are already in a partnership" },
          { status: 400 }
        );
      }

      // Find the partner user by email
      const partnerResult = await sql`
        SELECT id, email, name FROM "user" WHERE email = ${partnerEmail}
      `;
      const partner = partnerResult.rows?.[0];

      if (!partner) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      if (partner.id === userId) {
        return Response.json(
          { error: "Cannot partner with yourself" },
          { status: 400 }
        );
      }

      // Check if partner is already in a partnership
      const partnerExistingPartnership = await getPartnershipForUserPostgres(partner.id);
      if (partnerExistingPartnership) {
        return Response.json(
          { error: "Partner is already in a partnership" },
          { status: 400 }
        );
      }

      // Create the partnership
      const partnershipId = generateId();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO partnership (id, user_a, user_b, created_at) VALUES (${partnershipId}, ${userId}, ${partner.id}, ${now})
      `;

      return Response.json({
        partner: {
          id: partner.id,
          email: partner.email,
          name: partner.name,
          partnershipId,
          createdAt: now,
        },
      });
    } catch (error) {
      console.error("PostgreSQL partner POST error:", error);
      return Response.json(
        { error: "Database error", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  } else {
    // SQLite implementation (existing code)
    // Check if current user is already in a partnership
    const existingPartnership = getPartnershipForUser(userId);
    if (existingPartnership) {
      return Response.json(
        { error: "You are already in a partnership" },
        { status: 400 }
      );
    }

    // Find the partner user by email
    const partner = appDb
      .prepare(`SELECT id, email, name FROM user WHERE email = ?`)
      .get(partnerEmail) as
      | { id: string; email: string; name: string }
      | undefined;

    if (!partner) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (partner.id === userId) {
      return Response.json(
        { error: "Cannot partner with yourself" },
        { status: 400 }
      );
    }

    // Check if partner is already in a partnership
    const partnerExistingPartnership = getPartnershipForUser(partner.id);
    if (partnerExistingPartnership) {
      return Response.json(
        { error: "Partner is already in a partnership" },
        { status: 400 }
      );
    }

    // Create the partnership
    const partnershipId = generateId();
    const now = new Date().toISOString().slice(0, 19).replace("T", " "); // SQLite format

    appDb
      .prepare(
        `INSERT INTO partnership (id, userA, userB, createdAt) VALUES (?, ?, ?, ?)`
      )
      .run(partnershipId, userId, partner.id, now);

    return Response.json({
      partner: {
        id: partner.id,
        email: partner.email,
        name: partner.name,
        partnershipId,
        createdAt: now,
      },
    });
  }
}

export async function DELETE(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // PostgreSQL implementation
    try {
      const partnership = await getPartnershipForUserPostgres(userId);

      if (!partnership) {
        return Response.json(
          { error: "No partnership to remove" },
          { status: 404 }
        );
      }

      await sql`DELETE FROM partnership WHERE id = ${partnership.id}`;
      return Response.json({ ok: true });
    } catch (error) {
      console.error("PostgreSQL partner DELETE error:", error);
      return Response.json(
        { error: "Database error", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  } else {
    // SQLite implementation (existing code)
    const partnership = getPartnershipForUser(userId);

    if (!partnership) {
      return Response.json(
        { error: "No partnership to remove" },
        { status: 404 }
      );
    }

    appDb.prepare(`DELETE FROM partnership WHERE id = ?`).run(partnership.id);
    return Response.json({ ok: true });
  }
}
