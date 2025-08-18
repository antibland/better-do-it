import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Test if we can access the auth instance
    const authInstance = auth;
    
    return Response.json({
      success: true,
      message: 'Auth instance created successfully',
      hasAuth: !!authInstance,
      environment: process.env.NODE_ENV,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      hasUrl: !!process.env.BETTER_AUTH_URL,
    });
  } catch (error) {
    console.error('Auth test error:', error);
    
    return Response.json({
      success: false,
      message: 'Auth instance creation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      hasSecret: !!process.env.BETTER_AUTH_SECRET,
      hasUrl: !!process.env.BETTER_AUTH_URL,
    }, { status: 500 });
  }
}
