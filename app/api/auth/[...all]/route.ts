import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Create the Next.js handler for all auth routes
const handler = toNextJsHandler(auth);

// Export the handlers explicitly for Next.js App Router
export const POST = handler.POST;
export const GET = handler.GET;
