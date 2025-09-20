#!/usr/bin/env node

/**
 * Production Invite Flow Test
 *
 * This script tests the production invite system without deploying any new code.
 * It focuses specifically on the invite acceptance flow that was reported as broken.
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

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
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

async function testProductionInviteFlow() {
  log("🔍 Testing Production Invite Flow", "blue");
  log("=".repeat(50), "blue");

  const tests = [
    {
      name: "Production Server Connectivity",
      test: async () => {
        const response = await makeRequest(`${PROD_URL}/api/test-db`);
        if (response.statusCode === 200) {
          return "✅ Production server is responding";
        } else {
          throw new Error(`Server returned ${response.statusCode}`);
        }
      },
    },
    {
      name: "Database Connectivity",
      test: async () => {
        const response = await makeRequest(`${PROD_URL}/api/test-db`);
        if (response.statusCode === 200) {
          const data = JSON.parse(response.data);
          if (data.success) {
            return "✅ Database is accessible";
          } else {
            throw new Error("Database test failed");
          }
        } else {
          throw new Error(`Database test returned ${response.statusCode}`);
        }
      },
    },
    {
      name: "Authentication System",
      test: async () => {
        const response = await makeRequest(`${PROD_URL}/api/test-auth`);
        if (response.statusCode === 200) {
          const data = JSON.parse(response.data);
          if (data.success) {
            return "✅ Authentication system is working";
          } else {
            throw new Error("Authentication test failed");
          }
        } else {
          throw new Error(
            `Authentication test returned ${response.statusCode}`
          );
        }
      },
    },
    {
      name: "Email Service Configuration",
      test: async () => {
        const response = await makeRequest(`${PROD_URL}/api/test-email-simple`);
        if (response.statusCode === 200) {
          const data = JSON.parse(response.data);
          if (
            data.success &&
            data.environment.hasResendApiKey &&
            data.environment.hasFromEmail
          ) {
            return "✅ Email service is configured";
          } else {
            throw new Error("Email service configuration incomplete");
          }
        } else {
          throw new Error(`Email service test returned ${response.statusCode}`);
        }
      },
    },
    {
      name: "Invite API Endpoint",
      test: async () => {
        const response = await makeRequest(`${PROD_URL}/api/invites`);
        // This should return 401 (unauthorized) which is expected for unauthenticated requests
        if (response.statusCode === 401) {
          return "✅ Invite API endpoint is accessible (401 expected without auth)";
        } else if (response.statusCode === 200) {
          return "✅ Invite API endpoint is accessible";
        } else {
          throw new Error(
            `Invite API returned unexpected status: ${response.statusCode}`
          );
        }
      },
    },
    {
      name: "Partner API Endpoint",
      test: async () => {
        const response = await makeRequest(`${PROD_URL}/api/partner`);
        // This should return 401 (unauthorized) which is expected for unauthenticated requests
        if (response.statusCode === 401) {
          return "✅ Partner API endpoint is accessible (401 expected without auth)";
        } else if (response.statusCode === 200) {
          return "✅ Partner API endpoint is accessible";
        } else {
          throw new Error(
            `Partner API returned unexpected status: ${response.statusCode}`
          );
        }
      },
    },
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      log(`\n🧪 ${test.name}...`, "yellow");
      const result = await test.test();
      log(result, "green");
      passedTests++;
    } catch (error) {
      log(`❌ ${test.name}: ${error.message}`, "red");
      failedTests++;
    }
  }

  log("\n" + "=".repeat(50), "blue");
  log(
    `📊 Test Results: ${passedTests} passed, ${failedTests} failed`,
    failedTests > 0 ? "red" : "green"
  );

  if (failedTests === 0) {
    log("\n✅ Production system appears healthy!", "green");
    log("The invite flow issue may be related to:", "yellow");
    log("  - Email deliverability (check spam folders)", "yellow");
    log("  - Authentication flow after email click", "yellow");
    log("  - Database schema inconsistencies", "yellow");
    log("  - Session handling in production", "yellow");
  } else {
    log("\n❌ Production system has issues that need attention", "red");
  }

  return failedTests === 0;
}

// Run the test
testProductionInviteFlow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(`\n💥 Test failed with error: ${error.message}`, "red");
    process.exit(1);
  });
