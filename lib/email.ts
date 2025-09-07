import { Resend } from "resend";
import { InviteExistingUserEmail } from "@/app/components/emails/InviteExistingUser";
import { InviteNewUserEmail } from "@/app/components/emails/InviteNewUser";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Get the appropriate app URL based on environment
function getAppUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return process.env.PRODUCTION_APP_URL || "https://better-do-it.com";
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// Generate a random invite code
export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Send invitation email to existing user
export async function sendInviteToExistingUser(
  inviterName: string,
  inviteeEmail: string,
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  // In development, skip email sending unless it's to the verified email
  if (process.env.NODE_ENV !== "production") {
    const verifiedEmail =
      process.env.RESEND_VERIFIED_EMAIL || "antibland@gmail.com";

    if (inviteeEmail !== verifiedEmail) {
      console.log(
        `[DEV] Skipping email to ${inviteeEmail} - would send invite code: ${inviteCode}`
      );
      console.log(
        `[DEV] In production, this would send an email to ${inviteeEmail}`
      );
      return { success: true };
    }
  }

  try {
    const appUrl = getAppUrl();

    // Send the email using React component directly
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@better-do-it.com",
      to: [inviteeEmail],
      subject: `${inviterName} wants to partner with you on Better Do It!`,
      react: InviteExistingUserEmail({
        inviterName,
        inviteeEmail,
        inviteCode,
        appUrl,
      }),
    });

    if (error) {
      console.error("Resend email error:", error);
      return { success: false, error: error.message };
    }

    console.log("Invitation email sent successfully:", data);
    return { success: true };
  } catch (error) {
    console.error("Email service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send invitation email to new user
export async function sendInviteToNewUser(
  inviterName: string,
  inviteeEmail: string,
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  // In development, skip email sending unless it's to the verified email
  if (process.env.NODE_ENV !== "production") {
    const verifiedEmail =
      process.env.RESEND_VERIFIED_EMAIL || "antibland@gmail.com";

    if (inviteeEmail !== verifiedEmail) {
      console.log(
        `[DEV] Skipping email to ${inviteeEmail} - would send invite code: ${inviteCode}`
      );
      console.log(
        `[DEV] In production, this would send an email to ${inviteeEmail}`
      );
      return { success: true };
    }
  }

  try {
    const appUrl = getAppUrl();

    // Send the email using React component directly
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@better-do-it.com",
      to: [inviteeEmail],
      subject: `Join Better Do It and partner with ${inviterName}!`,
      react: InviteNewUserEmail({
        inviterName,
        inviteeEmail,
        inviteCode,
        appUrl,
      }),
    });

    if (error) {
      console.error("Resend email error:", error);
      return { success: false, error: error.message };
    }

    console.log("New user invitation email sent successfully:", data);
    return { success: true };
  } catch (error) {
    console.error("Email service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Test email functionality (for development)
export async function testEmail(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@better-do-it.com",
      to: [toEmail],
      subject: "Test Email from Better Do It",
      html: "<h1>Test Email</h1><p>This is a test email to verify the email service is working.</p>",
    });

    if (error) {
      console.error("Resend test email error:", error);
      return { success: false, error: error.message };
    }

    console.log("Test email sent successfully:", data);
    return { success: true };
  } catch (error) {
    console.error("Test email service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
