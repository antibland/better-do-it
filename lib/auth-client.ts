import { createAuthClient } from "better-auth/react";

// Create the client-side auth instance
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // Use the same port as the server
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
