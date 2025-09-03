import { auth } from "@/lib/auth";

export async function GET() {
  try {
    return Response.json({
      success: true,
      environment: process.env.NODE_ENV,
      betterAuthUrl: process.env.BETTER_AUTH_URL,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      authInstanceExists: !!auth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      environment: process.env.NODE_ENV,
      betterAuthUrl: process.env.BETTER_AUTH_URL,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
