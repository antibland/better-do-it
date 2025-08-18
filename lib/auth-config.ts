import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

// Environment detection
const isProduction = process.env.NODE_ENV === "production";

// Create database connection based on environment
const createAuthDatabase = () => {
  if (isProduction) {
    // In production, use PostgreSQL configuration
    return {
      dialect: "postgres",
      type: "postgres",
      url: process.env.POSTGRES_URL,
    };
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

  // Add the nextCookies plugin for Next.js 15 compatibility
  plugins: [nextCookies()],
});

// Type inference from the auth instance
export type Session = typeof auth.$Infer.Session;
