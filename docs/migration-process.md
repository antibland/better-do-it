# BULLETPROOF Database Migration Process

## **CRITICAL: This Process Must Be Followed EXACTLY**

**Failure to follow this process can result in data loss, broken production, and business failure.**

## **Pre-Migration Checklist (MANDATORY)**

### **1. Database Backup (ALWAYS FIRST)**

```bash
# Production backup (if you have access)
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Local backup
cp sqlite.db sqlite_backup_$(date +%Y%m%d_%H%M%S).db
```

### **2. Schema Validation**

```bash
# Check current schema before any changes
curl -s https://better-do-it.vercel.app/api/check-schema | jq '.taskColumns'

# Verify no pending migrations
curl -s https://better-do-it.vercel.app/api/migrate-sort-order | jq
```

### **3. Environment Isolation**

- **NEVER** test migrations on production first
- **ALWAYS** test on local development environment
- **VERIFY** migration works locally before touching production

## **Step-by-Step Bulletproof Process**

### **Step 1: Create Migration Endpoint (Development Only)**

```typescript
// app/api/migrate-[feature]/route.ts
export async function POST(req: Request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const results: string[] = [];
    const errors: string[] = [];

    // VALIDATION: Check current state
    if (isProduction) {
      const currentSchema = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'task' AND column_name = 'new_column_name'
      `;

      if (currentSchema.rows.length > 0) {
        return Response.json({
          success: true,
          message: "Column already exists - no migration needed",
          results: ["Column already exists"],
        });
      }
    }

    // MIGRATION: Add column safely
    if (isProduction) {
      await sql`ALTER TABLE "task" ADD COLUMN "new_column_name" INTEGER DEFAULT 0`;
      await sql`ALTER TABLE "task" ALTER COLUMN "new_column_name" SET NOT NULL`;
      results.push("Added new_column_name to PostgreSQL");
    } else {
      appDb
        .prepare(
          "ALTER TABLE task ADD COLUMN newColumnName INTEGER NOT NULL DEFAULT 0"
        )
        .run();
      results.push("Added newColumnName to SQLite");
    }

    // VALIDATION: Verify migration succeeded
    if (isProduction) {
      const verifySchema = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'task' AND column_name = 'new_column_name'
      `;

      if (verifySchema.rows.length === 0) {
        errors.push("Migration failed - column not found after creation");
      }
    }

    // DATA POPULATION: Update existing data
    if (isProduction) {
      const updateResult = await sql`
        UPDATE "task" SET "new_column_name" = 0 WHERE "new_column_name" IS NULL
      `;
      results.push(`Updated ${updateResult.rowCount || 0} tasks`);
    } else {
      const updateResult = appDb
        .prepare(
          "UPDATE task SET newColumnName = 0 WHERE newColumnName IS NULL"
        )
        .run();
      results.push(`Updated ${updateResult.changes || 0} tasks`);
    }

    // INDEX CREATION: Add performance indexes
    if (isProduction) {
      try {
        await sql`CREATE INDEX "idx_task_new_column" ON "task"("new_column_name")`;
        results.push("Created index in PostgreSQL");
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("already exists")
        ) {
          results.push("Index already exists in PostgreSQL");
        } else {
          errors.push(
            `Index creation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    } else {
      try {
        appDb
          .prepare("CREATE INDEX idx_task_new_column ON task(newColumnName)")
          .run();
        results.push("Created index in SQLite");
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("already exists")
        ) {
          results.push("Index already exists in SQLite");
        } else {
          errors.push(
            `Index creation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    }

    // FINAL VALIDATION: Ensure data integrity
    if (isProduction) {
      const dataCheck = await sql`
        SELECT COUNT(*) as total, COUNT("new_column_name") as with_column
        FROM "task"
      `;
      const { total, with_column } = dataCheck.rows[0];

      if (total !== with_column) {
        errors.push(
          `Data integrity check failed: ${total} total tasks, ${with_column} with new column`
        );
      } else {
        results.push(`Data integrity verified: ${total} tasks updated`);
      }
    } else {
      const dataCheck = appDb
        .prepare(
          "SELECT COUNT(*) as total, COUNT(newColumnName) as with_column FROM task"
        )
        .get();
      if (dataCheck.total !== dataCheck.with_column) {
        errors.push(
          `Data integrity check failed: ${dataCheck.total} total tasks, ${dataCheck.with_column} with new column`
        );
      } else {
        results.push(
          `Data integrity verified: ${dataCheck.total} tasks updated`
        );
      }
    }

    if (errors.length > 0) {
      return Response.json(
        {
          success: false,
          errors,
          results,
          message:
            "Migration completed with errors - manual intervention required",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      environment: isProduction ? "PostgreSQL" : "SQLite",
      results,
      message: "Migration completed successfully with full validation",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### **Step 2: Test Migration Locally (MANDATORY)**

```bash
# 1. Start local development server
npm run dev

# 2. Run migration locally
curl -X POST http://localhost:3000/api/migrate-[feature] | jq

# 3. Verify migration succeeded
sqlite3 sqlite.db "PRAGMA table_info(task);" | grep newColumnName

# 4. Test application functionality
# - Add tasks
# - Move tasks
# - Verify no errors in console
# - Test all affected features

# 5. Only proceed if ALL tests pass
```

### **Step 3: Deploy Migration Endpoint**

```bash
# Deploy migration endpoint only
git add app/api/migrate-[feature]/route.ts
git commit -m "Add migration endpoint for [feature] - DO NOT MERGE"
git push

# Wait for deployment (90 seconds minimum)
sleep 90
```

### **Step 4: Run Production Migration**

```bash
# 1. Run migration
curl -X POST https://better-do-it.vercel.app/api/migrate-[feature] | jq

# 2. Verify migration succeeded
curl -s https://better-do-it.vercel.app/api/check-schema | jq '.taskColumns[] | select(.column_name == "new_column_name")'

# 3. Test production API (if possible)
curl -s https://better-do-it.vercel.app/api/test-db | jq

# 4. Only proceed if migration returns success: true
```

### **Step 5: Deploy Application Code**

```bash
# ONLY after successful migration
git add [your-application-files]
git commit -m "Add [feature] using new database schema - MIGRATION COMPLETED"
git push
```

## **Emergency Rollback Procedures**

### **If Migration Fails**

```bash
# 1. Immediately stop deployment
# 2. Check migration logs
curl -s https://better-do-it.vercel.app/api/migrate-[feature] | jq

# 3. If column was partially created, drop it
# PostgreSQL (if you have access):
# ALTER TABLE "task" DROP COLUMN "new_column_name";

# 4. Restore from backup if necessary
# 5. Investigate and fix migration before retrying
```

### **If Application Code Breaks After Migration**

```bash
# 1. Immediately revert to previous working version
git revert HEAD
git push

# 2. Verify application is working
# 3. Fix application code issues
# 4. Re-deploy only after fixes are tested locally
```

## **Validation Commands**

### **Pre-Migration Validation**

```bash
# Check current schema
curl -s https://better-do-it.vercel.app/api/check-schema | jq '.taskColumns'

# Test database connectivity
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Check for existing migrations
curl -s https://better-do-it.vercel.app/api/migrate-sort-order | jq
```

### **Post-Migration Validation**

```bash
# Verify new column exists
curl -s https://better-do-it.vercel.app/api/check-schema | jq '.taskColumns[] | select(.column_name == "new_column_name")'

# Test application functionality
# - Create new tasks
# - Move tasks between lists
# - Verify sort order works
# - Check for console errors
```

## **Critical Rules (NEVER BREAK THESE)**

### **1. Migration Order (ALWAYS)**

1. **Backup database** (if possible)
2. **Create migration endpoint**
3. **Test locally** (MANDATORY)
4. **Deploy migration endpoint**
5. **Run production migration**
6. **Verify migration succeeded**
7. **Deploy application code**

### **2. Validation Requirements**

- **Every migration must validate its own success**
- **Data integrity checks are mandatory**
- **Error handling must be comprehensive**
- **Rollback procedures must be documented**

### **3. Testing Requirements**

- **Local testing is mandatory before production**
- **All affected features must be tested**
- **Error scenarios must be tested**
- **Performance impact must be assessed**

### **4. Deployment Safety**

- **Never deploy code that requires missing database columns**
- **Always verify migration success before deploying application code**
- **Have rollback plan ready before any deployment**
- **Monitor application after deployment**

## **Automated Safety Checks**

### **Pre-Deployment Hook (Add to package.json)**

```json
{
  "scripts": {
    "pre-deploy": "npm run test-migration",
    "test-migration": "node scripts/test-migration.js"
  }
}
```

### **Migration Test Script (scripts/test-migration.js)**

```javascript
const { execSync } = require("child_process");

// Check if migration endpoint exists
try {
  const response = execSync(
    "curl -s http://localhost:3000/api/migrate-sort-order",
    { encoding: "utf8" }
  );
  const result = JSON.parse(response);

  if (!result.success) {
    console.error("❌ Migration test failed:", result);
    process.exit(1);
  }

  console.log("✅ Migration test passed");
} catch (error) {
  console.error("❌ Migration test failed:", error.message);
  process.exit(1);
}
```

## **Monitoring and Alerts**

### **Post-Deployment Monitoring**

```bash
# Monitor application health
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Check for errors in logs
# Vercel Dashboard → Functions → Logs

# Monitor user reports
# Set up error tracking (Sentry, etc.)
```

## **Documentation Requirements**

### **For Every Migration**

1. **Document the change** in migration-process.md
2. **Update API documentation** if endpoints change
3. **Update frontend documentation** if UI changes
4. **Record rollback procedures** for this specific migration
5. **Note any breaking changes** or data transformations

---

**REMEMBER: This process exists because database migrations can destroy your business. Follow it exactly, every time, no exceptions.**
