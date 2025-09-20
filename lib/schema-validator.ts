/**
 * Database Schema Validator
 *
 * This module provides bulletproof schema consistency validation between
 * SQLite (development) and PostgreSQL (production) to prevent schema
 * inconsistencies that cause production bugs.
 */

import { sql } from "@/lib/db-config";
import { appDb } from "@/lib/db";

// Define the canonical schema that both databases must match
export const CANONICAL_SCHEMA = {
  user: {
    columns: [
      { name: "id", type: "TEXT", nullable: false, primaryKey: true },
      { name: "email", type: "TEXT", nullable: false, unique: true },
      { name: "name", type: "TEXT", nullable: false },
      {
        name: "emailVerified",
        type: "BOOLEAN",
        nullable: false,
        default: false,
      },
      { name: "createdAt", type: "TIMESTAMP", nullable: false },
      { name: "updatedAt", type: "TIMESTAMP", nullable: false },
    ],
  },
  task: {
    columns: [
      { name: "id", type: "TEXT", nullable: false, primaryKey: true },
      { name: "userId", type: "TEXT", nullable: false },
      { name: "title", type: "TEXT", nullable: false },
      { name: "isCompleted", type: "INTEGER", nullable: false, default: 0 },
      { name: "isActive", type: "INTEGER", nullable: true, default: 0 },
      { name: "sortOrder", type: "INTEGER", nullable: false, default: 0 },
      { name: "createdAt", type: "TEXT", nullable: false },
      { name: "completedAt", type: "TEXT", nullable: true },
      { name: "addedToActiveAt", type: "TEXT", nullable: true },
    ],
    foreignKeys: [
      { column: "userId", references: "user(id)", onDelete: "CASCADE" },
    ],
  },
  partnership: {
    columns: [
      { name: "id", type: "TEXT", nullable: false, primaryKey: true },
      { name: "userA", type: "TEXT", nullable: false },
      { name: "userB", type: "TEXT", nullable: false },
      { name: "createdAt", type: "TIMESTAMP", nullable: false },
    ],
    foreignKeys: [
      { column: "userA", references: "user(id)", onDelete: "CASCADE" },
      { column: "userB", references: "user(id)", onDelete: "CASCADE" },
    ],
  },
  invite: {
    columns: [
      { name: "id", type: "TEXT", nullable: false, primaryKey: true },
      { name: "code", type: "TEXT", nullable: false, unique: true },
      { name: "inviterId", type: "TEXT", nullable: false },
      { name: "inviteeEmail", type: "TEXT", nullable: false },
      { name: "status", type: "TEXT", nullable: false, default: "pending" },
      { name: "expiresAt", type: "TEXT", nullable: false },
      { name: "createdAt", type: "TEXT", nullable: false },
      { name: "acceptedAt", type: "TEXT", nullable: true },
    ],
    foreignKeys: [
      { column: "inviterId", references: "user(id)", onDelete: "CASCADE" },
    ],
  },
} as const;

// PostgreSQL column name mapping (lowercase)
const POSTGRES_COLUMN_MAPPING: Record<string, string> = {
  // User table
  id: "id",
  email: "email",
  name: "name",
  emailVerified: "emailverified",
  createdAt: "createdat",
  updatedAt: "updatedat",

  // Task table
  userId: "userid",
  title: "title",
  isCompleted: "iscompleted",
  isActive: "isactive",
  sortOrder: "sortorder",
  completedAt: "completedat",
  addedToActiveAt: "addedtoactiveat",

  // Partnership table
  userA: "usera",
  userB: "userb",

  // Invite table
  code: "code",
  inviterId: "inviterid",
  inviteeEmail: "inviteeemail",
  status: "status",
  expiresAt: "expiresat",
  acceptedAt: "acceptedat",
};

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    table: string;
    issues: Array<{
      type:
        | "missing_column"
        | "extra_column"
        | "type_mismatch"
        | "constraint_mismatch";
      column: string;
      expected: any;
      actual: any;
    }>;
  }[];
}

/**
 * Validate database schema against canonical schema
 */
export async function validateSchema(): Promise<SchemaValidationResult> {
  const isProduction = process.env.NODE_ENV === "production";
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    details: [],
  };

  try {
    if (isProduction) {
      await validatePostgreSQLSchema(result);
    } else {
      await validateSQLiteSchema(result);
    }

    // Check for critical schema inconsistencies
    await checkSchemaConsistency(result);

    result.isValid = result.errors.length === 0;
  } catch (error) {
    result.isValid = false;
    result.errors.push(
      `Schema validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return result;
}

/**
 * Validate PostgreSQL schema
 */
async function validatePostgreSQLSchema(
  result: SchemaValidationResult
): Promise<void> {
  for (const [tableName, tableSchema] of Object.entries(CANONICAL_SCHEMA)) {
    const tableIssues: SchemaValidationResult["details"][0]["issues"] = [];

    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) as exists
    `;

    if (!tableExists.rows[0]?.exists) {
      result.errors.push(`Table '${tableName}' does not exist in PostgreSQL`);
      continue;
    }

    // Get actual columns
    const actualColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    const actualColumnMap = new Map(
      actualColumns.rows.map((row: any) => [row.column_name, row])
    );

    // Check each expected column
    for (const expectedColumn of tableSchema.columns) {
      const postgresColumnName =
        POSTGRES_COLUMN_MAPPING[expectedColumn.name] ||
        expectedColumn.name.toLowerCase();
      const actualColumn = actualColumnMap.get(postgresColumnName);

      if (!actualColumn) {
        tableIssues.push({
          type: "missing_column",
          column: expectedColumn.name,
          expected: expectedColumn,
          actual: null,
        });
        result.errors.push(
          `Missing column '${expectedColumn.name}' in table '${tableName}' (expected PostgreSQL name: '${postgresColumnName}')`
        );
      } else {
        // Validate column properties
        if (actualColumn.data_type !== expectedColumn.type.toLowerCase()) {
          tableIssues.push({
            type: "type_mismatch",
            column: expectedColumn.name,
            expected: expectedColumn.type,
            actual: actualColumn.data_type,
          });
          result.warnings.push(
            `Column '${expectedColumn.name}' in table '${tableName}' has type mismatch: expected '${expectedColumn.type}', got '${actualColumn.data_type}'`
          );
        }

        if (
          actualColumn.is_nullable !== (expectedColumn.nullable ? "YES" : "NO")
        ) {
          tableIssues.push({
            type: "constraint_mismatch",
            column: expectedColumn.name,
            expected: expectedColumn.nullable ? "nullable" : "not null",
            actual:
              actualColumn.is_nullable === "YES" ? "nullable" : "not null",
          });
          result.warnings.push(
            `Column '${expectedColumn.name}' in table '${tableName}' has nullability mismatch`
          );
        }
      }
    }

    // Check for extra columns
    for (const [actualColumnName, actualColumn] of actualColumnMap) {
      const expectedColumnName =
        Object.keys(POSTGRES_COLUMN_MAPPING).find(
          (key) => POSTGRES_COLUMN_MAPPING[key] === actualColumnName
        ) || actualColumnName;

      const expectedColumn = tableSchema.columns.find(
        (col) => col.name === expectedColumnName
      );
      if (!expectedColumn) {
        tableIssues.push({
          type: "extra_column",
          column: actualColumnName,
          expected: null,
          actual: actualColumn,
        });
        result.warnings.push(
          `Extra column '${actualColumnName}' found in table '${tableName}'`
        );
      }
    }

    if (tableIssues.length > 0) {
      result.details.push({
        table: tableName,
        issues: tableIssues,
      });
    }
  }
}

/**
 * Validate SQLite schema
 */
async function validateSQLiteSchema(
  result: SchemaValidationResult
): Promise<void> {
  for (const [tableName, tableSchema] of Object.entries(CANONICAL_SCHEMA)) {
    const tableIssues: SchemaValidationResult["details"][0]["issues"] = [];

    // Check if table exists
    const tableExists = appDb
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `
      )
      .get(tableName);

    if (!tableExists) {
      result.errors.push(`Table '${tableName}' does not exist in SQLite`);
      continue;
    }

    // Get actual columns
    const actualColumns = appDb
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const actualColumnMap = new Map(
      actualColumns.map((col) => [col.name, col])
    );

    // Check each expected column
    for (const expectedColumn of tableSchema.columns) {
      const actualColumn = actualColumnMap.get(expectedColumn.name);

      if (!actualColumn) {
        tableIssues.push({
          type: "missing_column",
          column: expectedColumn.name,
          expected: expectedColumn,
          actual: null,
        });
        result.errors.push(
          `Missing column '${expectedColumn.name}' in table '${tableName}'`
        );
      } else {
        // Validate column properties
        if (
          actualColumn.type.toUpperCase() !== expectedColumn.type.toUpperCase()
        ) {
          tableIssues.push({
            type: "type_mismatch",
            column: expectedColumn.name,
            expected: expectedColumn.type,
            actual: actualColumn.type,
          });
          result.warnings.push(
            `Column '${expectedColumn.name}' in table '${tableName}' has type mismatch: expected '${expectedColumn.type}', got '${actualColumn.type}'`
          );
        }

        if (actualColumn.notnull !== (expectedColumn.nullable ? 0 : 1)) {
          tableIssues.push({
            type: "constraint_mismatch",
            column: expectedColumn.name,
            expected: expectedColumn.nullable ? "nullable" : "not null",
            actual: actualColumn.notnull === 0 ? "nullable" : "not null",
          });
          result.warnings.push(
            `Column '${expectedColumn.name}' in table '${tableName}' has nullability mismatch`
          );
        }
      }
    }

    // Check for extra columns
    for (const [actualColumnName, actualColumn] of actualColumnMap) {
      const expectedColumn = tableSchema.columns.find(
        (col) => col.name === actualColumnName
      );
      if (!expectedColumn) {
        tableIssues.push({
          type: "extra_column",
          column: actualColumnName,
          expected: null,
          actual: actualColumn,
        });
        result.warnings.push(
          `Extra column '${actualColumnName}' found in table '${tableName}'`
        );
      }
    }

    if (tableIssues.length > 0) {
      result.details.push({
        table: tableName,
        issues: tableIssues,
      });
    }
  }
}

/**
 * Check for schema consistency issues between environments
 */
async function checkSchemaConsistency(
  result: SchemaValidationResult
): Promise<void> {
  // Check for known problematic column name mappings
  const problematicMappings = Object.entries(POSTGRES_COLUMN_MAPPING).filter(
    ([camelCase, lowercase]) => camelCase !== lowercase
  );

  if (problematicMappings.length > 0) {
    result.warnings.push(
      `Found ${problematicMappings.length} column name mappings that differ between SQLite and PostgreSQL: ` +
        problematicMappings
          .map(([camel, lower]) => `${camel} -> ${lower}`)
          .join(", ")
    );
  }

  // Check for missing mappings
  const allColumns = Object.values(CANONICAL_SCHEMA).flatMap((table) =>
    table.columns.map((col) => col.name)
  );
  const missingMappings = allColumns.filter(
    (col) => !POSTGRES_COLUMN_MAPPING[col]
  );

  if (missingMappings.length > 0) {
    result.errors.push(
      `Missing PostgreSQL column mappings for: ${missingMappings.join(", ")}`
    );
  }
}

/**
 * Get the correct column name for the current database
 */
export function getColumnName(canonicalName: string): string {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return (
      POSTGRES_COLUMN_MAPPING[canonicalName] || canonicalName.toLowerCase()
    );
  } else {
    return canonicalName; // SQLite uses camelCase
  }
}

/**
 * Generate schema migration SQL for PostgreSQL
 */
export function generatePostgreSQLMigration(): string {
  const statements: string[] = [];

  for (const [tableName, tableSchema] of Object.entries(CANONICAL_SCHEMA)) {
    const columns = tableSchema.columns.map((col) => {
      const postgresName =
        POSTGRES_COLUMN_MAPPING[col.name] || col.name.toLowerCase();
      let columnDef = `${postgresName} ${col.type}`;

      if (col.primaryKey) {
        columnDef += " PRIMARY KEY";
      }

      if (!col.nullable && !col.primaryKey) {
        columnDef += " NOT NULL";
      }

      if (col.unique && !col.primaryKey) {
        columnDef += " UNIQUE";
      }

      if (col.default !== undefined) {
        columnDef += ` DEFAULT ${col.default}`;
      }

      return columnDef;
    });

    statements.push(
      `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(", ")});`
    );

    // Add foreign key constraints
    if (tableSchema.foreignKeys) {
      for (const fk of tableSchema.foreignKeys) {
        const postgresColumn =
          POSTGRES_COLUMN_MAPPING[fk.column] || fk.column.toLowerCase();
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${postgresColumn} ` +
            `FOREIGN KEY (${postgresColumn}) REFERENCES ${fk.references} ON DELETE ${fk.onDelete};`
        );
      }
    }
  }

  return statements.join("\n");
}

/**
 * Generate schema migration SQL for SQLite
 */
export function generateSQLiteMigration(): string {
  const statements: string[] = [];

  for (const [tableName, tableSchema] of Object.entries(CANONICAL_SCHEMA)) {
    const columns = tableSchema.columns.map((col) => {
      let columnDef = `${col.name} ${col.type}`;

      if (col.primaryKey) {
        columnDef += " PRIMARY KEY";
      }

      if (!col.nullable && !col.primaryKey) {
        columnDef += " NOT NULL";
      }

      if (col.unique && !col.primaryKey) {
        columnDef += " UNIQUE";
      }

      if (col.default !== undefined) {
        columnDef += ` DEFAULT ${col.default}`;
      }

      return columnDef;
    });

    statements.push(
      `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(", ")});`
    );
  }

  return statements.join("\n");
}
