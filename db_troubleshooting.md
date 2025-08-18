# Database Troubleshooting Guide

This guide documents common database issues encountered during deployment and their solutions. Based on real problems solved during the Better Do It deployment process.

## 🚨 **Critical Issues & Solutions**

### **Issue 1: SQLite on Vercel (Ephemeral Filesystem)**

**Problem:**

```
Error: SQLite database file not found or cannot be written
VercelError: Cannot write to filesystem in production
```

**Root Cause:**

- Vercel's serverless functions have an ephemeral filesystem
- SQLite files are read-only except in `/tmp` directory
- No persistence between function invocations
- Concurrency limits cause database locks

**Solution:**

- **Migrate to PostgreSQL** for production
- Use `@vercel/postgres` with Neon database
- Implement dual database configuration:
  ```typescript
  const isProduction = process.env.NODE_ENV === "production";
  const db = isProduction ? new PostgresWrapper() : new SQLiteWrapper();
  ```

**Prevention:**

- Always use cloud databases for production deployments
- Test with production-like environments locally

---

### **Issue 2: Better Auth Database Configuration**

**Problem:**

```
Error: d.createDriver is not a function
TypeError: Cannot read property 'createDriver' of undefined
```

**Root Cause:**

- Better Auth expects specific database driver objects
- Raw `sql` object or configuration objects don't work
- Missing proper PostgreSQL Pool configuration

**Solution:**

```typescript
// Correct configuration
database: isProduction
  ? new Pool({
      connectionString: process.env.POSTGRES_URL!,
    })
  : new Database("./sqlite.db"),
```

**Prevention:**

- Follow Better Auth documentation exactly
- Use `pg.Pool` for PostgreSQL connections
- Test database configuration in both environments

---

### **Issue 3: Missing Database Tables**

**Problem:**

```
Error: relation "user" does not exist
Error: relation "task" does not exist
```

**Root Cause:**

- Better Auth CLI migrations not working in Vercel environment
- Tables not created in PostgreSQL database
- Manual schema creation needed

**Solution:**

1. **Create manual SQL script** (`create-tables.sql`):

   ```sql
   CREATE TABLE IF NOT EXISTS "user" (
       "id" TEXT PRIMARY KEY,
       "name" TEXT NOT NULL,
       "email" TEXT NOT NULL UNIQUE,
       -- ... other columns
   );
   ```

2. **Create setup endpoint** (`/api/setup-db`):

   ```typescript
   const statements = sqlContent.split(";").filter((stmt) => stmt.trim());
   for (const statement of statements) {
     await sql.query(statement);
   }
   ```

3. **Run setup manually**:
   ```bash
   curl -i -X POST https://better-do-it.vercel.app/api/setup-db
   ```

**Prevention:**

- Always verify table existence after deployment
- Use `CREATE TABLE IF NOT EXISTS` for idempotent operations
- Create debugging endpoints to check schema

---

### **Issue 4: Column Name Mismatches**

**Problem:**

```
Error: column "userId" does not exist
TypeError: m.tasks.map is not a function
```

**Root Cause:**

- PostgreSQL uses lowercase column names (`userid`, `iscompleted`)
- Frontend expects camelCase (`userId`, `isCompleted`)
- Data transformation missing between database and API

**Solution:**

1. **Update database schema** to use consistent naming:

   ```sql
   -- PostgreSQL (lowercase)
   "userid" TEXT NOT NULL,
   "iscompleted" INTEGER NOT NULL DEFAULT 0,
   ```

2. **Add data transformation** in API responses:
   ```typescript
   const transformedTasks = (dbRows || []).map((task) => ({
     id: task.id,
     userId: task.userid, // userid → userId
     isCompleted: task.iscompleted, // iscompleted → isCompleted
     // ... other transformations
   }));
   ```

**Prevention:**

- Document column naming conventions
- Create consistent data transformation layers
- Test data format in both environments

---

### **Issue 5: Partnership Database Error (Column Name Mismatch)**

**Problem:**

```
Database error when adding partners
500 Internal Server Error on /api/partner
```

**Root Cause:**

- Schema mismatch between expected and actual database column names
- Code expects snake_case (`user_a`, `user_b`, `created_at`)
- Actual database uses all lowercase (`usera`, `userb`, `createdat`)
- Partnership table queries fail due to non-existent columns

**Solution:**

1. **Update partner route queries** to use correct column names:

   ```typescript
   // Before (incorrect)
   SELECT id, user_a, user_b, created_at FROM partnership WHERE user_a = ${userId}

   // After (correct)
   SELECT id, usera, userb, createdat FROM partnership WHERE usera = ${userId}
   ```

2. **Update data transformation** to map from actual database columns:

   ```typescript
   return {
     id: row.id,
     userA: row.usera, // usera → userA
     userB: row.userb, // userb → userB
     createdAt: row.createdat, // createdat → createdAt
   };
   ```

3. **Update schema initialization** in `lib/db.ts` to match actual database:

   ```sql
   CREATE TABLE IF NOT EXISTS partnership (
     id TEXT PRIMARY KEY,
     usera TEXT NOT NULL UNIQUE,  -- not user_a
     userb TEXT NOT NULL UNIQUE,  -- not user_b
     createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),  -- not created_at
   );
   ```

**Prevention:**

- Always verify actual database schema before writing queries
- Use consistent column naming conventions across all tables
- Test database operations in production-like environments
- Create schema validation endpoints to catch mismatches early

---

### **Issue 6: Environment Variable Configuration**

**Problem:**

```
Error: missing_connection_string
Error: BETTER_AUTH_URL not configured
```

**Root Cause:**

- Missing or incorrect environment variables
- Wrong URL formats (e.g., `@https://` instead of `https://`)
- Missing client-side vs server-side variables

**Solution:**

1. **Set correct environment variables** in Vercel:

   ```
   BETTER_AUTH_SECRET=your-secret-key
   BETTER_AUTH_URL=https://better-do-it.vercel.app
   NEXT_PUBLIC_BETTER_AUTH_URL=https://better-do-it.vercel.app
   POSTGRES_URL=postgresql://user:pass@host:port/db
   ```

2. **Verify configuration**:
   ```bash
   curl -s https://better-do-it.vercel.app/api/test-auth | jq
   ```

**Prevention:**

- Use environment variable validation
- Create configuration testing endpoints
- Document all required variables

---

### **Issue 7: Authentication Cookie Problems**

**Problem:**

```
Login works but no redirect to dashboard
Session not persisting in production
```

**Root Cause:**

- Missing secure cookie settings for HTTPS
- Incorrect SameSite cookie configuration
- Cookie domain issues

**Solution:**

```typescript
// Add production-specific cookie settings
advanced: {
  cookiePrefix: "better-do-it",
  crossSubDomainCookies: { enabled: false },
  ...(isProduction && {
    cookieSecure: true,
    cookieSameSite: "lax",
  }),
},
```

**Prevention:**

- Test authentication flow in production
- Monitor cookie settings in browser DevTools
- Use secure cookie settings for HTTPS

---

### **Issue 8: API Endpoint Failures**

**Problem:**

```
500 Internal Server Error on task operations
Partner API returning incorrect data
```

**Root Cause:**

- API endpoints only implemented for SQLite
- Missing PostgreSQL support for individual operations
- Inconsistent error handling

**Solution:**

1. **Implement dual-environment support**:

   ```typescript
   if (isProduction) {
     // PostgreSQL implementation
     const result = await sql`SELECT * FROM task WHERE userid = ${userId}`;
   } else {
     // SQLite implementation
     const result = appDb
       .prepare("SELECT * FROM task WHERE userId = ?")
       .get(userId);
   }
   ```

2. **Add proper error handling**:
   ```typescript
   try {
     // Database operations
   } catch (error) {
     console.error("Database error:", error);
     return Response.json({ error: "Database error" }, { status: 500 });
   }
   ```

**Prevention:**

- Test all API endpoints in both environments
- Implement comprehensive error handling
- Create debugging endpoints for each operation

---

## 🔧 **Debugging Commands**

### **Check Database Connectivity**

```bash
 curl -s https://better-do-it.vercel.app/api/test-db | jq
```

### **Verify Authentication Setup**

```bash
curl -s https://better-do-it.vercel.app/api/test-auth | jq
```

### **Check Database Schema**

```bash
curl -s https://better-do-it.vercel.app/api/check-schema | jq
```

### **Test API Endpoints**

```bash
for endpoint in "tasks" "partner" "partner/tasks"; do
  echo "Testing /api/$endpoint..."
  curl -s https://better-do-it.vercel.app/api/$endpoint | jq '.error // "OK"'
done
```

### **Verify Environment Variables**

```bash
curl -s https://better-do-it.vercel.app/api/test-auth | jq '.environment, .hasSecret, .hasUrl, .hasPostgresUrl'
```

---

## 🛠 **Prevention Checklist**

### **Before Deployment**

- [ ] Test with production-like environment locally
- [ ] Verify all environment variables are set
- [ ] Check database schema matches expectations
- [ ] Test authentication flow end-to-end
- [ ] Verify API endpoints work in both environments

### **After Deployment**

- [ ] Run database connectivity tests
- [ ] Verify authentication works
- [ ] Test all CRUD operations
- [ ] Check data transformation is working
- [ ] Monitor for 500 errors in logs

### **Ongoing Monitoring**

- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Monitor database connection health
- [ ] Track API response times
- [ ] Watch for authentication failures
- [ ] Monitor database size and performance

---

## 📚 **Related Documentation**

- **[Task API Commands](curl_tasks.md)** - Complete API testing commands
- **[Partner API Commands](curl_partners.md)** - Partnership troubleshooting
- **[Useful Commands](useful_commands.md)** - Database management commands
- **[README.md](README.md)** - Project overview and setup

---

## 🆘 **Emergency Procedures**

### **Database Down**

1. Check Vercel deployment status
2. Verify PostgreSQL connection string
3. Test database connectivity endpoint
4. Check Neon database dashboard
5. Restart deployment if needed

### **Authentication Broken**

1. Verify environment variables
2. Check cookie settings
3. Test authentication endpoints
4. Clear browser cookies and retry
5. Check Better Auth configuration

### **Data Loss**

1. Check database backups
2. Verify data in Neon dashboard
3. Restore from backup if available
4. Re-run database setup if needed
5. Document the incident

---

**Remember: Always test in a staging environment before deploying to production!**
