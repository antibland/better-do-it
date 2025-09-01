# Database Architecture

## Overview

Better Do It uses a **dual database architecture** that supports both development (SQLite) and production (PostgreSQL) environments. The application automatically switches between databases based on the `NODE_ENV` environment variable.

## Database Setup

### Environment Detection

- **Development**: Uses SQLite (`better-sqlite3`) with local file `./sqlite.db`
- **Production**: Uses PostgreSQL (`@vercel/postgres`) via Vercel's managed database

### Configuration Files

- `lib/db-config.ts` - Database connection and wrapper classes
- `lib/db.ts` - Schema initialization and type definitions
- `lib/auth-config.ts` - Authentication database configuration

## Database Schema

### Authentication Tables (Better Auth)

The application uses [Better Auth](https://better-auth.com/) for authentication, which creates its own tables:

#### `user` Table

```sql
CREATE TABLE "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "image" TEXT,
    "role" TEXT DEFAULT 'user',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### `session` Table

```sql
CREATE TABLE "session" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
```

#### `account` Table

```sql
CREATE TABLE "account" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP WITH TIME ZONE,
    "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE,
    "scope" TEXT,
    "id_token" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
```

#### `verification` Table

```sql
CREATE TABLE "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Application Tables

#### `task` Table

The core task management table with dual naming conventions:

**PostgreSQL (snake_case):**

```sql
CREATE TABLE "task" (
    "id" TEXT PRIMARY KEY,
    "userid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iscompleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "isactive" BOOLEAN NOT NULL DEFAULT FALSE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "completedat" TIMESTAMP WITH TIME ZONE,
    "addedtoactiveat" TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY ("userid") REFERENCES "user"("id") ON DELETE CASCADE
);
```

**SQLite (camelCase):**

```sql
CREATE TABLE task (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    isCompleted INTEGER NOT NULL DEFAULT 0,
    isActive INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt TEXT,
    addedToActiveAt TEXT,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

#### `partnership` Table

**PostgreSQL (snake_case):**

```sql
CREATE TABLE "partnership" (
    "id" TEXT PRIMARY KEY,
    "usera" TEXT NOT NULL,
    "userb" TEXT NOT NULL,
    "createdat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("usera") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userb") REFERENCES "user"("id") ON DELETE CASCADE
);
```

**SQLite (camelCase):**

```sql
CREATE TABLE partnership (
    id TEXT PRIMARY KEY,
    userA TEXT NOT NULL,
    userB TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userA) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (userB) REFERENCES user(id) ON DELETE CASCADE
);
```

## Data Transformation Layer

To handle the different column naming conventions between PostgreSQL (snake_case) and SQLite (camelCase), the application uses a **transformation layer** in API endpoints.

### Example Transformation

```typescript
// PostgreSQL response transformation
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

## Key Design Decisions

### 1. Dual Database Support

- **Development**: SQLite for simplicity and local development
- **Production**: PostgreSQL for scalability and reliability
- **Automatic switching** based on `NODE_ENV`

### 2. Column Naming Conventions

- **PostgreSQL**: Uses snake_case (database convention)
- **SQLite**: Uses camelCase (JavaScript convention)
- **Frontend**: Always receives camelCase (consistent API)

### 3. Migration Strategy

- **Safe migration endpoints** handle both environments
- **Idempotent operations** can be run multiple times safely
- **Data transformation** ensures consistent frontend experience

### 4. Authentication Integration

- **Better Auth** handles all authentication tables
- **Automatic table creation** via Better Auth CLI
- **Session management** integrated with application tables

## Performance Considerations

### Indexes

```sql
-- PostgreSQL indexes
CREATE INDEX "idx_task_userid" ON "task"("userid");
CREATE INDEX "idx_task_isactive" ON "task"("isactive");
CREATE INDEX "idx_task_sort_order" ON "task"("sort_order");

-- SQLite indexes
CREATE INDEX idx_task_userId ON task(userId);
CREATE INDEX idx_task_isActive ON task(isActive);
CREATE INDEX idx_task_sortOrder ON task(sortOrder);
```

### Query Optimization

- **Environment-specific queries** for optimal performance
- **Proper indexing** on frequently queried columns
- **Connection pooling** in production (PostgreSQL)

## Security Considerations

- **Foreign key constraints** ensure data integrity
- **Cascade deletes** clean up related data
- **Input validation** at API level
- **Environment variable protection** for database credentials

---

**Reference: See `data-consistency.md` for detailed column mapping and transformation patterns.**
