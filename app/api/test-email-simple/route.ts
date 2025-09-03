export async function GET() {
  return Response.json({
    success: true,
    message: "Email service test endpoint",
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      hasFromEmail: !!process.env.FROM_EMAIL,
      hasFromName: !!process.env.FROM_NAME,
      resendApiKeyLength: process.env.RESEND_API_KEY?.length || 0,
      fromEmail: process.env.FROM_EMAIL,
      fromName: process.env.FROM_NAME,
    },
  });
}
