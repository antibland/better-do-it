# Partner API cURL Cookbook (Local Dev & Production Debugging)

Use these commands to manage partnerships during development and production debugging. Ensure you are signed in on the same origin as `BASE`.

Tip: Copy the exact Cookie header from your browser DevTools → Application/Storage → Cookies. Include both cookies in one string (semicolon-separated): `next-auth.session-token` and `better-do-it.session_token`.

## 0) Set environment variables

```bash
# For local development
BASE=http://localhost:3000

# For production debugging
BASE=https://better-do-it.vercel.app

# Paste the full cookie string here. Include both cookies if there are multiple.
# Example (names may differ slightly; use DevTools as source of truth):
# COOKIE='next-auth.session-token=...; better-do-it.session_token=...'
COOKIE='next-auth.session-token=REPLACE_WITH_YOUR_VALUE; better-do-it.session_token=REPLACE_WITH_YOUR_VALUE'

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

## 5) Production Debugging Commands

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
- Include both cookies (semicolon-separated) in `COOKIE`: `next-auth.session-token` and `better-do-it.session_token`.
- Week boundary is Wednesday 6 PM Eastern Time (America/New_York).
- Partner tasks are read-only; you cannot modify them.
- Partnerships are exclusive - each user can only be in one partnership at a time.
- **Production debugging**: Use `BASE=https://better-do-it.vercel.app` for production testing.
- **Database columns**: PostgreSQL uses lowercase (`userid`, `iscompleted`) but API returns camelCase (`userId`, `isCompleted`).
- **Error handling**: Endpoints return 200 with empty arrays instead of 404/500 errors when no data exists.
