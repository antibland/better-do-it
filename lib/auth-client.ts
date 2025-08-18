import { createAuthClient } from "better-auth/react";

// Create the client-side auth instance
export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? window.location.origin
      : "http://localhost:3000"), // Use environment variable or fallback
  fetchOptions: {
    onError: async (context) => {
      // Log error details without consuming the response body
      console.error("Auth client error:", {
        status: context.response.status,
        statusText: context.response.statusText,
        url: context.response.url,
        headers: Object.fromEntries(context.response.headers.entries()),
      });
    },
    onSuccess: async (context) => {
      // Log success details without consuming the response body
      console.log("Auth client success:", {
        status: context.response.status,
        url: context.response.url,
        headers: Object.fromEntries(context.response.headers.entries()),
      });
    },
  },
});

// Export commonly used auth methods for convenience
export const { signIn, signUp, signOut, useSession, getSession } = authClient;
