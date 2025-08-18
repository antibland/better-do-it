-- Better Auth Database Schema
-- Based on the documentation, these are the required tables with snake_case column names

-- User table
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "image" TEXT,
    "role" TEXT DEFAULT 'user',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Session table
CREATE TABLE IF NOT EXISTS "session" (
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

-- Account table
CREATE TABLE IF NOT EXISTS "account" (
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

-- Verification table
CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Task table (for the app functionality) - using snake_case to match Better Auth convention
CREATE TABLE IF NOT EXISTS "task" (
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

-- Partnership table (for the app functionality) - using snake_case to match Better Auth convention
CREATE TABLE IF NOT EXISTS "partnership" (
    "id" TEXT PRIMARY KEY,
    "user_a" TEXT NOT NULL UNIQUE,
    "user_b" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK ("user_a" <> "user_b"),
    FOREIGN KEY ("user_a") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("user_b") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create indexes for better-auth tables
CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session"("user_id");
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account"("user_id");
CREATE INDEX IF NOT EXISTS "idx_account_provider_id" ON "account"("provider_id");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");

-- Create indexes for app tables
CREATE INDEX IF NOT EXISTS "idx_task_user_is_completed" ON "task"("user_id", "is_completed");
CREATE INDEX IF NOT EXISTS "idx_task_completed_at" ON "task"("completed_at");
CREATE INDEX IF NOT EXISTS "idx_task_user_is_active" ON "task"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_task_added_to_active_at" ON "task"("added_to_active_at");
CREATE INDEX IF NOT EXISTS "idx_partnership_user_a" ON "partnership"("user_a");
CREATE INDEX IF NOT EXISTS "idx_partnership_user_b" ON "partnership"("user_b");
