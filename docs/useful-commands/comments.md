# Comment API Commands (Local Dev & Production Debugging)

Use these commands to test and manage comments during development and production debugging. Ensure you are signed in on the same origin as `BASE`.

Tip: Copy the exact Cookie header from your browser DevTools → Application/Storage → Cookies. Use the `better-do-it.session_token` cookie.

## 0) Set environment variables

```bash
# For local development
export BASE=http://localhost:3000

# For production debugging
export BASE=https://better-do-it.com

# Paste the full cookie string here
export COOKIE='better-do-it.session_token=REPLACE_WITH_YOUR_VALUE'

# Verify
[ -n "$BASE" ] && echo "BASE is set" || echo "BASE is empty"
[ -n "$COOKIE" ] && echo "COOKIE is set" || echo "COOKIE is empty"
```

## 1) Get comments for a task

```bash
TASK_ID=REPLACE_WITH_TASK_ID
curl -s "$BASE/api/comments?taskId=$TASK_ID" -H "Cookie: $COOKIE" | jq
```

Response:

- If you're the task owner: returns all unread comments (`isRead = 0`)
- If you're a comment author: returns your comment only

## 2) Create a comment on a partner's task

```bash
TASK_ID=REPLACE_WITH_PARTNER_TASK_ID
curl -i -X POST "$BASE/api/comments" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"taskId":"'"$TASK_ID"'","content":"Hey! You can do this! 💪"}'
```

Validation:

- Content is required and must be ≤ 500 characters
- Only one comment per user per task (UNIQUE constraint)
- Cannot comment on your own tasks

## 3) Update a comment (edit content)

```bash
COMMENT_ID=REPLACE_WITH_COMMENT_ID
curl -i -X PATCH "$BASE/api/comments/$COMMENT_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"content":"Updated: You got this! Keep going! 🎯"}'
```

Only the comment author can edit the content.

## 4) Mark a comment as read (task owner only)

```bash
COMMENT_ID=REPLACE_WITH_COMMENT_ID
curl -i -X PATCH "$BASE/api/comments/$COMMENT_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"isRead":true}'
```

Only the task owner can mark comments as read (soft delete).

## 5) Delete a comment (author only)

```bash
COMMENT_ID=REPLACE_WITH_COMMENT_ID
curl -i -X DELETE "$BASE/api/comments/$COMMENT_ID" \
  -H "Cookie: $COOKIE"
```

Only the comment author can delete their comment.

## 6) Testing: Setup test data for multiple comments UI

To test the UI when multiple users leave comments on your tasks, use this SQLite command (local dev only):

```bash
sqlite3 sqlite.db <<'EOF'
-- Create test users
INSERT OR IGNORE INTO user (id, email, name, createdAt, updatedAt)
VALUES
  ('user1', 'mike@example.com', 'Mike', datetime('now'), datetime('now')),
  ('user2', 'andy@example.com', 'Andy', datetime('now'), datetime('now')),
  ('user3', 'kate@example.com', 'Kate', datetime('now'), datetime('now')),
  ('user4', 'sarah@example.com', 'Sarah', datetime('now'), datetime('now'));

-- Create partnerships
INSERT OR IGNORE INTO partnership (id, userA, userB, createdAt)
VALUES
  ('p1', 'user1', 'user2', datetime('now')),
  ('p2', 'user1', 'user3', datetime('now')),
  ('p3', 'user1', 'user4', datetime('now'));

-- Create tasks for Mike
INSERT OR IGNORE INTO task (id, userId, title, isCompleted, isActive, sortOrder, createdAt, addedToActiveAt)
VALUES
  ('task1', 'user1', 'Unpack 3 boxes from garage', 0, 1, 0, datetime('now'), datetime('now', '-14 days')),
  ('task2', 'user1', 'Get quote for tick spray', 0, 1, 1, datetime('now'), datetime('now', '-10 days')),
  ('task3', 'user1', 'Schedule dentist appointment', 0, 1, 2, datetime('now'), datetime('now', '-7 days'));

-- Create comments (3 on task1, 2 on task2, 1 on task3)
INSERT OR IGNORE INTO comment (id, taskId, authorId, content, createdAt, updatedAt, isRead)
VALUES
  ('c1', 'task1', 'user2', 'Hey Mike! You got this! Those boxes have been sitting there for a while. 📦', datetime('now', '-2 hours'), datetime('now', '-2 hours'), 0),
  ('c2', 'task1', 'user3', 'I can help you with this on Saturday if you would like!', datetime('now', '-1 hour'), datetime('now', '-1 hour'), 0),
  ('c3', 'task1', 'user4', 'Don''t forget to check if any of those boxes have fragile items!', datetime('now', '-30 minutes'), datetime('now', '-30 minutes'), 0),
  ('c4', 'task2', 'user2', 'I used Green Lawn Services last year - they were great!', datetime('now', '-3 hours'), datetime('now', '-3 hours'), 0),
  ('c5', 'task2', 'user3', 'Make sure to ask about pet-safe options if you have furry friends 🐕', datetime('now', '-1 hour'), datetime('now', '-1 hour'), 0),
  ('c6', 'task3', 'user2', 'Just a reminder - Dr. Smith''s office books up fast, so call soon!', datetime('now', '-4 hours'), datetime('now', '-4 hours'), 0);

SELECT 'Test data created successfully!' as message;
SELECT '- Sign in as mike@example.com to see comment badges' as instruction;
SELECT '- Task 1 has 3 comments, Task 2 has 2 comments, Task 3 has 1 comment' as instruction;
EOF
```

## 7) Testing: View all comments in database

```bash
# View all comments with author names
sqlite3 sqlite.db <<'EOF'
SELECT
  c.id,
  t.title as task_title,
  u.name as author_name,
  c.content,
  c.isRead,
  c.createdAt
FROM comment c
JOIN task t ON c.taskId = t.id
JOIN user u ON c.authorId = u.id
ORDER BY c.createdAt DESC;
EOF
```

## 8) Testing: Count comments per task

```bash
# Show comment count for each task
sqlite3 sqlite.db <<'EOF'
SELECT
  t.title,
  COUNT(c.id) as comment_count,
  SUM(CASE WHEN c.isRead = 0 THEN 1 ELSE 0 END) as unread_count
FROM task t
LEFT JOIN comment c ON t.id = c.taskId
GROUP BY t.id, t.title
HAVING comment_count > 0;
EOF
```

## 9) Testing: Clear all test comments

```bash
# Remove all comments (local dev only)
sqlite3 sqlite.db "DELETE FROM comment WHERE 1=1;"
```

## Notes

- Comments are soft-deleted (marked as read with `isRead = 1`)
- Only one comment per user per task (enforced by UNIQUE constraint)
- Comment content limited to 500 characters
- Task owners see all unread comments on their tasks
- Comment authors only see their own comments
- For task and partner commands, see `tasks.md` and `partners.md`
