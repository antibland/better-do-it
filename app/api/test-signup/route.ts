import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    // Test the sign-up process directly
    const result = await auth.api.signUpEmail({
      body: {
        email: email || "test@example.com",
        password: password || "password123",
        name: name || "Test User",
      },
    });

    return Response.json({
      success: true,
      message: "Sign-up test successful",
      result,
    });
  } catch (error) {
    console.error("Sign-up test error:", error);
    
    return Response.json({
      success: false,
      message: "Sign-up test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      hasUrl: !!process.env.BETTER_AUTH_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
    }, { status: 500 });
  }
}
