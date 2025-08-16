# Task API cURL Cookbook (Local Dev)

Use these commands to interact with the Tasks API during development. Ensure you are signed in on the same origin as `BASE` (e.g., `http://localhost:3000`).

Tip: Copy the exact Cookie header from your browser DevTools → Application/Storage → Cookies. Include both cookies in one string (semicolon-separated): `next-auth.session-token` and `better-do-it.session_token`.

## 0) Set environment variables

```bash
BASE=http://localhost:3000
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
  - `open`: array of open tasks
  - `completedThisWeek`: number of tasks completed in the current ET week (Wed 6 PM ET boundary)
  - `needsTopOff`: true if you currently have fewer than 3 open tasks

Only open tasks:

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '.open'
```

Quick summary:

```bash
curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq '{openCount: (.open|length), completedThisWeek, needsTopOff}'
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

Get the first open task id and complete it:

```bash
TASK_ID=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq -r '.open[0].id')
[ -n "$TASK_ID" ] && curl -i -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isCompleted":true}'
```

## 4) Delete a task

```bash
TASK_ID=REPLACE_WITH_ID
curl -i -X DELETE "$BASE/api/tasks/$TASK_ID" -H "Cookie: $COOKIE"
```

## 5) Clear all tasks (nuclear option)

```bash
curl -i -X DELETE "$BASE/api/tasks" -H "Cookie: $COOKIE"
```

⚠️ **Warning**: This deletes ALL tasks (open and completed) for the current user. Cannot be undone!

## Notes

- Host must match where you signed in (`localhost` vs `127.0.0.1`).
- Include both cookies (semicolon-separated) in `COOKIE`: `next-auth.session-token` and `better-do-it.session_token`.
- Week boundary is Wednesday 6 PM Eastern Time (America/New_York).
- Maximum of 3 open tasks per user.
- For partner management, see `curl_partners.md`.
