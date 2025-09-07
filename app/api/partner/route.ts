import { auth } from "@/lib/auth";
import { appDb, generateId, PartnershipRow } from "@/lib/db";
import { sql } from "@vercel/postgres";

/**
 * Partnership management route
 * - GET: return all partners for the auth user
 * - POST: pair with another user by email (creates new partnership)
 * - DELETE: unpair from a specific partnership (requires partnershipId in body)
 */

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

function getPartnershipsForUser(userId: string): PartnershipRow[] {
  return appDb
    .prepare(
      `SELECT id, userA, userB, createdAt FROM partnership WHERE userA = ? OR userB = ?`
    )
    .all(userId, userId) as PartnershipRow[];
}

async function getPartnershipsForUserPostgres(userId: string) {
  const result = await sql`
    SELECT id, usera, userb, createdat FROM partnership WHERE usera = ${userId} OR userb = ${userId}
  `;

  // Transform to match PartnershipRow interface
  return (result.rows || []).map((row) => ({
    id: row.id,
    userA: row.usera,
    userB: row.userb,
    createdAt: row.createdat,
  }));
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
      const partnerships = await getPartnershipsForUserPostgres(userId);
      const partners = [];

      for (const partnership of partnerships) {
        // Determine which user is the partner
        const partnerId =
          partnership.userA === userId ? partnership.userB : partnership.userA;
        const partner = await getUserByIdPostgres(partnerId);

        if (!partner) {
          // Partner user was deleted, clean up the partnership
          await sql`DELETE FROM partnership WHERE id = ${partnership.id}`;
          continue;
        }

        partners.push({
          id: partner.id,
          email: partner.email,
          name: partner.name,
          partnershipId: partnership.id,
          createdAt: partnership.createdAt,
        });
      }

      return Response.json({ partners });
    } catch (error) {
      console.error("PostgreSQL partner GET error:", error);
      return Response.json(
        {
          error: "Database error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } else {
    // SQLite implementation
    const partnerships = getPartnershipsForUser(userId);
    const partners = [];

    for (const partnership of partnerships) {
      // Determine which user is the partner
      const partnerId =
        partnership.userA === userId ? partnership.userB : partnership.userA;
      const partner = getUserById(partnerId);

      if (!partner) {
        // Partner user was deleted, clean up the partnership
        appDb
          .prepare(`DELETE FROM partnership WHERE id = ?`)
          .run(partnership.id);
        continue;
      }

      partners.push({
        id: partner.id,
        email: partner.email,
        name: partner.name,
        partnershipId: partnership.id,
        createdAt: partnership.createdAt,
      });
    }

    return Response.json({ partners });
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

      // Check if partnership already exists between these users
      const existingPartnership = await sql`
        SELECT id FROM partnership WHERE (usera = ${userId} AND userb = ${partner.id}) OR (usera = ${partner.id} AND userb = ${userId})
      `;

      if (existingPartnership.rows.length > 0) {
        return Response.json(
          { error: "Partnership already exists with this user" },
          { status: 400 }
        );
      }

      // Create the partnership
      const partnershipId = generateId();
      const now = new Date().toISOString();

      await sql`
        INSERT INTO partnership (id, usera, userb, createdat) VALUES (${partnershipId}, ${userId}, ${partner.id}, ${now})
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
        {
          error: "Database error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } else {
    // SQLite implementation
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

    // Check if partnership already exists between these users
    const existingPartnership = appDb
      .prepare(
        `SELECT id FROM partnership WHERE (userA = ? AND userB = ?) OR (userA = ? AND userB = ?)`
      )
      .get(userId, partner.id, partner.id, userId);

    if (existingPartnership) {
      return Response.json(
        { error: "Partnership already exists with this user" },
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

  let body: { partnershipId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnershipId = body?.partnershipId;
  if (!partnershipId) {
    return Response.json(
      { error: "Partnership ID is required" },
      { status: 400 }
    );
  }

  if (isProduction) {
    // PostgreSQL implementation
    try {
      // Verify the partnership exists and the user is part of it
      const partnership = await sql`
        SELECT id FROM partnership WHERE id = ${partnershipId} AND (usera = ${userId} OR userb = ${userId})
      `;

      if (partnership.rows.length === 0) {
        return Response.json(
          { error: "Partnership not found or access denied" },
          { status: 404 }
        );
      }

      await sql`DELETE FROM partnership WHERE id = ${partnershipId}`;
      return Response.json({ ok: true });
    } catch (error) {
      console.error("PostgreSQL partner DELETE error:", error);
      return Response.json(
        {
          error: "Database error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } else {
    // SQLite implementation
    // Verify the partnership exists and the user is part of it
    const partnership = appDb
      .prepare(
        `SELECT id FROM partnership WHERE id = ? AND (userA = ? OR userB = ?)`
      )
      .get(partnershipId, userId, userId);

    if (!partnership) {
      return Response.json(
        { error: "Partnership not found or access denied" },
        { status: 404 }
      );
    }

    appDb.prepare(`DELETE FROM partnership WHERE id = ?`).run(partnershipId);
    return Response.json({ ok: true });
  }
}
