# Database Migration Rules

## **Core Rule: Always Use Safe Migration Endpoints**

**NEVER create direct SQL migration files** - they can cause data loss and environment inconsistencies.

## **Required Migration Process**

### **1. Use the Safe Migration Endpoint**

- **ALWAYS** use `/api/migrate-sort-order` for database schema changes
- This endpoint handles both PostgreSQL (production) and SQLite (development) environments
- It's idempotent and data-loss-free - can be run multiple times safely

### **2. Reference data-consistency.md**

- **ALWAYS** reference `data-consistency.md` for complete migration strategy
- Follow the column naming conventions documented there
- Use the transformation patterns shown in the examples

### **3. Follow the Established Pattern**

When adding new columns, follow this exact pattern from `data-consistency.md`:

1. **Update both schema files** with appropriate naming
2. **Add transformation logic** in API endpoints
3. **Create migration endpoint** for safe deployment
4. **Test in both environments** before deploying

### **4. Use Migration Scripts**

- Use `scripts/run-migration.sh` for convenient migration execution
- Verify schema consistency with `/api/check-schema` endpoint after migrations

## **What NOT to Do**

❌ **NEVER create `.sql` migration files**
❌ **NEVER use direct database commands**
❌ **NEVER assume column names are the same across environments**
❌ **NEVER skip environment testing**

## **What TO Do**

✅ **ALWAYS use the migration endpoint**
✅ **ALWAYS reference data-consistency.md**
✅ **ALWAYS test in both environments**
✅ **ALWAYS verify schema consistency**
✅ **ALWAYS use the transformation layer**

## **Quick Reference**

```bash
# Run migration
curl -X POST https://your-domain.vercel.app/api/migrate-sort-order

# Check schema
curl -s https://your-domain.vercel.app/api/check-schema | jq

# Use migration script
./scripts/run-migration.sh
```

## **Why This Rule Exists**

The old `migrate-sort-order.sql` file was removed because:

- It caused data loss and database corruption
- It didn't handle environment differences properly
- It wasn't idempotent (couldn't be run safely multiple times)
- It lacked proper error handling and feedback

The new migration endpoint solves all these problems and provides a safe, consistent way to handle database changes across both development and production environments.

**Reference: See `data-consistency.md` for complete implementation details and examples.**
