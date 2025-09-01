# Migration Rules (Quick Reference)

## **Core Rule: Always Use the Bulletproof Migration Process**

**NEVER create direct SQL migration files** - they can cause data loss and business failure.

## **Quick Reference**

### **1. Use the Safe Migration Endpoint**

- **ALWAYS** use `/api/migrate-[feature]` for database schema changes
- This endpoint handles both PostgreSQL (production) and SQLite (development)
- It's idempotent and data-loss-free - can be run multiple times safely

### **2. Follow the Bulletproof Process**

**See `migration-process.md` for the complete, step-by-step process.**

The process includes:

- Pre-migration checklist (backup, validation, isolation)
- Step-by-step migration execution
- Emergency rollback procedures
- Validation commands
- Critical rules that must never be broken

### **3. Use Migration Scripts**

```bash
# Run migration safety check
node scripts/migration-safety.js

# Run migration (production)
curl -X POST https://better-do-it.vercel.app/api/migrate-[feature] | jq

# Check schema
curl -s https://better-do-it.vercel.app/api/check-schema | jq
```

## **What NOT to Do**

❌ **NEVER create `.sql` migration files**
❌ **NEVER use direct database commands**
❌ **NEVER assume column names are the same across environments**
❌ **NEVER skip environment testing**
❌ **NEVER deploy code before running migrations**

## **What TO Do**

✅ **ALWAYS use the migration endpoint**
✅ **ALWAYS follow the bulletproof process**
✅ **ALWAYS test in both environments**
✅ **ALWAYS verify schema consistency**
✅ **ALWAYS use the transformation layer**

## **Why This Rule Exists**

The old `migrate-sort-order.sql` file was removed because:

- It caused data loss and database corruption
- It didn't handle environment differences properly
- It wasn't idempotent (couldn't be run safely multiple times)
- It lacked proper error handling and feedback
- It nearly destroyed the production database

The new migration endpoint solves all these problems and provides a safe, consistent way to handle database changes across both development and production environments.

---

**Reference: See `migration-process.md` for the complete bulletproof migration process.**
