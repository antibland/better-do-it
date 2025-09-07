-- PostgreSQL schema for Better Do It
-- This file creates all necessary tables for the application
-- Uses lowercase column names to match actual PostgreSQL behavior

-- Better Auth tables (required for authentication)
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "expiresAt" INTEGER,
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "sessionState" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "verification" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("identifier", "token")
);

-- Application-specific tables
CREATE TABLE IF NOT EXISTS "task" (
    "id" TEXT PRIMARY KEY,
    "userid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iscompleted" INTEGER NOT NULL DEFAULT 0 CHECK ("iscompleted" IN (0,1)),
    "isactive" INTEGER DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "completedat" TIMESTAMP WITH TIME ZONE,
    "addedtoactiveat" TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY ("userid") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "partnership" (
    "id" TEXT PRIMARY KEY,
    "usera" TEXT NOT NULL,
    "userb" TEXT NOT NULL,
    "createdat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("usera") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userb") REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("usera", "userb")
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("email");
CREATE INDEX IF NOT EXISTS "idx_session_userId" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_session_expiresAt" ON "session"("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_account_userId" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_provider" ON "account"("provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");
CREATE INDEX IF NOT EXISTS "idx_verification_token" ON "verification"("token");
CREATE INDEX IF NOT EXISTS "idx_task_userid" ON "task"("userid");
CREATE INDEX IF NOT EXISTS "idx_task_iscompleted" ON "task"("iscompleted");
CREATE INDEX IF NOT EXISTS "idx_task_isactive" ON "task"("isactive");
CREATE INDEX IF NOT EXISTS "idx_task_user_sort_order" ON "task"("userid", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_partnership_usera" ON "partnership"("usera");
CREATE INDEX IF NOT EXISTS "idx_partnership_userb" ON "partnership"("userb");
