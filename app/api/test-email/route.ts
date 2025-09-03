// import { auth } from "@/lib/auth"; // Unused import removed
import { testEmail } from "@/lib/email";

/**
 * Test email endpoint for development
 * - POST: send a test email to verify email service is working
 */

// Unused function removed - not needed for this endpoint
// async function requireSession(req: Request) {
//   const session = await auth.api.getSession({ headers: req.headers });
//   if (!session || !session.user) {
//     return null;
//   }
//   return null;
// }

export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  let body: { toEmail?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toEmail = typeof body?.toEmail === "string" ? body.toEmail.trim() : "";
  if (!toEmail) {
    return Response.json(
      { error: "Email address is required" },
      { status: 400 }
    );
  }

  try {
    const result = await testEmail(toEmail);

    if (result.success) {
      return Response.json({
        success: true,
        message: "Test email sent successfully",
      });
    } else {
      return Response.json(
        {
          success: false,
          error: result.error || "Failed to send test email",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test email error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
