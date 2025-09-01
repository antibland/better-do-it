-- Better Auth Database Schema for SQLite (camelCase column names)

-- User table
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "role" TEXT DEFAULT 'user',
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Session table
CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Account table
CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TEXT,
    "refreshTokenExpiresAt" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Verification table
CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Task table (for the app functionality)
CREATE TABLE IF NOT EXISTS "task" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" INTEGER NOT NULL DEFAULT 0 CHECK ("isCompleted" IN (0,1)),
    "isActive" INTEGER DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "completedAt" TEXT NULL,
    "addedToActiveAt" TEXT NULL,
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Partnership table (for the app functionality)
CREATE TABLE IF NOT EXISTS "partnership" (
    "id" TEXT PRIMARY KEY,
    "userA" TEXT NOT NULL UNIQUE,
    "userB" TEXT NOT NULL UNIQUE,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ("userA" <> "userB"),
    FOREIGN KEY ("userA") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userB") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create indexes for better-auth tables
CREATE INDEX IF NOT EXISTS "idx_session_userId" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_account_userId" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_providerId" ON "account"("providerId");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");

-- Create indexes for app tables
CREATE INDEX IF NOT EXISTS "idx_task_userId_isCompleted" ON "task"("userId", "isCompleted");
CREATE INDEX IF NOT EXISTS "idx_task_completedAt" ON "task"("completedAt");
CREATE INDEX IF NOT EXISTS "idx_task_userId_isActive" ON "task"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "idx_task_addedToActiveAt" ON "task"("addedToActiveAt");
CREATE INDEX IF NOT EXISTS "idx_task_userId_sortOrder" ON "task"("userId", "sortOrder");
CREATE INDEX IF NOT EXISTS "idx_partnership_userA" ON "partnership"("userA");
CREATE INDEX IF NOT EXISTS "idx_partnership_userB" ON "partnership"("userB");
