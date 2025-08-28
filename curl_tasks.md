# Task API cURL Cookbook (Local Dev & Production Debugging)

Use these commands to interact with the Tasks API during development and production debugging. Ensure you are signed in on the same origin as `BASE`.

Tip: Copy the exact Cookie header from your browser DevTools → Application/Storage → Cookies. Include both cookies in one string (semicolon-separated): `next-auth.session-token` and `better-do-it.session_token`.

## 0) Set environment variables

```bash
# For local development
BASE=http://localhost:3000

# For production debugging
BASE=https://better-do-it.vercel.app

# Paste the full cookie string here. Include all better-do-it-* cookies if there are multiple.
# Example (names may differ slightly; use DevTools as source of truth):
# COOKIE='next-auth.session-token=...; better-do-it.session_token=...'
COOKIE='next-auth.session-token=REPLACE_WITH_YOUR_VALUE; better-do-it.session_token=REPLACE_WITH_YOUR_VALUE'

# Verify
[ -n "$BASE" ] && echo "BASE is set" || echo "BASE is empty"
[ -n "$COOKIE" ] && echo "COOKIE is set" || echo "COOKIE is empty"
```

## 1) List tasks and weekly counts

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq
```

- Response fields:
  - `tasks`: array of all tasks (active + master)
  - `activeTasks`: array of active tasks (isActive = 1)
  - `masterTasks`: array of master list tasks (isActive = 0)
  - `openActiveTasks`: array of open active tasks (isActive = 1, isCompleted = 0)
  - `completedThisWeek`: number of tasks completed in the current ET week (Wed 6 PM ET boundary)

Only active tasks:

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.activeTasks'
```

Quick summary:

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '{activeCount: (.activeTasks|length), masterCount: (.masterTasks|length), completedThisWeek}'
```

## 2) Create tasks

Create a single task:

```bash
curl -i -X POST "$BASE/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"title":"Write weekly summary"}'
```

Create three tasks quickly:

```bash
for t in "Task A" "Task B" "Task C"; do
  curl -s -X POST "$BASE/api/tasks" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d "{\"title\":\"$t\"}" | jq -r '.task.id'
done
```

Create and capture the new task id into a variable:

```bash
TASK_ID=$(curl -s -X POST "$BASE/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"title":"Temp task"}' | jq -r '.task.id')

echo "$TASK_ID"
```

## 3) Toggle completion or set explicitly

Toggle completion (flip state):

```bash
TASK_ID=REPLACE_WITH_ID
curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"toggle":true}'
```

Set completed/uncompleted explicitly:

```bash
curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isCompleted":true}'

curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isCompleted":false}'
```

Get the first open active task id and complete it:

```bash
TASK_ID=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq -r '.openActiveTasks[0].id')
[ -n "$TASK_ID" ] && curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isCompleted":true}'
```

## 4) Archive/Activate tasks (toggle active status)

Archive an active task to master list:

```bash
TASK_ID=REPLACE_WITH_ID
curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isActive":false}'
```

Activate a master task (if you have fewer than 3 active tasks):

```bash
TASK_ID=REPLACE_WITH_ID
curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isActive":true}'
```

## 5) Update task title

```bash
TASK_ID=REPLACE_WITH_ID
curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"title":"Updated task title"}'
```

## 6) Delete a task

```bash
TASK_ID=REPLACE_WITH_ID
curl -i -X DELETE "$BASE/api/tasks/$TASK_ID" -H "Cookie: $COOKIE"
```

## 7) Clear all tasks (nuclear option)

**⚠️ REMOVED**: The "clear all tasks" functionality has been removed to prevent accidental data loss. Users can still delete individual tasks using the delete endpoint above.

If you need to clear all tasks, you can use the database commands in `useful_commands.md` (for development only).

## 8) Production Debugging Commands

### Test database connectivity

```bash
# Test PostgreSQL connection
curl -s "$BASE/api/test-db" | jq

# Expected response: {"success":true,"timestamp":"2024-01-01T12:00:00.000Z"}
```

### Test authentication setup

```bash
# Test better-auth instance
curl -s "$BASE/api/test-auth" | jq

# Expected response: {"success":true,"authStatus":"working"}
```

### Test sign-up process

```bash
# Test user registration
curl -i -X POST "$BASE/api/test-signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Test login process

```bash
# Test user authentication
curl -i -X POST "$BASE/api/test-login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### Check database schema

```bash
# View actual table and column names in PostgreSQL
curl -s "$BASE/api/check-schema" | jq

# Expected response shows tables: user, session, account, verification, task, partnership
```

### Setup database tables

```bash
# Create all required tables (run once after deployment)
curl -i -X POST "$BASE/api/setup-db"
```

### Test tasks API structure

```bash
# Get mock tasks response for frontend testing
curl -s "$BASE/api/test-tasks" | jq

# Expected response: mock TasksResponse structure
```

### Check migration status

```bash
# Check if database migration is needed
curl -i -X POST "$BASE/api/migrate-db"
```

## 9) Error Diagnosis

### Check for 500 errors

```bash
# Test all endpoints for errors
for endpoint in "tasks" "partner" "partner/tasks"; do
  echo "Testing /api/$endpoint..."
  curl -s "$BASE/api/$endpoint" -H "Cookie: $COOKIE" | jq '.error // "OK"'
done
```

### Verify environment variables

```bash
# Check if auth is properly configured
curl -s "$BASE/api/test-auth" | jq '.environment, .hasSecret, .hasUrl, .hasPostgresUrl'
```

### Test data transformation

```bash
# Verify column name mapping (lowercase DB → camelCase frontend)
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.activeTasks[0] | keys'
# Should show: ["id", "userId", "title", "isCompleted", "isActive", "createdAt", "completedAt", "addedToActiveAt"]
```

## Notes

- Host must match where you signed in (`localhost` vs `127.0.0.1`).
- Include both cookies (semicolon-separated) in `COOKIE`: `next-auth.session-token` and `better-do-it.session_token`.
- Week boundary is Wednesday 6 PM Eastern Time (America/New_York).
- Maximum of 3 active tasks per user.
- For partner management, see `curl_partners.md`.
- **Production debugging**: Use `BASE=https://better-do-it.vercel.app` for production testing.
- **Database columns**: PostgreSQL uses lowercase (`userid`, `iscompleted`) but API returns camelCase (`userId`, `isCompleted`).
