"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Phone, Clock, Calendar } from "lucide-react";
import { twMerge } from "tailwind-merge";

type NotificationSettings = {
  phoneNumber: string;
  frequency: "every-other-day" | "weekly";
  time: string;
  dayOfWeek?: string;
  enabled: boolean;
};

export default function AccountSettings() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settings, setSettings] = useState<NotificationSettings>({
    phoneNumber: "",
    frequency: "every-other-day",
    time: "09:00",
    dayOfWeek: "monday",
    enabled: false,
  });

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/auth");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      loadSettings();
    }
  }, [session]);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/account-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch {
      setError("Failed to load settings");
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/account-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess("Settings saved successfully!");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save settings");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.length >= 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(
        3,
        6
      )}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 3) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }

    setSettings((prev) => ({ ...prev, phoneNumber: formatted }));
  };

  const testSMS = async () => {
    if (!settings.phoneNumber) {
      setError("Please enter a phone number first");
      return;
    }

    setTestingSMS(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: settings.phoneNumber,
          frequency: settings.frequency,
          time: settings.time,
          dayOfWeek: settings.dayOfWeek,
        }),
      });

      if (response.ok) {
        setSuccess("Test SMS sent successfully! Check your phone.");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send test SMS");
      }
    } catch {
      setError("Failed to send test SMS");
    } finally {
      setTestingSMS(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Account Settings
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            SMS Task Reminders
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <form onSubmit={saveSettings} className="space-y-6">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enabled"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="enabled"
                className="text-sm font-medium text-gray-700"
              >
                Enable SMS reminders for incomplete tasks
              </label>
            </div>

            {settings.enabled && (
              <>
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={settings.phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label
                    htmlFor="frequency"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Reminder Frequency
                  </label>
                  <select
                    id="frequency"
                    value={settings.frequency}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        frequency: e.target.value as
                          | "every-other-day"
                          | "weekly",
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="every-other-day">Every other day</option>
                    <option value="weekly">Once a week</option>
                  </select>
                </div>

                {settings.frequency === "weekly" && (
                  <div>
                    <label
                      htmlFor="dayOfWeek"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Day of Week
                    </label>
                    <select
                      id="dayOfWeek"
                      value={settings.dayOfWeek}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dayOfWeek: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="time"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={settings.time}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={testSMS}
                disabled={testingSMS || !settings.phoneNumber}
                className={twMerge(
                  "px-6 py-2 rounded-md text-sm font-medium flex items-center space-x-2",
                  testingSMS || !settings.phoneNumber
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                <span>{testingSMS ? "Sending..." : "Test SMS"}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || (settings.enabled && !settings.phoneNumber)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
