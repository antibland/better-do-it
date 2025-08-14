import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

export const auth = betterAuth({
  // Database configuration using SQLite
  database: new Database("./sqlite.db"),

  // Base URL for the authentication API
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

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
export type User = typeof auth.$Infer.Session.user;
