import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS(to: string, message: string) {
  try {
    console.log("SMS utility - Environment check:", {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? "Set" : "Not set",
      authToken: process.env.TWILIO_AUTH_TOKEN ? "Set" : "Not set",
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || "Not set",
    });

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: `+1${to}`,
    });

    console.log(`SMS sent successfully to ${to}:`, result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
    return { success: false, error };
  }
}

export function formatTaskReminderMessage(tasks: string[]) {
  const taskList =
    tasks.length > 0
      ? tasks.map((task) => `• ${task}`).join("\n")
      : "• No incomplete tasks found";

  return `Here's a reminder to finish those incomplete tasks. You can't be annoyed because you set this reminder up!

${taskList}

Better Do It`;
}
