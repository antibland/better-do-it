# Pre-Deployment Checklist

## 🚨 **CRITICAL: Database Column Naming Check**

**BEFORE declaring code "ready to test", verify:**

### ✅ **1. Environment Detection**

- [ ] Code uses `process.env.NODE_ENV === "production"` to detect environment
- [ ] Both SQLite and PostgreSQL paths are implemented
- [ ] No hardcoded column names without environment checks

### ✅ **2. Column Name Consistency**

- [ ] **PostgreSQL queries** use lowercase column names (`userid`, `iscompleted`)
- [ ] **SQLite queries** use camelCase column names (`userId`, `isCompleted`)
- [ ] **Frontend always receives** camelCase (`userId`, `isCompleted`)

### ✅ **3. Transformation Layer**

- [ ] API responses transform database columns to frontend format
- [ ] Both environments return identical data structures
- [ ] No direct database column names exposed to frontend

### ✅ **4. Database Schema**

- [ ] Schema matches documented conventions in `data-consistency.md`
- [ ] Both environments have equivalent tables and columns
- [ ] Column types are compatible across environments

## 🔍 **Common Column Name Patterns**

| Table         | PostgreSQL                  | SQLite                      | Frontend                    |
| ------------- | --------------------------- | --------------------------- | --------------------------- |
| `user`        | `id`, `email`, `name`       | `id`, `email`, `name`       | `id`, `email`, `name`       |
| `task`        | `userid`, `iscompleted`     | `userId`, `isCompleted`     | `userId`, `isCompleted`     |
| `partnership` | `usera`, `userb`            | `userA`, `userB`            | `userA`, `userB`            |
| `invite`      | `inviterid`, `inviteeemail` | `inviterId`, `inviteeEmail` | `inviterId`, `inviteeEmail` |

## 🚫 **NEVER DO THIS**

```typescript
// ❌ WRONG - Hardcoded column names
const result = await sql`SELECT * FROM task WHERE userid = ${userId}`;

// ❌ WRONG - No environment detection
const result = appDb.prepare("SELECT * FROM task WHERE userId = ?").get(userId);

// ❌ WRONG - Inconsistent naming
return { userId: row.userid, isCompleted: row.iscompleted };
```

## ✅ **ALWAYS DO THIS**

```typescript
// ✅ CORRECT - Environment detection + transformation
if (isProduction) {
  const result =
    await sql`SELECT userid, iscompleted FROM task WHERE userid = ${userId}`;
  return result.rows.map((row) => ({
    userId: row.userid, // lowercase → camelCase
    isCompleted: row.iscompleted, // lowercase → camelCase
  }));
} else {
  const result = appDb
    .prepare("SELECT userId, isCompleted FROM task WHERE userId = ?")
    .get(userId);
  return [
    {
      userId: result.userId, // camelCase → camelCase
      isCompleted: result.isCompleted, // camelCase → camelCase
    },
  ];
}
```

## 🧪 **Testing Checklist**

- [ ] **SQLite path tested** locally
- [ ] **PostgreSQL path tested** (or verified with schema)
- [ ] **Both paths return identical data structures**
- [ ] **Frontend receives expected format**
- [ ] **No column name errors in console**

## 📚 **Required Reading**

**BEFORE writing database code:**

1. **[Data Consistency Guide](data-consistency.md)** - Complete column mapping
2. **[Database Architecture](db-architecture.md)** - Dual database setup
3. **[Migration Rules](migration-rules.md)** - Quick reference

## 🆘 **When in Doubt**

1. **Check existing working code** for patterns
2. **Use the transformation layer** consistently
3. **Test both environments** before declaring ready
4. **Ask for review** if unsure about column naming

---

**Remember: Column naming issues cause 80% of database errors. Always check this first!**
