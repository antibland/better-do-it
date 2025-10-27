# Task API Commands (Local Development)

Use these commands to interact with the Tasks API during local development.

## Interactive Menu

For an easier testing experience, use the interactive menu script:

```bash
./scripts/task-menu.sh
```

This provides a menu-driven interface for all the commands below.

## 0) Set environment variables

```bash
BASE=http://localhost:3000

# Copy this from DevTools → Application → Cookies → better-do-it.session_token
COOKIE='better-do-it.session_token=REPLACE_WITH_YOUR_VALUE'

# Verify
echo "BASE is: $BASE"
echo "COOKIE is set: $([ -n "$COOKIE" ] && echo 'yes' || echo 'no')"
```

## 1) Get all user tasks

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.tasks[] | {id, title}'
```

## 2) Get completed tasks

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.tasks[] | select(.isCompleted == 1) | {id, title}'
```

## 3) Get master tasks

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.masterTasks[] | {id, title}'
```

## 4) Get active tasks

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.activeTasks[] | {id, title}'
```

## 5) List all tasks

Full response:

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq
```

Quick summary:

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '{activeCount: (.activeTasks|length), masterCount: (.masterTasks|length), completedThisWeek}'
```

## 6) Create a task

```bash
curl -s -X POST "$BASE/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"title":"My new task"}' | jq
```

Create and capture the ID:

```bash
TASK_ID=$(curl -s -X POST "$BASE/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"title":"Temp task"}' | jq -r '.task.id')
echo "Created task: $TASK_ID"
```

## 7) Update a task

Complete a task:

```bash
TASK_ID=REPLACE_WITH_ID
curl -s -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isCompleted":true}' | jq
```

Update task title:

```bash
TASK_ID=REPLACE_WITH_ID
curl -s -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"title":"Updated title"}' | jq
```

## 8) Delete a task

```bash
TASK_ID=REPLACE_WITH_ID
curl -s -X DELETE "$BASE/api/tasks/$TASK_ID" -H "Cookie: $COOKIE" | jq
```

## Notes

- Week boundary is Wednesday 6 PM Eastern Time
- Maximum of 3 active tasks per user
- Use drag and drop in the UI to move tasks between active and master lists
