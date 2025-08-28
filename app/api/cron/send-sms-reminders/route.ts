import { NextRequest, NextResponse } from "next/server";
import { appDb } from "@/lib/db";
import { sendSMS, formatTaskReminderMessage } from "@/lib/sms";

type NotificationSettingsRow = {
  user_id: string;
  phone_number: string;
  frequency: string;
  time: string;
  day_of_week: string;
  user_name: string;
};

type TaskRow = {
  title: string;
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();

    const settings = (await appDb
      .prepare(
        `
        SELECT 
          uns.user_id,
          uns.phone_number,
          uns.frequency,
          uns.time,
          uns.day_of_week,
          u.name as user_name
        FROM user_notification_settings uns
        JOIN user u ON uns.user_id = u.id
        WHERE uns.enabled = 1
          AND uns.phone_number IS NOT NULL
          AND (
            (uns.frequency = 'every-other-day' AND uns.time = ?)
            OR (uns.frequency = 'weekly' AND uns.time = ? AND uns.day_of_week = ?)
          )
      `
      )
      .all(currentTime, currentTime, currentDay)) as NotificationSettingsRow[];

    const results = [];

    for (const setting of settings) {
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
        .all(setting.user_id)) as TaskRow[];

      const taskTitles = incompleteTasks.map((task) => task.title);
      const message = formatTaskReminderMessage(taskTitles);

      const smsResult = await sendSMS(setting.phone_number, message);

      results.push({
        userId: setting.user_id,
        phoneNumber: setting.phone_number,
        tasksCount: taskTitles.length,
        smsResult,
      });
    }

    return NextResponse.json({
      success: true,
      sent: results.length,
      results,
    });
  } catch (error) {
    console.error("Error sending SMS reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
