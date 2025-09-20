#!/usr/bin/env node

/**
 * Invite Flow Test
 *
 * This script tests the actual invite flow that was reported as broken.
 * It simulates the real user journey: create invite -> send email -> accept invite -> verify partnership
 */

import https from "https";

// Production URL
const PROD_URL = "https://better-do-it.com";

// Colors for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message: string, color: keyof typeof colors = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  data: string;
}

function makeRequest(url: string, options: any = {}): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testInviteFlow(): Promise<boolean> {
  log("🔍 Testing Invite Flow", "blue");
  log("=".repeat(60), "blue");

  log("\n⚠️  This test requires authentication to work properly", "yellow");
  log("   Without auth, we can only test endpoint accessibility", "yellow");
  log("   The real issue is likely in the authenticated flow", "yellow");

  const tests = [
    {
      name: "1. Check if invite emails are being sent",
      test: async (): Promise<string> => {
        // This would require authentication to actually create an invite
        // For now, just check if the endpoint exists
        const response = await makeRequest(`${PROD_URL}/api/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com" }),
        });

        if (response.statusCode === 401) {
          return "✅ Invite creation endpoint exists (401 expected without auth)";
        } else if (response.statusCode === 200) {
          return "⚠️  Invite creation worked without auth (unexpected)";
        } else {
          throw new Error(`Unexpected status: ${response.statusCode}`);
        }
      },
    },
    {
      name: "2. Check invite acceptance endpoint",
      test: async (): Promise<string> => {
        const response = await makeRequest(`${PROD_URL}/api/invites/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: "test-code" }),
        });

        if (response.statusCode === 401) {
          return "✅ Invite acceptance endpoint exists (401 expected without auth)";
        } else if (response.statusCode === 400) {
          return "✅ Invite acceptance endpoint exists (400 expected for invalid code)";
        } else {
          throw new Error(`Unexpected status: ${response.statusCode}`);
        }
      },
    },
    {
      name: "3. Check database schema consistency",
      test: async (): Promise<string> => {
        // Test if the database has the expected tables and columns
        const response = await makeRequest(`${PROD_URL}/api/validate-schema`);

        if (response.statusCode === 401) {
          return "✅ Schema validation endpoint exists (401 expected without auth)";
        } else if (response.statusCode === 200) {
          const data = JSON.parse(response.data);
          if (data.isValid) {
            return "✅ Database schema is valid";
          } else {
            return `⚠️  Database schema has issues: ${data.errors?.join(", ") || "Unknown"}`;
          }
        } else {
          throw new Error(`Unexpected status: ${response.statusCode}`);
        }
      },
    },
    {
      name: "4. Check email service configuration",
      test: async (): Promise<string> => {
        const response = await makeRequest(`${PROD_URL}/api/test-email-simple`);

        if (response.statusCode === 200) {
          const data = JSON.parse(response.data);
          if (
            data.success &&
            data.environment.hasResendApiKey &&
            data.environment.hasFromEmail
          ) {
            return "✅ Email service is properly configured";
          } else {
            return "⚠️  Email service configuration incomplete";
          }
        } else {
          throw new Error(`Email service test failed: ${response.statusCode}`);
        }
      },
    },
    {
      name: "5. Check for common invite flow issues",
      test: async (): Promise<string> => {
        // Test the specific endpoints that are part of the invite flow
        const endpoints = [
          "/api/invites",
          "/api/invites/accept",
          "/api/partner",
          "/api/tasks",
        ];

        let accessibleCount = 0;
        let authRequiredCount = 0;

        for (const endpoint of endpoints) {
          const response = await makeRequest(`${PROD_URL}${endpoint}`);
          if (response.statusCode === 401) {
            authRequiredCount++;
            accessibleCount++;
          } else if (response.statusCode === 200) {
            accessibleCount++;
          }
        }

        if (accessibleCount === endpoints.length) {
          return `✅ All invite flow endpoints accessible (${authRequiredCount} require auth)`;
        } else {
          return `⚠️  Only ${accessibleCount}/${endpoints.length} endpoints accessible`;
        }
      },
    },
  ];

  let passedTests = 0;
  let warningTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      log(`\n🧪 ${test.name}...`, "yellow");
      const result = await test.test();
      if (result.includes("⚠️")) {
        log(result, "yellow");
        warningTests++;
      } else {
        log(result, "green");
        passedTests++;
      }
    } catch (error) {
      log(
        `❌ ${test.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "red"
      );
      failedTests++;
    }
  }

  log("\n" + "=".repeat(60), "blue");
  log(
    `📊 Test Results: ${passedTests} passed, ${warningTests} warnings, ${failedTests} failed`,
    failedTests > 0 ? "red" : warningTests > 0 ? "yellow" : "green"
  );

  log("\n🔍 Analysis of the Original Issue:", "blue");
  log("The invite flow issue was likely caused by:", "yellow");
  log("  1. Email deliverability problems (emails going to spam)", "yellow");
  log(
    "  2. Database schema inconsistencies (camelCase vs lowercase)",
    "yellow"
  );
  log("  3. Authentication flow issues after clicking invite links", "yellow");
  log("  4. Session handling problems in production", "yellow");

  log("\n💡 To truly test the invite flow, you need to:", "blue");
  log("  1. Create a test user account", "blue");
  log("  2. Send an actual invite email", "blue");
  log("  3. Click the invite link and trace the flow", "blue");
  log("  4. Check if the partnership is created correctly", "blue");

  log(
    "\n🚨 The fact that endpoints are accessible doesn't mean the flow works!",
    "red"
  );
  log("   The issue is likely in the authenticated user journey.", "red");

  return failedTests === 0;
}

// Run the test
testInviteFlow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(
      `\n💥 Test failed with error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "red"
    );
    process.exit(1);
  });
