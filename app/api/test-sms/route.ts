import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { appDb } from "@/lib/db";
import { sendSMS, formatTaskReminderMessage } from "@/lib/sms";

type TaskRow = {
  title: string;
};

export async function POST(request: NextRequest) {
  try {
    console.log("Test SMS API called");
    console.log("Environment variables:", {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "Set" : "Not set",
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "Set" : "Not set",
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? "Set" : "Not set",
    });

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
    if (cleanedPhoneNumber.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be 10 digits" },
        { status: 400 }
      );
    }

    const incompleteTasks = (await appDb
      .prepare(
        `
        SELECT title
        FROM task
        WHERE userId = ? AND isCompleted = 0
        ORDER BY createdAt ASC
        LIMIT 5
      `
      )
      .all(userId)) as TaskRow[];

    const taskTitles = incompleteTasks.map((task) => task.title);
    const message = formatTaskReminderMessage(taskTitles);

    console.log("About to send SMS to:", cleanedPhoneNumber);
    const smsResult = await sendSMS(cleanedPhoneNumber, message);
    console.log("SMS result:", smsResult);

    if (smsResult.success) {
      return NextResponse.json({
        success: true,
        message: "Test SMS sent successfully",
        tasksCount: taskTitles.length,
      });
    } else {
      console.error("SMS failed:", smsResult.error);
      return NextResponse.json(
        {
          error: "Failed to send SMS",
          details: smsResult.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
