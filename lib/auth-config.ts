import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

// Environment detection
const isProduction = process.env.NODE_ENV === "production";

// Create database connection based on environment
const createAuthDatabase = () => {
  if (isProduction) {
    // In production, we need to handle the fact that Vercel has a read-only filesystem
    // For now, we'll use a temporary approach - in a real production app,
    // you'd want to use a proper PostgreSQL adapter for better-auth
    try {
      // Try to create a database in /tmp which is writable on Vercel
      return new Database("/tmp/auth.db");
    } catch (error) {
      console.error("Failed to create auth database:", error);
      // For now, let's use a basic in-memory database that doesn't persist
      // This is not ideal for production but will allow the app to work
      return new Database(":memory:");
    }
  } else {
    // Development uses SQLite
    return new Database("./sqlite.db");
  }
};

export const auth = betterAuth({
  // Database configuration
  database: createAuthDatabase(),

  // Base URL for the authentication API
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (isProduction
      ? "https://better-do-it.vercel.app"
      : "http://localhost:3000"),

  // Secret key for encryption and token signing
  secret: process.env.BETTER_AUTH_SECRET!,

  // Enable email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },

  // Configure user and session settings
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // Advanced configuration
  advanced: {
    cookiePrefix: "better-do-it",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

// Type inference from the auth instance
export type Session = typeof auth.$Infer.Session;
