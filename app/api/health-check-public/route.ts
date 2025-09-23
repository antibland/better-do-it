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

  await runCheck("Database Connection", async () => {
    const { appDb } = await import("@/lib/db");
    await appDb.prepare("SELECT 1").get();
    return "Database connected";
  });

  await runCheck("Email Service", async () => {
    const { Resend } = await import("resend");
    new Resend(process.env.RESEND_API_KEY);
    return "Email service ready";
  });

  await runCheck("Authentication", async () => {
    const { auth } = await import("@/lib/auth");
    if (!auth) {
      throw new Error("Auth not initialized");
    }
    return "Authentication ready";
  });

  await runCheck("Database Tables", async () => {
    const { appDb } = await import("@/lib/db");

    const tables = ["user", "task", "partnership", "invite"];
    let accessibleTables = 0;

    for (const table of tables) {
      try {
        await appDb.prepare(`SELECT COUNT(*) FROM ${table}`).get();
        accessibleTables++;
      } catch {}
    }

    if (accessibleTables !== tables.length) {
      throw new Error(
        `Only ${accessibleTables}/${tables.length} tables accessible`
      );
    }

    return `All ${tables.length} critical tables accessible`;
  });

  await runCheck("Invite System", async () => {
    const { appDb } = await import("@/lib/db");

    try {
      const inviteCount = (await appDb
        .prepare("SELECT COUNT(*) FROM invite")
        .get()) as { "COUNT(*)": number };

      await appDb.prepare("SELECT id, code, status FROM invite LIMIT 1").all();

      return `Invite system functional (${inviteCount["COUNT(*)"]} invites)`;
    } catch (error) {
      throw new Error(
        `Invite system broken: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

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
