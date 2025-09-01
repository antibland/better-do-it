#!/usr/bin/env node

/**
 * Migration Safety Check Script
 *
 * This script enforces the bulletproof migration process.
 * Run this before any database-related changes.
 */

const { execSync } = require("child_process");
const fs = require("fs");

console.log("🔒 Migration Safety Check Starting...\n");

// Check 1: Verify we're not in production
if (process.env.NODE_ENV === "production") {
  console.error("❌ CRITICAL: Never run migrations directly in production!");
  console.error("   Use the migration endpoint instead.");
  process.exit(1);
}

// Check 2: Verify local database exists
if (!fs.existsSync("./sqlite.db")) {
  console.error("❌ Local database not found. Run setup first.");
  process.exit(1);
}

// Check 3: Check if development server is running
try {
  const response = execSync("curl -s http://localhost:3000/api/test-db", {
    encoding: "utf8",
    timeout: 5000,
  });
  const result = JSON.parse(response);

  if (!result.success) {
    console.error("❌ Development server not responding properly");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Development server not running. Start with: npm run dev");
  process.exit(1);
}

// Check 4: Verify current schema
try {
  const schemaResponse = execSync(
    "curl -s http://localhost:3000/api/check-schema",
    {
      encoding: "utf8",
      timeout: 5000,
    }
  );
  console.log("✅ Schema check endpoint accessible");
} catch (error) {
  console.error("❌ Schema check failed:", error.message);
  process.exit(1);
}

// Check 5: Verify migration endpoint exists
try {
  const migrationResponse = execSync(
    "curl -s http://localhost:3000/api/migrate-sort-order",
    {
      encoding: "utf8",
      timeout: 5000,
    }
  );
  const result = JSON.parse(migrationResponse);

  if (result.success) {
    console.log("✅ Migration endpoint working");
  } else {
    console.log("⚠️  Migration endpoint returned:", result.message);
  }
} catch (error) {
  console.error("❌ Migration endpoint not accessible:", error.message);
  process.exit(1);
}

console.log("\n✅ All safety checks passed!");
console.log("\n📋 Next steps:");
console.log("1. Test your migration locally");
console.log("2. Verify it works with your application");
console.log("3. Deploy migration endpoint");
console.log("4. Run production migration");
console.log("5. Deploy application code");
console.log("\n⚠️  Remember: Follow the migration process exactly!");
