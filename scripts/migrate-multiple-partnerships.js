#!/usr/bin/env node

/**
 * Migration script to support multiple partnerships per user
 *
 * This script:
 * 1. Removes UNIQUE constraints from partnership table
 * 2. Adds a composite unique constraint to prevent duplicate partnerships
 * 3. Updates both SQLite and PostgreSQL schemas
 */

const fs = require("fs");
const path = require("path");

console.log("🔄 Starting migration to support multiple partnerships...");

// Update SQLite schema (better-auth-schema.sql)
const sqliteSchemaPath = path.join(__dirname, "..", "better-auth-schema.sql");
let sqliteSchema = fs.readFileSync(sqliteSchemaPath, "utf8");

// Remove UNIQUE constraints from userA and userB columns
sqliteSchema = sqliteSchema.replace(
  /"userA" TEXT NOT NULL UNIQUE,/g,
  '"userA" TEXT NOT NULL,'
);
sqliteSchema = sqliteSchema.replace(
  /"userB" TEXT NOT NULL UNIQUE,/g,
  '"userB" TEXT NOT NULL,'
);

// Add composite unique constraint to prevent duplicate partnerships
// This ensures the same two users can't have multiple partnerships
sqliteSchema = sqliteSchema.replace(
  /FOREIGN KEY \("userB"\) REFERENCES "user"\("id"\) ON DELETE CASCADE\n\);/,
  `FOREIGN KEY ("userB") REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("userA", "userB")
);`
);

fs.writeFileSync(sqliteSchemaPath, sqliteSchema);
console.log("✅ Updated SQLite schema (better-auth-schema.sql)");

// Update PostgreSQL schema (create-tables.sql)
const postgresSchemaPath = path.join(__dirname, "..", "create-tables.sql");
let postgresSchema = fs.readFileSync(postgresSchemaPath, "utf8");

// Remove UNIQUE constraints from usera and userb columns
postgresSchema = postgresSchema.replace(
  /"usera" TEXT NOT NULL UNIQUE,/g,
  '"usera" TEXT NOT NULL,'
);
postgresSchema = postgresSchema.replace(
  /"userb" TEXT NOT NULL UNIQUE,/g,
  '"userb" TEXT NOT NULL,'
);

// Add composite unique constraint to prevent duplicate partnerships
postgresSchema = postgresSchema.replace(
  /FOREIGN KEY \("userb"\) REFERENCES "user"\("id"\) ON DELETE CASCADE\n\);/,
  `FOREIGN KEY ("userb") REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("usera", "userb")
);`
);

fs.writeFileSync(postgresSchemaPath, postgresSchema);
console.log("✅ Updated PostgreSQL schema (create-tables.sql)");

console.log("🎉 Migration completed successfully!");
console.log("");
console.log("Next steps:");
console.log("1. Run the database migration endpoint to apply changes");
console.log("2. Update API endpoints to handle multiple partnerships");
console.log("3. Update frontend components to display multiple partners");
