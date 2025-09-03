import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";
import { Pool } from "pg";

// Environment detection
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  // Database configuration
  database: isProduction
    ? new Pool({
        connectionString: process.env.POSTGRES_URL!,
      })
    : new Database("./sqlite.db"),

  // Base URL for the authentication API
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (isProduction ? "https://better-do-it.com" : "http://localhost:3000"),

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
      enabled: true, // Enable cross-domain cookies
    },
    // Production cookie settings - iOS Safari compatible
    ...(isProduction && {
      cookieSecure: true,
      cookieSameSite: "lax",
      // iOS Safari fix: Ensure cookies work properly
      cookieHttpOnly: false, // Allow JavaScript access
    }),
  },

  // Add the nextCookies plugin for Next.js 15 compatibility
  plugins: [nextCookies()],
});

// Type inference from the auth instance
export type Session = typeof auth.$Infer.Session;
