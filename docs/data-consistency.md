# Data Consistency Strategy

This document outlines the data consistency strategy between PostgreSQL (production) and SQLite (development) databases.

## **Overview**

The application uses two different database systems:

- **Production**: PostgreSQL with lowercase column names
- **Development**: SQLite with camelCase column names

To maintain consistency, we use a **transformation layer** in the API endpoints that converts between database column names and frontend expectations.

## **Column Name Mapping**

### **Task Table**

| Frontend (camelCase) | PostgreSQL (lowercase) | SQLite (camelCase) |
| -------------------- | ---------------------- | ------------------ |
| `userId`             | `userid`               | `userId`           |
| `isCompleted`        | `iscompleted`          | `isCompleted`      |
| `isActive`           | `isactive`             | `isActive`         |
| `sortOrder`          | `sort_order`           | `sortOrder`        |
| `createdAt`          | `createdat`            | `createdAt`        |
| `completedAt`        | `completedat`          | `completedAt`      |
| `addedToActiveAt`    | `addedtoactiveat`      | `addedToActiveAt`  |

### **Partnership Table**

| Frontend (camelCase) | PostgreSQL (lowercase) | SQLite (camelCase) |
| -------------------- | ---------------------- | ------------------ |
| `userA`              | `usera`                | `userA`            |
| `userB`              | `userb`                | `userB`            |
| `createdAt`          | `createdat`            | `createdAt`        |

### **Better Auth Tables**

| Frontend (camelCase) | PostgreSQL (camelCase) | SQLite (camelCase) |
| -------------------- | ---------------------- | ------------------ |
| `userId`             | `userId`               | `userId`           |
| `emailVerified`      | `emailVerified`        | `emailVerified`    |
| `createdAt`          | `createdAt`            | `createdAt`        |
| `updatedAt`          | `updatedAt`            | `updatedAt`        |
| `expiresAt`          | `expiresAt`            | `expiresAt`        |

## **Implementation Strategy**

### **1. API Transformation Layer**

All API endpoints that return data to the frontend include a transformation step:

```typescript
// PostgreSQL example
const allTasks = (allTasksResult.rows || []).map((task) => ({
  id: task.id,
  userId: task.userid, // userid → userId
  title: task.title,
  isCompleted: task.iscompleted, // iscompleted → isCompleted
  isActive: task.isactive, // isactive → isActive
  sortOrder: task.sort_order, // sort_order → sortOrder
  createdAt: task.createdat, // createdat → createdAt
  completedAt: task.completedat, // completedat → completedAt
  addedToActiveAt: task.addedtoactiveat, // addedtoactiveat → addedToActiveAt
}));
```

### **2. Environment Detection**

The application detects the environment and uses appropriate column names:

```typescript
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  // Use PostgreSQL column names (lowercase)
  await sql`SELECT userid, iscompleted, sort_order FROM task`;
} else {
  // Use SQLite column names (camelCase)
  const result = appDb
    .prepare("SELECT userId, isCompleted, sortOrder FROM task")
    .all();
}
```

### **3. Safe Migration System**

The `/api/migrate-sort-order` endpoint handles both environments safely:

- **PostgreSQL**: Uses `sort_order` column name
- **SQLite**: Uses `sortOrder` column name
- **Idempotent**: Can be run multiple times safely
- **No data loss**: Only adds columns, never deletes

## **Files and Their Purposes**

### **Schema Files**

- `create-tables.sql` - PostgreSQL schema (production)
- `better-auth-schema.sql` - SQLite schema (development)
- `lib/db.ts` - SQLite initialization and migration logic

### **API Endpoints**

- `/api/tasks` - Handles task CRUD with transformation
- `/api/tasks/reorder` - Handles drag-and-drop reordering
- `/api/partner` - Handles partnership management
- `/api/partner/tasks` - Handles partner task viewing
- `/api/migrate-sort-order` - Safe migration endpoint

### **Migration Scripts**

- `scripts/run-migration.sh` - Safe migration runner
- `migrate-sort-order.sql` - Deprecated, points to new endpoint

## **Testing Data Consistency**

### **Check Current Schema**

```bash
curl -s https://better-do-it.vercel.app/api/check-schema | jq
```

### **Run Migration**

```bash
curl -X POST https://better-do-it.vercel.app/api/migrate-sort-order
```

### **Test API Endpoints**

```bash
# Test tasks API
curl -s https://better-do-it.vercel.app/api/tasks | jq '.tasks[0]'

# Test partner API
curl -s https://better-do-it.vercel.app/api/partner | jq

# Test partner tasks API
curl -s https://better-do-it.vercel.app/api/partner/tasks | jq
```

## **Best Practices**

### **When Adding New Columns**

1. **Update both schema files** with appropriate naming
2. **Add transformation logic** in API endpoints
3. **Create migration endpoint** for safe deployment
4. **Test in both environments** before deploying

### **When Writing Queries**

1. **Use environment detection** to choose column names
2. **Always transform data** before returning to frontend
3. **Handle both database types** in each API endpoint
4. **Test with real data** in both environments

### **When Deploying**

1. **Run migration endpoint** first
2. **Verify schema consistency** with check-schema endpoint
3. **Test all API endpoints** in production
4. **Monitor for column name errors** in logs

## **Troubleshooting**

### **Common Issues**

1. **Column not found errors** - Check if using correct column names for environment
2. **Data transformation errors** - Verify mapping between database and frontend names
3. **Migration failures** - Check if column already exists before adding

### **Debugging Commands**

```bash
# Check database connectivity
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Check authentication setup
curl -s https://better-do-it.vercel.app/api/test-auth | jq

# Check schema
curl -s https://better-do-it.vercel.app/api/check-schema | jq
```

## **Future Improvements**

1. **Automated schema validation** - Compare expected vs actual schema
2. **Type-safe transformations** - Use TypeScript to ensure consistency
3. **Database abstraction layer** - Centralize transformation logic
4. **Migration testing** - Automated tests for migration endpoints
