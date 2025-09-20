/**
 * Simple, Bulletproof Health Check
 *
 * Just test the basics - no fancy database queries or complex logic.
 * This should work in both dev and production without issues.
 */
export async function GET() {
  const checks: Array<{
    name: string;
    status: "pass" | "fail";
    message: string;
    duration: number;
  }> = [];

  const startTime = Date.now();

  const runCheck = async (
    name: string,
    checkFn: () => Promise<string>
  ): Promise<void> => {
    const checkStart = Date.now();
    const check = {
      name,
      status: "pass" as "pass" | "fail",
      message: "Running...",
      duration: 0,
    };
    checks.push(check);

    try {
      const result = await checkFn();
      check.status = "pass";
      check.message = result;
      check.duration = Date.now() - checkStart;
    } catch (error) {
      check.status = "fail";
      check.message = error instanceof Error ? error.message : "Unknown error";
      check.duration = Date.now() - checkStart;
    }
  };

  // 1. Basic Database Connection
  await runCheck("Database Connection", async () => {
    const { appDb } = await import("@/lib/db");
    await appDb.prepare("SELECT 1").get();
    return "Database connected";
  });

  // 2. Environment Variables
  await runCheck("Environment Config", async () => {
    const required = ["RESEND_API_KEY", "FROM_EMAIL"];
    const missing = required.filter((varName) => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing: ${missing.join(", ")}`);
    }
    return "Environment configured";
  });

  // 3. Email Service
  await runCheck("Email Service", async () => {
    const { Resend } = await import("resend");
    new Resend(process.env.RESEND_API_KEY);
    return "Email service ready";
  });

  // 4. Authentication
  await runCheck("Authentication", async () => {
    const { auth } = await import("@/lib/auth");
    if (!auth) {
      throw new Error("Auth not initialized");
    }
    return "Authentication ready";
  });

  // 5. Database Tables (Critical for invite system)
  await runCheck("Database Tables", async () => {
    const { appDb } = await import("@/lib/db");

    // Test each critical table exists by doing a simple count
    const tables = ["user", "task", "partnership", "invite"];
    let accessibleTables = 0;

    for (const table of tables) {
      try {
        await appDb.prepare(`SELECT COUNT(*) FROM ${table}`).get();
        accessibleTables++;
      } catch {
        // Table doesn't exist or can't be accessed
      }
    }

    if (accessibleTables !== tables.length) {
      throw new Error(
        `Only ${accessibleTables}/${tables.length} tables accessible`
      );
    }

    return `All ${tables.length} critical tables accessible`;
  });

  // 6. Invite System (The original problem)
  await runCheck("Invite System", async () => {
    const { appDb } = await import("@/lib/db");

    // Test that we can create and query invites
    try {
      // Check if invite table has the right structure by querying it
      const inviteCount = (await appDb
        .prepare("SELECT COUNT(*) FROM invite")
        .get()) as { "COUNT(*)": number };

      // Test that we can query invite data (this was the original issue)
      await appDb.prepare("SELECT id, code, status FROM invite LIMIT 1").all();

      return `Invite system functional (${inviteCount["COUNT(*)"]} invites)`;
    } catch (error) {
      throw new Error(
        `Invite system broken: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

  // 7. Partner System
  await runCheck("Partner System", async () => {
    const { appDb } = await import("@/lib/db");

    try {
      const partnershipCount = (await appDb
        .prepare("SELECT COUNT(*) FROM partnership")
        .get()) as { "COUNT(*)": number };
      return `Partner system functional (${partnershipCount["COUNT(*)"]} partnerships)`;
    } catch (error) {
      throw new Error(
        `Partner system broken: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

  // Calculate overall status
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const overall = failedChecks > 0 ? "unhealthy" : "healthy";

  return Response.json({
    overall,
    checks,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    duration: Date.now() - startTime,
  });
}
