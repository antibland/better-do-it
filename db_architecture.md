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
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" INTEGER NOT NULL DEFAULT 0 CHECK ("is_completed" IN (0,1)),
    "is_active" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMP WITH TIME ZONE NULL,
    "added_to_active_at" TIMESTAMP WITH TIME ZONE NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
```

**SQLite (camelCase):**

```sql
CREATE TABLE task (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    isCompleted INTEGER NOT NULL DEFAULT 0 CHECK (isCompleted IN (0,1)),
    isActive INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt TEXT NULL,
    addedToActiveAt TEXT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

**Key Fields:**

- `id` - Unique task identifier (UUID)
- `user_id` / `userId` - Foreign key to user table
- `title` - Task description
- `is_completed` / `isCompleted` - Boolean flag (0/1) for completion status
- `is_active` / `isActive` - Boolean flag (0/1) for active status
- `created_at` / `createdAt` - Task creation timestamp
- `completed_at` / `completedAt` - Task completion timestamp (null if not completed)
- `added_to_active_at` / `addedToActiveAt` - When task was moved to active list

#### `partnership` Table

Manages user partnerships for collaborative task viewing:

**PostgreSQL (snake_case):**

```sql
CREATE TABLE "partnership" (
    "id" TEXT PRIMARY KEY,
    "user_a" TEXT NOT NULL UNIQUE,
    "user_b" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK ("user_a" <> "user_b"),
    FOREIGN KEY ("user_a") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("user_b") REFERENCES "user"("id") ON DELETE CASCADE
);
```

**SQLite (camelCase):**

```sql
CREATE TABLE partnership (
    id TEXT PRIMARY KEY,
    userA TEXT NOT NULL UNIQUE,
    userB TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (userA <> userB),
    FOREIGN KEY (userA) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (userB) REFERENCES user(id) ON DELETE CASCADE
);
```

## Indexes

### Authentication Indexes

- `idx_session_user_id` - Session lookups by user
- `idx_session_token` - Session validation
- `idx_account_user_id` - Account lookups by user
- `idx_account_provider_id` - OAuth provider lookups
- `idx_verification_identifier` - Email verification lookups

### Application Indexes

- `idx_task_user_is_completed` - Filter tasks by user and completion status
- `idx_task_completed_at` - Sort completed tasks by date
- `idx_task_user_is_active` - Filter tasks by user and active status
- `idx_task_added_to_active_at` - Sort active tasks by activation date
- `idx_partnership_user_a` - Partnership lookups by first user
- `idx_partnership_user_b` - Partnership lookups by second user

## Data Flow

### Task Lifecycle

1. **Creation**: Task created with `isActive = 0` (master list)
2. **Activation**: User moves task to active list (`isActive = 1`, `addedToActiveAt` set)
3. **Completion**: User marks task complete (`isCompleted = 1`, `completedAt` set)
4. **Archiving**: Task remains in database but filtered from active view

### Partnership Flow

1. **Request**: User A requests partnership with User B
2. **Creation**: Partnership record created linking both users
3. **Viewing**: Partners can see each other's active tasks
4. **Termination**: Partnership can be dissolved (record deleted)

## Week Boundary Logic

The application uses a custom week boundary system defined in `lib/week.ts`:

- **Week Start**: Wednesday 6:00 PM Eastern Time
- **Purpose**: Calculate "completed this week" statistics
- **Implementation**: Converts ET boundaries to UTC for database storage
- **Key Functions**:
  - `getCurrentWeekStartEt()` - Current week boundary
  - `getPreviousWeekStartEt()` - Previous week boundary
  - `getNextWeekStartEt()` - Next week boundary

## Database Operations

### Connection Management

- **SQLite**: Direct file-based connection with WAL mode
- **PostgreSQL**: Connection pool managed by Vercel
- **Authentication**: Separate connection for auth tables

### Query Patterns

- **User-scoped**: All queries filter by `user_id` for security
- **Status filtering**: Use `isCompleted` and `isActive` flags
- **Time-based**: Use `completedAt` for week calculations
- **Partnership**: Join with partnership table for collaborative features

### Data Transformation

The application handles naming convention differences:

- **Frontend**: Uses camelCase (`userId`, `isCompleted`)
- **PostgreSQL**: Uses snake_case (`user_id`, `is_completed`)
- **SQLite**: Uses camelCase (`userId`, `isCompleted`)

## Security Considerations

### Row-Level Security

- All queries filter by authenticated user ID
- No cross-user data access without explicit partnership
- Foreign key constraints prevent orphaned records

### Data Validation

- Check constraints on boolean fields (0/1 only)
- Unique constraints on email and partnership pairs
- Cascade deletes maintain referential integrity

### Authentication

- Session-based authentication with secure cookies
- Token expiration and rotation
- Email verification support (configurable)

## Migration Strategy

### Schema Evolution

- **Idempotent**: All schema changes use `CREATE TABLE IF NOT EXISTS`
- **Backward Compatible**: New columns added with defaults
- **Safe**: No destructive operations in production

### Data Migration

- **Automatic**: Schema initialization runs on app startup
- **Incremental**: New columns added without affecting existing data
- **Rollback**: Can revert to previous schema if needed

## Performance Considerations

### Indexing Strategy

- Composite indexes for common query patterns
- Single-column indexes for sorting operations
- Foreign key indexes for join performance

### Query Optimization

- Prepared statements for repeated queries
- Connection pooling in production
- Efficient filtering by user and status

### Storage

- **SQLite**: Local file with WAL mode for concurrent access
- **PostgreSQL**: Managed database with automatic backups
- **Text fields**: Used for flexibility and readability

## Environment Variables

### Required

- `NODE_ENV` - Determines database type ("production" = PostgreSQL)
- `POSTGRES_URL` - PostgreSQL connection string (production)
- `BETTER_AUTH_SECRET` - Authentication secret key

### Optional

- `BETTER_AUTH_URL` - Custom auth base URL
- `POSTGRES_URL_NON_POOLING` - Non-pooling PostgreSQL connection

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check environment variables and network access
2. **Schema Mismatches**: Verify schema initialization ran successfully
3. **Performance Issues**: Check index usage and query patterns
4. **Data Inconsistencies**: Validate foreign key constraints

### Debugging Tools

- `create-tables.sql` - Manual schema creation
- API endpoints for database testing (`/api/test-db`)
- Console logging for schema initialization
- Database inspection tools (SQLite browser, pgAdmin)

## Future Considerations

### Scalability

- Consider read replicas for high-traffic scenarios
- Implement caching for frequently accessed data
- Monitor query performance as user base grows

### Features

- Task categories and tags
- Recurring tasks
- Task dependencies
- Advanced analytics and reporting

### Maintenance

- Regular database backups
- Index maintenance and optimization
- Schema versioning for complex migrations
