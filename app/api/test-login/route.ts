import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    console.log("Test login attempt:", { email, environment: process.env.NODE_ENV });

    // Test the sign-in process directly
    const result = await auth.api.signInEmail({
      body: {
        email: email || "test@example.com",
        password: password || "password123",
      },
    });

    console.log("Sign-in result:", result);

    return Response.json({
      success: true,
      message: "Sign-in test successful",
      result,
      environment: process.env.NODE_ENV,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      hasUrl: !!process.env.BETTER_AUTH_URL,
      hasPublicUrl: !!process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    });
  } catch (error) {
    console.error("Sign-in test error:", error);

    return Response.json({
      success: false,
      message: "Sign-in test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      hasUrl: !!process.env.BETTER_AUTH_URL,
      hasPublicUrl: !!process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    }, { status: 500 });
  }
}
