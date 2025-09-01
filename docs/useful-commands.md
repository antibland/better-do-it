# Useful Commands for Better Do It (SQLite & PostgreSQL)

This file contains helpful commands for managing your Better Auth database during development and production debugging.

## 🔍 **Viewing Data**

### View All Users

```bash
# Basic user info
sqlite3 sqlite.db "SELECT id, email, name, emailVerified, createdAt, role FROM user ORDER BY createdAt DESC;"

# Formatted output with headers
sqlite3 sqlite.db -header -column "SELECT email, name, emailVerified, createdAt FROM user ORDER BY createdAt DESC;"

# Count total users
sqlite3 sqlite.db "SELECT COUNT(*) as total_users FROM user;"
```

### View All Sessions

```bash
# Active sessions
sqlite3 sqlite.db "SELECT userId, token, expiresAt, createdAt FROM session WHERE expiresAt > datetime('now') ORDER BY createdAt DESC;"

# All sessions (including expired)
sqlite3 sqlite.db "SELECT userId, token, expiresAt, createdAt FROM session ORDER BY createdAt DESC;"

# Sessions for specific user
sqlite3 sqlite.db "SELECT * FROM session WHERE userId = 'USER_ID_HERE';"
```

### View Social Accounts

```bash
# All connected social accounts
sqlite3 sqlite.db "SELECT userId, providerId, accountId FROM account ORDER BY createdAt DESC;"

# Accounts for specific user
sqlite3 sqlite.db "SELECT * FROM account WHERE userId = 'USER_ID_HERE';"
```

### View Email Verification Records

```bash
# All verification records
sqlite3 sqlite.db "SELECT identifier, value, expiresAt, createdAt FROM verification ORDER BY createdAt DESC;"

# Active verification tokens
sqlite3 sqlite.db "SELECT * FROM verification WHERE expiresAt > datetime('now');"
```

### View Tasks (App-specific)

```bash
# All tasks for a user
sqlite3 sqlite.db "SELECT id, userId, title, isCompleted, isActive, createdAt, completedAt, addedToActiveAt FROM task WHERE userId = 'USER_ID_HERE' ORDER BY isActive DESC, isCompleted ASC, createdAt ASC;"

# Active tasks only
sqlite3 sqlite.db "SELECT * FROM task WHERE userId = 'USER_ID_HERE' AND isActive = 1;"

# Master list tasks only
sqlite3 sqlite.db "SELECT * FROM task WHERE userId = 'USER_ID_HERE' AND isActive = 0;"

# Completed tasks this week
sqlite3 sqlite.db "SELECT COUNT(*) FROM task WHERE userId = 'USER_ID_HERE' AND isActive = 1 AND isCompleted = 1 AND completedAt >= datetime('now', 'weekday 3', '-6 days', '18:00:00') AND completedAt < datetime('now', 'weekday 3', '18:00:00');"
```

### View Partnerships (App-specific)

```bash
# All partnerships
sqlite3 sqlite.db "SELECT * FROM partnership;"

# Partnership for specific user
sqlite3 sqlite.db "SELECT * FROM partnership WHERE user_a = 'USER_ID_HERE' OR user_b = 'USER_ID_HERE';"
```

## 🗑️ **Cleaning Data**

### Delete Specific User

```bash
# Delete user and all related data
sqlite3 sqlite.db "
BEGIN TRANSACTION;
DELETE FROM session WHERE userId = 'USER_ID_HERE';
DELETE FROM account WHERE userId = 'USER_ID_HERE';
DELETE FROM verification WHERE identifier = 'USER_EMAIL_HERE';
DELETE FROM task WHERE userId = 'USER_ID_HERE';
DELETE FROM partnership WHERE user_a = 'USER_ID_HERE' OR user_b = 'USER_ID_HERE';
DELETE FROM user WHERE id = 'USER_ID_HERE';
COMMIT;
"
```

### Clear All Users (Fresh Start)

```bash
# ⚠️ WARNING: This deletes ALL user data!
sqlite3 sqlite.db "
BEGIN TRANSACTION;
DELETE FROM verification;
DELETE FROM session;
DELETE FROM account;
DELETE FROM task;
DELETE FROM partnership;
DELETE FROM user;
COMMIT;
"
```

### Clear Expired Sessions

```bash
sqlite3 sqlite.db "DELETE FROM session WHERE expiresAt < datetime('now');"
```

### Clear Expired Verification Tokens

```bash
sqlite3 sqlite.db "DELETE FROM verification WHERE expiresAt < datetime('now');"
```

### Clear All Tasks

**⚠️ NOTE**: The "Clear All" button has been removed from the UI to prevent accidental data loss. These commands are for development/debugging only.

```bash
# Clear all tasks for a specific user
sqlite3 sqlite.db "DELETE FROM task WHERE userId = 'USER_ID_HERE';"

# Clear all tasks (nuclear option)
sqlite3 sqlite.db "DELETE FROM task;"
```

## 📊 **Database Schema & Structure**

### View All Tables

```bash
sqlite3 sqlite.db ".tables"
```

### View Table Schema

```bash
# View user table structure
sqlite3 sqlite.db ".schema user"

# View task table structure
sqlite3 sqlite.db ".schema task"

# View partnership table structure
sqlite3 sqlite.db ".schema partnership"

# View all table schemas
sqlite3 sqlite.db ".schema"
```

### View Table Info

```bash
# Detailed info about user table
sqlite3 sqlite.db "PRAGMA table_info(user);"

# Detailed info about task table
sqlite3 sqlite.db "PRAGMA table_info(task);"

# Detailed info about partnership table
sqlite3 sqlite.db "PRAGMA table_info(partnership);"
```

## 🔧 **Development Helpers**

### Interactive SQLite Shell

```bash
# Open interactive shell
sqlite3 sqlite.db

# Inside the shell, useful commands:
# .help          - Show all commands
# .tables        - List all tables
# .quit          - Exit shell
# .headers on    - Show column headers
# .mode column   - Format output in columns
```

### Export Data

```bash
# Export all users to CSV
sqlite3 sqlite.db -header -csv "SELECT * FROM user;" > users_backup.csv

# Export all tasks to CSV
sqlite3 sqlite.db -header -csv "SELECT * FROM task;" > tasks_backup.csv

# Export database structure
sqlite3 sqlite.db ".dump" > database_backup.sql
```

### Database Statistics

```bash
# Database file size and info
sqlite3 sqlite.db "
SELECT
  page_count * page_size as size_bytes,
  page_count,
  page_size
FROM pragma_page_count(), pragma_page_size();
"

# Table row counts
sqlite3 sqlite.db "
SELECT 'users' as table_name, COUNT(*) as row_count FROM user
UNION ALL
SELECT 'sessions', COUNT(*) FROM session
UNION ALL
SELECT 'accounts', COUNT(*) FROM account
UNION ALL
SELECT 'verifications', COUNT(*) FROM verification
UNION ALL
SELECT 'tasks', COUNT(*) FROM task
UNION ALL
SELECT 'partnerships', COUNT(*) FROM partnership;
"
```

## 🚨 **Troubleshooting**

### Find User by Email

```bash
sqlite3 sqlite.db "SELECT * FROM user WHERE email = 'user@example.com';"
```

### Check Active Sessions for User

```bash
sqlite3 sqlite.db "
SELECT u.email, s.token, s.expiresAt, s.createdAt
FROM user u
JOIN session s ON u.id = s.userId
WHERE u.email = 'user@example.com'
AND s.expiresAt > datetime('now');
"
```

### Find Duplicate Emails (shouldn't exist)

```bash
sqlite3 sqlite.db "
SELECT email, COUNT(*) as count
FROM user
GROUP BY email
HAVING COUNT(*) > 1;
"
```

### Check Task Data Integrity

```bash
# Find tasks with invalid user references
sqlite3 sqlite.db "
SELECT t.id, t.userId, t.title
FROM task t
LEFT JOIN user u ON t.userId = u.id
WHERE u.id IS NULL;
"

# Find partnerships with invalid user references
sqlite3 sqlite.db "
SELECT p.id, p.user_a, p.user_b
FROM partnership p
LEFT JOIN user u1 ON p.user_a = u1.id
LEFT JOIN user u2 ON p.user_b = u2.id
WHERE u1.id IS NULL OR u2.id IS NULL;
"
```

## 🌐 **Production Debugging (PostgreSQL)**

### Test Database Connectivity

```bash
# Test PostgreSQL connection
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Expected: {"success":true,"timestamp":"2024-01-01T12:00:00.000Z"}
```

### Test Authentication Setup

```bash
# Test better-auth instance
curl -s https://better-do-it.vercel.app/api/test-auth | jq

# Expected: {"success":true,"authStatus":"working"}

# Test login process
curl -i -X POST https://better-do-it.vercel.app/api/test-login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### Check Database Schema

```bash
# View actual table and column names in PostgreSQL
curl -s https://better-do-it.vercel.app/api/check-schema | jq

# Expected: Shows tables: user, session, account, verification, task, partnership
```

### Setup Database Tables

```bash
# Create all required tables (run once after deployment)
curl -i -X POST https://better-do-it.vercel.app/api/setup-db
```

### Test API Endpoints

```bash
# Test all endpoints for errors
for endpoint in "tasks" "partner" "partner/tasks"; do
  echo "Testing /api/$endpoint..."
  curl -s https://better-do-it.vercel.app/api/$endpoint | jq '.error // "OK"'
done
```

### Verify Environment Variables

```bash
# Check if auth is properly configured
curl -s https://better-do-it.vercel.app/api/test-auth | jq '.environment, .hasSecret, .hasUrl, .hasPostgresUrl'
```

### Test Data Transformation

```bash
# Verify column name mapping (lowercase DB → camelCase frontend)
curl -s https://better-do-it.vercel.app/api/tasks | jq '.activeTasks[0] | keys'
# Should show: ["id", "userId", "title", "isCompleted", "isActive", "createdAt", "completedAt", "addedToActiveAt"]
```

## 🚀 **Deployment Commands**

### Build and Test

```bash
# Build the application
npm run build

# Run linting
npm run lint

# Start development server
npm run dev

# Start production server
npm start
```

### Database Migration

```bash
# Generate better-auth migration
npx @better-auth/cli generate

# Run better-auth migration
npx @better-auth/cli migrate

# Setup database tables manually (if needed)
curl -i -X POST https://better-do-it.vercel.app/api/setup-db
```

### Git Operations

```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to remote
git push

# Check deployment status
git log --oneline -5
```

## 📝 **Quick Reference**

### Common SQLite Data Types in Better Auth

- `TEXT` - Strings (email, name, tokens)
- `INTEGER` - Numbers and booleans (0/1)
- `REAL` - Floating point numbers
- `BLOB` - Binary data
- `NULL` - Empty values

### Date/Time Functions

```bash
# Current timestamp
datetime('now')

# Format dates
strftime('%Y-%m-%d %H:%M:%S', createdAt)

# Date comparisons
WHERE createdAt > datetime('now', '-1 day')
WHERE expiresAt < datetime('now')

# Week boundary (Wednesday 6 PM ET)
WHERE completedAt >= datetime('now', 'weekday 3', '-6 days', '18:00:00')
AND completedAt < datetime('now', 'weekday 3', '18:00:00')
```

### PostgreSQL vs SQLite Differences

| Feature           | SQLite (Local) | PostgreSQL (Production) |
| ----------------- | -------------- | ----------------------- |
| Column Names      | camelCase      | lowercase               |
| Parameter Binding | `?`            | `${value}`              |
| Operations        | Synchronous    | Asynchronous            |
| Connection        | File-based     | Connection string       |
| Data Types        | Dynamic        | Strict                  |

## 🔐 **Security Notes**

- **Never run DELETE commands in production without backups**
- **User passwords are hashed** - you can't see plain text passwords
- **Session tokens are sensitive** - don't log them in production
- **Always use transactions** for multi-table operations
- **Environment variables** are sensitive - don't commit them to git

## 💡 **Pro Tips**

1. **Use `.headers on` and `.mode column`** for readable SQLite output
2. **Always backup before bulk operations**: `cp sqlite.db sqlite.db.backup`
3. **Use LIMIT** for large datasets: `SELECT * FROM user LIMIT 10;`
4. **Use transactions** for data consistency
5. **Check foreign key constraints**: `PRAGMA foreign_keys = ON;`
6. **Test both environments** - local SQLite and production PostgreSQL
7. **Monitor API responses** for data transformation issues
8. **Use jq for JSON parsing** in curl commands: `curl ... | jq`

---

_Generated for Better Do It - Todo app for partners_

## ✅ Tasks API (Local Dev)

These commands assume you are signed in at `http://localhost:3000` so your requests include a valid session. With curl, pass your session cookie explicitly.

Tip: Get your session cookie value from your browser DevTools → Application → Cookies → `better-do-it` prefix (e.g., `better-do-it-session`). Replace `YOUR_SESSION_TOKEN` below.

### Create a Task

```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: better-do-it-session=YOUR_SESSION_TOKEN" \
  -d '{"title":"Write weekly summary"}'
```

### List Tasks and Weekly Counts

```bash
curl -s http://localhost:3000/api/tasks \
  -H "Cookie: better-do-it-session=YOUR_SESSION_TOKEN" | jq
```

Response includes:

- `open`: array of your open tasks
- `completedThisWeek`: number of tasks you completed in the current ET week

### Mark Completed/Uncompleted Explicitly

```bash
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: better-do-it-session=YOUR_SESSION_TOKEN" \
  -d '{"isCompleted":true}'

curl -X PATCH http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: better-do-it-session=YOUR_SESSION_TOKEN" \
  -d '{"isCompleted":false}'
```

### Delete a Task

```bash
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID \
  -H "Cookie: better-do-it-session=YOUR_SESSION_TOKEN"
```

Notes:

- Replace `TASK_ID` with the `id` from previous responses.
- All times/counts respect the week boundary (Wednesday 6 PM ET).
