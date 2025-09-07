# Partner API cURL Cookbook (Local Dev & Production Debugging)

Use these commands to manage partnerships during development and production debugging. Ensure you are signed in on the same origin as `BASE`.

Tip: Copy the exact Cookie header from your browser DevTools → Application/Storage → Cookies. Use the `better-do-it.session_token` cookie.

## 0) Set environment variables

```bash
# For local development
BASE=http://localhost:3000

# For production debugging
BASE=https://better-do-it.vercel.app

# Paste the full cookie string here. Use the better-do-it.session_token cookie.
# Example (use DevTools as source of truth):
# COOKIE='better-do-it.session_token=...'
COOKIE='better-do-it.session_token=REPLACE_WITH_YOUR_VALUE'

# Verify
[ -n "$BASE" ] && echo "BASE is set" || echo "BASE is empty"
[ -n "$COOKIE" ] && echo "COOKIE is set" || echo "COOKIE is empty"
```

## 1) Get current partner

```bash
curl -s "$BASE/api/partner" -H "Cookie: $COOKIE" | jq
```

Response:

- `partner: null` if no partnership exists
- `partner: {...}` with partner's id, email, name, partnershipId, createdAt if partnered

## 2) Pair with another user by email

```bash
curl -i -X POST "$BASE/api/partner" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"email":"partner@example.com"}'
```

Validation rules:

- Both users must not already be in partnerships
- Partner email must exist in the system
- Cannot partner with yourself

## 3) Unpair from current partnership

```bash
curl -i -X DELETE "$BASE/api/partner" -H "Cookie: $COOKIE"
```

## 4) View partner's tasks (read-only)

```bash
curl -s "$BASE/api/partner/tasks" -H "Cookie: $COOKIE" | jq
```

Response includes:

- `partner`: partner's user info (id, email, name)
- `tasks`: array of partner's active tasks (isActive = 1)
- `completedThisWeek`: number of tasks partner completed this week

Quick summary:

```bash
curl -s "$BASE/api/partner/tasks" -H "Cookie: $COOKIE" | jq '{partnerName: .partner.name, taskCount: (.tasks|length), completedThisWeek}'
```

## 5) Testing Multiple Partnerships (Local Development)

For testing the multiple partnerships feature locally, you can create several test users and pair them with your main account.

### Create test users (if they don't exist)

```bash
# Create test users by signing them up through the auth flow
# You'll need to do this through the browser for each test user:
# 1. Go to http://localhost:3000/auth
# 2. Sign up with: test2@example.com, test3@example.com, test4@example.com
# 3. Complete the signup process for each
```

### Pair with multiple test users

```bash
# Pair with test2@example.com
curl -i -X POST "$BASE/api/partner" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"email":"test2@example.com"}'

# Pair with test3@example.com
curl -i -X POST "$BASE/api/partner" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"email":"test3@example.com"}'

# Pair with test4@example.com
curl -i -X POST "$BASE/api/partner" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"email":"test4@example.com"}'
```

### Verify multiple partnerships

```bash
# Check all current partnerships
curl -s "$BASE/api/partner" -H "Cookie: $COOKIE" | jq

# Should return: {"partners": [{"id": "...", "email": "test2@example.com", ...}, ...]}
```

### Test partner tasks for each partner

```bash
# Get tasks for test2@example.com
curl -s "$BASE/api/partner/tasks?partnerId=PARTNER2_ID" -H "Cookie: $COOKIE" | jq

# Get tasks for test3@example.com
curl -s "$BASE/api/partner/tasks?partnerId=PARTNER3_ID" -H "Cookie: $COOKIE" | jq

# Get tasks for test4@example.com
curl -s "$BASE/api/partner/tasks?partnerId=PARTNER4_ID" -H "Cookie: $COOKIE" | jq
```

### Unpair from specific partner

```bash
# Unpair from a specific partner (replace PARTNERSHIP_ID with actual ID)
curl -i -X DELETE "$BASE/api/partner" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"partnershipId":"PARTNERSHIP_ID"}'
```

## 6) Production Debugging Commands

### Test partner endpoints for errors

```bash
# Test partner endpoints
for endpoint in "partner" "partner/tasks"; do
  echo "Testing /api/$endpoint..."
  curl -s "$BASE/api/$endpoint" -H "Cookie: $COOKIE" | jq '.error // "OK"'
done
```

### Check partnership data structure

```bash
# Verify partnership table structure
curl -s "$BASE/api/check-schema" | jq '.tables[] | select(.table_name == "partnership")'
```

### Test partner tasks data transformation

```bash
# Verify partner tasks column mapping (lowercase DB → camelCase frontend)
curl -s "$BASE/api/partner/tasks" -H "Cookie: $COOKIE" | jq '.tasks[0] | keys'
# Should show: ["id", "userId", "title", "isCompleted", "isActive", "createdAt", "completedAt", "addedToActiveAt"]
```

### Test empty partnership handling

```bash
# Test response when no partnership exists
curl -s "$BASE/api/partner/tasks" -H "Cookie: $COOKIE" | jq '.partner, .tasks, .completedThisWeek'
# Should return: {"partner": null, "tasks": [], "completedThisWeek": 0}
```

## Notes

- Host must match where you signed in (`localhost` vs `127.0.0.1`).
- Use the `better-do-it.session_token` cookie in `COOKIE`.
- Week boundary is Wednesday 6 PM Eastern Time (America/New_York).
- Partner tasks are read-only; you cannot modify them.
- Partnerships support multiple partners per user (unlimited for now, will be gated for premium in the future).
- **Production debugging**: Use `BASE=https://better-do-it.vercel.app` for production testing.
- **Database columns**: PostgreSQL uses lowercase (`userid`, `iscompleted`) but API returns camelCase (`userId`, `isCompleted`).
- **Error handling**: Endpoints return 200 with empty arrays instead of 404/500 errors when no data exists.
