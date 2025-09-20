// Health check endpoint - no imports needed

/**
 * Public Health Check API Endpoint
 *
 * This endpoint provides comprehensive health monitoring without requiring authentication.
 * It tests all critical system components that should be accessible publicly.
 */
export async function GET() {
  const checks: Array<{
    name: string;
    status: "pass" | "fail";
    message: string;
    duration: number;
  }> = [];

  const startTime = Date.now();

  // Helper function to run a single check
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

  try {
    // 1. Database Connectivity
    await runCheck("Database Connectivity", async () => {
      const { appDb } = await import("@/lib/db");
      await appDb.prepare("SELECT 1").get();
      return "Database connection successful";
    });

    // 2. Authentication System
    await runCheck("Authentication System", async () => {
      const { auth } = await import("@/lib/auth");
      if (!auth) {
        throw new Error("Auth instance not available");
      }
      return "Authentication system initialized";
    });

    // 3. Email Service Configuration
    await runCheck("Email Service Configuration", async () => {
      const requiredVars = ["RESEND_API_KEY", "FROM_EMAIL"];
      const missing = requiredVars.filter((varName) => !process.env[varName]);
      if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(", ")}`);
      }

      // Test Resend client initialization
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      if (!resend) {
        throw new Error("Failed to initialize Resend client");
      }

      return "Email service configured and ready";
    });

    // 4. Database Schema Integrity
    await runCheck("Database Schema Integrity", async () => {
      const { appDb } = await import("@/lib/db");

      // Check that all required tables exist
      const requiredTables = ["user", "task", "partnership", "invite"];
      const existingTables = (await appDb
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN (${requiredTables.map(() => "?").join(",")})
      `
        )
        .all(requiredTables)) as Array<{ name: string }>;

      if (existingTables.length !== requiredTables.length) {
        const missingTables = requiredTables.filter(
          (table) =>
            !existingTables.some((t: { name: string }) => t.name === table)
        );
        throw new Error(`Missing tables: ${missingTables.join(", ")}`);
      }

      return `Database schema intact (${requiredTables.length} tables)`;
    });

    // 5. Environment Configuration
    await runCheck("Environment Configuration", async () => {
      const requiredVars = ["RESEND_API_KEY", "FROM_EMAIL"];
      const missing = requiredVars.filter((varName) => !process.env[varName]);
      if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(", ")}`);
      }
      return "All required environment variables present";
    });

    // 6. API Endpoints Accessibility
    await runCheck("API Endpoints Accessibility", async () => {
      const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
      const endpoints = [
        "/api/invites", // Core invite endpoint
        "/api/partner", // Core partner endpoint
        "/api/tasks", // Core tasks endpoint
      ];

      let accessibleCount = 0;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });
          // Accept 200 (OK) or 401 (Unauthorized) as accessible
          if (response.ok || response.status === 401) {
            accessibleCount++;
          }
        } catch {
          // Endpoint not accessible
        }
      }

      if (accessibleCount === 0) {
        throw new Error("No API endpoints accessible");
      }

      return `${accessibleCount}/${endpoints.length} API endpoints accessible`;
    });

    // 7. Database Performance
    await runCheck("Database Performance", async () => {
      const { appDb } = await import("@/lib/db");

      const start = Date.now();
      await appDb.prepare("SELECT COUNT(*) FROM user").get();
      await appDb.prepare("SELECT COUNT(*) FROM task").get();
      await appDb.prepare("SELECT COUNT(*) FROM partnership").get();
      await appDb.prepare("SELECT COUNT(*) FROM invite").get();
      const duration = Date.now() - start;

      if (duration > 1000) {
        throw new Error(`Database performance degraded (${duration}ms)`);
      }

      return `Database performance healthy (${duration}ms)`;
    });

    // 8. System Resources
    await runCheck("System Resources", async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      if (heapUsedMB > 500) {
        return `High memory usage: ${heapUsedMB}MB/${heapTotalMB}MB`;
      }

      return `Memory usage healthy: ${heapUsedMB}MB/${heapTotalMB}MB`;
    });
  } catch (error) {
    console.error("Health check error:", error);
  }

  // Calculate overall health status - simple pass/fail
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  let overall: "healthy" | "unhealthy";
  if (failedChecks > 0) {
    overall = "unhealthy";
  } else {
    overall = "healthy";
  }

  const duration = Date.now() - startTime;

  return Response.json({
    overall,
    checks,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    duration,
    version: "1.0.0",
  });
}
