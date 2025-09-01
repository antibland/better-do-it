# Database Migration Process

## **Critical Rules**

### **1. NEVER Deploy Code That Requires Missing Database Columns**

- **Before deploying**: Always ensure the database schema supports your code
- **Migration first**: Run database migrations BEFORE deploying code that uses new columns
- **Backward compatibility**: Code should work with existing schema until migration completes

### **2. Migration Endpoint Requirements**

- **No authentication**: Migration endpoints must work without authentication
- **Idempotent**: Can be run multiple times safely
- **Environment aware**: Handle both PostgreSQL (production) and SQLite (development)
- **Error handling**: Provide clear feedback on success/failure

### **3. Deployment Order**

1. **Deploy migration endpoint** (if new)
2. **Run migration** to update database schema
3. **Verify schema** with check-schema endpoint
4. **Deploy application code** that uses new schema

## **Step-by-Step Migration Process**

### **Step 1: Create Migration Endpoint**

```typescript
// app/api/migrate-[feature]/route.ts
export async function POST(req: Request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const results: string[] = [];

    if (isProduction) {
      // PostgreSQL migration
      // Check if column exists
      // Add column if missing
      // Update existing data
      // Create indexes
    } else {
      // SQLite migration
      // Same logic for development
    }

    return Response.json({
      success: true,
      environment: isProduction ? "PostgreSQL" : "SQLite",
      results,
    });
  } catch (error) {
    return Response.json({ error: "Migration failed" }, { status: 500 });
  }
}
```

### **Step 2: Deploy Migration Endpoint**

```bash
git add app/api/migrate-[feature]/route.ts
git commit -m "Add migration endpoint for [feature]"
git push
```

### **Step 3: Run Migration**

```bash
# Wait for deployment (90 seconds)
sleep 90

# Run migration
curl -X POST https://your-domain.vercel.app/api/migrate-[feature] | jq

# Verify schema
curl -s https://your-domain.vercel.app/api/check-schema | jq
```

### **Step 4: Deploy Application Code**

```bash
# Only after migration succeeds
git add [your-application-files]
git commit -m "Add [feature] using new database schema"
git push
```

## **Schema Check Commands**

### **Check Current Schema**

```bash
# View all columns in task table
curl -s https://your-domain.vercel.app/api/check-schema | jq '.taskColumns'

# Check for specific column
curl -s https://your-domain.vercel.app/api/check-schema | jq '.taskColumns[] | select(.column_name == "column_name")'
```

### **Test Database Connection**

```bash
curl -s https://your-domain.vercel.app/api/test-db | jq
```

## **Common Migration Patterns**

### **Adding a New Column**

```sql
-- PostgreSQL
ALTER TABLE "table_name" ADD COLUMN "column_name" TYPE DEFAULT value;
ALTER TABLE "table_name" ALTER COLUMN "column_name" SET NOT NULL;

-- SQLite
ALTER TABLE table_name ADD COLUMN columnName TYPE NOT NULL DEFAULT value;
```

### **Creating Indexes**

```sql
-- PostgreSQL
CREATE INDEX "idx_table_column" ON "table"("column");

-- SQLite
CREATE INDEX idx_table_column ON table(column);
```

### **Updating Existing Data**

```sql
-- PostgreSQL
UPDATE "table" 
SET "column" = (SELECT COUNT(*) FROM "table" t2 WHERE t2."id" <= "table"."id")
WHERE "column" = 0;

-- SQLite
UPDATE table 
SET column = (SELECT COUNT(*) FROM table t2 WHERE t2.id <= table.id)
WHERE column = 0;
```

## **Error Recovery**

### **If Migration Fails**

1. **Check logs**: Look at Vercel function logs
2. **Verify schema**: Use check-schema endpoint
3. **Manual fix**: If needed, run SQL directly in database
4. **Retry migration**: Fix issues and run again

### **If Code Deployed Before Migration**

1. **Immediate rollback**: Revert to working code
2. **Run migration**: Fix database schema
3. **Redeploy**: Deploy code again after migration

## **Testing Checklist**

- [ ] Migration endpoint works without authentication
- [ ] Migration is idempotent (can run multiple times)
- [ ] Schema check shows new columns
- [ ] Application code works with new schema
- [ ] Both development and production environments work
- [ ] No data loss during migration

## **Prevention Checklist**

- [ ] Migration endpoint created before code changes
- [ ] Migration tested in development first
- [ ] Schema verification after migration
- [ ] Code changes deployed only after successful migration
- [ ] Rollback plan prepared

## **Emergency Contacts**

- **Database access**: Vercel PostgreSQL console
- **Function logs**: Vercel dashboard → Functions
- **Schema verification**: `/api/check-schema` endpoint
- **Migration status**: `/api/migrate-[feature]` endpoint

---

**Remember**: Database migrations are irreversible operations. Always test thoroughly and have a rollback plan.
