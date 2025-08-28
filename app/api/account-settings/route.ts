import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { appDb } from "@/lib/db";

type NotificationSettingsRow = {
  phone_number: string;
  frequency: string;
  time: string;
  day_of_week: string;
  enabled: number;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const settings = (await appDb
      .prepare(
        `
        SELECT phone_number, frequency, time, day_of_week, enabled
        FROM user_notification_settings
        WHERE user_id = ?
      `
      )
      .get(userId)) as NotificationSettingsRow | undefined;

    if (!settings) {
      return NextResponse.json({
        settings: {
          phoneNumber: "",
          frequency: "every-other-day",
          time: "09:00",
          dayOfWeek: "monday",
          enabled: false,
        },
      });
    }

    return NextResponse.json({
      settings: {
        phoneNumber: settings.phone_number || "",
        frequency: settings.frequency || "every-other-day",
        time: settings.time || "09:00",
        dayOfWeek: settings.day_of_week || "monday",
        enabled: settings.enabled === 1,
      },
    });
  } catch (error) {
    console.error("Error loading account settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { phoneNumber, frequency, time, dayOfWeek, enabled } = body;

    if (enabled && !phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required when reminders are enabled" },
        { status: 400 }
      );
    }

    if (enabled && frequency === "weekly" && !dayOfWeek) {
      return NextResponse.json(
        { error: "Day of week is required for weekly reminders" },
        { status: 400 }
      );
    }

    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
    if (enabled && cleanedPhoneNumber.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be 10 digits" },
        { status: 400 }
      );
    }

    await appDb
      .prepare(
        `
      INSERT OR REPLACE INTO user_notification_settings 
      (user_id, phone_number, frequency, time, day_of_week, enabled, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `
      )
      .run(
        userId,
        cleanedPhoneNumber,
        frequency,
        time,
        dayOfWeek,
        enabled ? 1 : 0
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving account settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
