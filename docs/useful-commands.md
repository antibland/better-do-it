# Essential Commands for Better Do It

This file contains the most important commands for development, debugging, and production management.

## 🔍 **Database Management**

### Check Database Schema

```bash
# Check current schema (production)
curl -s https://better-do-it.vercel.app/api/check-schema | jq

# Check local schema
sqlite3 sqlite.db ".schema task"
```

### Run Migrations

```bash
# Run migration (production)
curl -X POST https://better-do-it.vercel.app/api/migrate-sort-order | jq

# Run migration (local)
curl -X POST http://localhost:3000/api/migrate-sort-order | jq
```

### Test Database Connectivity

```bash
# Test production database
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Test local database
curl -s http://localhost:3000/api/test-db | jq
```

## 🗑️ **Data Management**

### Clear All Data (Local Development Only)

```bash
# ⚠️ WARNING: This deletes ALL data locally!
rm sqlite.db
npm run dev  # This will recreate the database
```

### Reset Specific User Data

```bash
# Delete user and all related data (replace USER_ID_HERE)
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

## 🧪 **API Testing**

### Test Task Operations

```bash
# Get all tasks (requires authentication)
curl -s https://better-do-it.vercel.app/api/tasks | jq

# Create a task (requires authentication)
curl -X POST https://better-do-it.vercel.app/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task"}' | jq

# Reorder tasks (requires authentication)
curl -X POST https://better-do-it.vercel.app/api/tasks/reorder \
  -H "Content-Type: application/json" \
  -d '{"draggableId": "task-id", "source": {"droppableId": "master-tasks", "index": 0}, "destination": {"droppableId": "active-tasks", "index": 0}}' | jq
```

### Test Partner Operations

```bash
# Get partner info
curl -s https://better-do-it.vercel.app/api/partner | jq

# Get partner tasks
curl -s https://better-do-it.vercel.app/api/partner/tasks | jq
```

## 🔧 **Development Commands**

### Start Development Server

```bash
npm run dev
```

### Run Migration Safety Check

```bash
node scripts/migration-safety.js
```

### Check Build Status

```bash
npm run build
```

## 📊 **Monitoring Commands**

### Check Application Health

```bash
# Production health check
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Check for errors in Vercel logs
# Go to Vercel Dashboard → Functions → Logs
```

### Monitor Database Performance

```bash
# Check task count
sqlite3 sqlite.db "SELECT COUNT(*) as total_tasks FROM task;"

# Check active tasks
sqlite3 sqlite.db "SELECT COUNT(*) as active_tasks FROM task WHERE isActive = 1;"

# Check user count
sqlite3 sqlite.db "SELECT COUNT(*) as total_users FROM user;"
```

## 🚨 **Emergency Commands**

### If Production Database is Broken

```bash
# 1. Check current schema
curl -s https://better-do-it.vercel.app/api/check-schema | jq

# 2. Run migration if needed
curl -X POST https://better-do-it.vercel.app/api/migrate-sort-order | jq

# 3. Test database connectivity
curl -s https://better-do-it.vercel.app/api/test-db | jq

# 4. If still broken, check Vercel logs
# Vercel Dashboard → Functions → Logs
```

### If Local Development is Broken

```bash
# 1. Stop dev server
# 2. Delete local database
rm sqlite.db

# 3. Restart dev server (will recreate database)
npm run dev

# 4. Test local endpoints
curl -s http://localhost:3000/api/test-db | jq
```

---

**Note:** For detailed API testing commands, see `curl-tasks.md` and `curl-partners.md`.
