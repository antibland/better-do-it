import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb } from "@/lib/db";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

async function requireSession(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user) {
    return null;
  }
  return session;
}

function getUserIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  let ip: string | null = null;
  if (forwarded) {
    ip = forwarded.split(",")[0].trim();
  } else if (cfConnectingIp) {
    ip = cfConnectingIp;
  } else if (realIp) {
    ip = realIp;
  }

  if (ip) {
    if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
      return "auto";
    }
    return ip;
  }

  return "auto";
}

async function geocodeLocation(location: string): Promise<{
  latitude: number;
  longitude: number;
  name: string;
} | null> {
  try {
    const coordMatch = location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (coordMatch) {
      return {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2]),
        name: location,
      };
    }

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const name =
      result.name +
      (result.admin1 ? `, ${result.admin1}` : "") +
      (result.country ? `, ${result.country}` : "");
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name,
    };
  } catch (error) {
    return null;
  }
}

function getWeatherConditionFromCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

async function getCurrentWeather(location: string): Promise<{
  tempF: number;
  condition: string;
  precipMm: number;
  isSnow: boolean;
} | null> {
  try {
    let geocoded = await geocodeLocation(location);

    if (
      !geocoded &&
      (location === "auto" || location === "::1" || location === "127.0.0.1")
    ) {
      const defaultLocation =
        process.env.WEATHER_DEFAULT_LOCATION || "Hamden,CT";
      geocoded = await geocodeLocation(defaultLocation);
    }

    if (!geocoded) {
      return null;
    }

    const { latitude: lat, longitude: lon } = geocoded;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation,rain,snowfall&temperature_unit=fahrenheit&precipitation_unit=mm&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const current = data.current;

    if (!current) {
      return null;
    }

    const weatherCode = current.weather_code || 0;
    const condition = getWeatherConditionFromCode(weatherCode);
    const isSnow = weatherCode >= 71 && weatherCode <= 86;

    return {
      tempF: current.temperature_2m || 0,
      condition,
      precipMm: (current.precipitation || 0) + (current.rain || 0),
      isSnow,
    };
  } catch (error) {
    return null;
  }
}

function categorizeWeather(
  tempF: number,
  precipMm: number,
  isSnow: boolean
): "hot" | "rain" | "cold" | "moderate" | null {
  if (isSnow || tempF < 40) {
    return "cold";
  }
  if (precipMm > 0) {
    return "rain";
  }
  if (tempF > 80) {
    return "hot";
  }
  if (tempF >= 40 && tempF <= 80) {
    return "moderate";
  }
  return null;
}

async function getUserTasks(
  userId: string
): Promise<Array<{ id: string; title: string; isActive: number }>> {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const result = await sql`
      SELECT id, title, isactive
      FROM task
      WHERE userid = ${userId} AND iscompleted = 0
      ORDER BY isactive DESC, createdat DESC
    `;
    return (result.rows || []).map((task) => ({
      id: task.id as string,
      title: task.title as string,
      isActive: task.isactive as number,
    }));
  } else {
    const tasks = appDb
      .prepare(
        `SELECT id, title, isActive FROM task WHERE userId = ? AND isCompleted = 0 ORDER BY isActive DESC, createdAt DESC`
      )
      .all(userId) as Array<{ id: string; title: string; isActive: number }>;
    return tasks;
  }
}

async function suggestNewTasksWithAI(
  weatherType: "hot" | "rain" | "cold" | "moderate",
  weatherDescription: string,
  firstName: string
): Promise<{
  message: string;
  suggestedTasks: Array<{ title: string; cleanedTitle: string }>;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const prompt = `You are a no-nonsense task motivator with a "tough love" attitude. Your tone is direct, aggressive, and commanding - like a drill sergeant who actually cares. No corporate speak, no fluff, no sugar-coating.

User's name: ${firstName}
Current weather: ${weatherDescription}
Weather type: ${weatherType}

The user has NO tasks yet. They're starting fresh. Suggest 1-2 practical tasks that:
1. Make sense for ${weatherType} weather
2. Take under an hour to complete
3. Are things most people put off doing
4. Are specific and actionable

Your job:
1. Suggest 1-2 practical tasks that fit the weather conditions
2. Write task titles that are clear and actionable (e.g., "Clean out the junk drawer", "Organize the medicine cabinet", "Wash the windows")
3. Clean up task titles to work naturally in a sentence (e.g., "Clean out the junk drawer" becomes "clean out the junk drawer")
4. Write a direct, aggressive message that tells the user what to do - not suggests. Use imperative mood. Be tough but not mean.
5. ${firstName ? `ALWAYS start your message with the user's first name followed by a comma, like "${firstName}, it's freezing out there..."` : "Start your message directly without a name."}

Tone guidelines:
- Use direct commands: "Do this", "Get this done", "Time to tackle"
- No soft language like "you could", "maybe", "consider", "how about"
- Be urgent and action-oriented
- Match the weather context but stay aggressive
- Short sentences. Punchy. No fluff.
- When listing multiple tasks, ALWAYS use "or" not "and" - give them a choice, not a burden

For ${weatherType} weather:
- Hot: Indoor tasks like organizing, cleaning, or early morning outdoor work. Don't let the heat be an excuse.
- Rain: Indoor tasks. Perfect excuse to stay inside and get shit done. Think organizing, cleaning, decluttering.
- Cold/Snow: Indoor tasks. Too cold outside? Good. Stay in and work. Think organizing, cleaning, maintenance.
- Moderate: No excuses. Get outside or stay in - just pick something and do it.

Return your response as JSON with this exact structure:
{
  "message": "A direct, aggressive message like '${firstName ? `${firstName}, ` : ""}it's freezing out there. Stop making excuses and get inside. Time to {task1} or {task2}. Pick one and do it.'",
  "suggestedTasks": [
    {"title": "Clean out the junk drawer", "cleanedTitle": "clean out the junk drawer"},
    {"title": "Organize the medicine cabinet", "cleanedTitle": "organize the medicine cabinet"}
  ]
}

CRITICAL RULES:
1. When listing multiple tasks in the message, ALWAYS use "or" to connect them, never "and". Example: "Clean out the junk drawer or organize the medicine cabinet" NOT "Clean out the junk drawer and organize the medicine cabinet". Give them a choice, not a burden.
2. Tasks MUST take under an hour to complete.
3. Tasks should be practical things people put off doing.
4. If you mention a task in the message, it MUST be in the suggestedTasks array.

IMPORTANT: Be aggressive and direct. This is "Better Do It" - a command, not a suggestion.`;

  try {
    const result = await generateText({
      model: openai("o3-mini"),
      prompt,
      temperature: 0.8,
    });

    const text = result.text.trim();
    let parsed;

    try {
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) ||
        text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          parsed = JSON.parse(jsonObjectMatch[0]);
        } else {
          parsed = JSON.parse(text);
        }
      }
    } catch {
      return null;
    }

    if (!parsed) {
      return null;
    }

    if (
      !parsed.message ||
      !Array.isArray(parsed.suggestedTasks) ||
      parsed.suggestedTasks.length === 0
    ) {
      return null;
    }

    return {
      message: parsed.message,
      suggestedTasks: parsed.suggestedTasks.map((t: any) => ({
        title: t.title || "",
        cleanedTitle: t.cleanedTitle || t.title || "",
      })),
    };
  } catch {
    return null;
  }
}

async function suggestTasksWithAI(
  weatherType: "hot" | "rain" | "cold" | "moderate",
  weatherDescription: string,
  tasks: Array<{ id: string; title: string; isActive: number }>,
  firstName: string
): Promise<{
  message: string;
  suggestedTasks: Array<{ id: string; title: string; cleanedTitle: string }>;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const taskList = tasks
    .map((t) => `- ${t.title} (ID: ${t.id}, Active: ${t.isActive === 1})`)
    .join("\n");

  const prompt = `You are a no-nonsense task motivator with a "tough love" attitude. Your tone is direct, aggressive, and commanding - like a drill sergeant who actually cares. No corporate speak, no fluff, no sugar-coating.

User's name: ${firstName}
Current weather: ${weatherDescription}
Weather type: ${weatherType}

User's tasks:
${taskList}

Your job:
1. Identify 1-3 tasks FROM THE PROVIDED LIST ABOVE that make sense for ${weatherType} weather
2. Clean up task titles to work naturally in a sentence (e.g., "Fix espresso machine" becomes "fix the espresso machine")
3. Write a direct, aggressive message that tells the user what to do - not suggests. Use imperative mood. Be tough but not mean.
4. ${firstName ? `ALWAYS start your message with the user's first name followed by a comma, like "${firstName}, it's freezing out there..."` : "Start your message directly without a name."}

CRITICAL: You MUST ONLY suggest tasks that are in the "User's tasks" list above. DO NOT invent or create new tasks. DO NOT suggest tasks that don't exist in the user's task list. Every task you suggest MUST have a matching ID from the list above.

Tone guidelines:
- Use direct commands: "Do this", "Get this done", "Time to tackle"
- No soft language like "you could", "maybe", "consider", "how about"
- Be urgent and action-oriented
- Match the weather context but stay aggressive
- Short sentences. Punchy. No fluff.
- When listing multiple tasks, ALWAYS use "or" not "and" - give them a choice, not a burden

For ${weatherType} weather:
- Hot: Indoor tasks or early morning outdoor work. Don't let the heat be an excuse.
- Rain: Indoor tasks. Perfect excuse to stay inside and get shit done.
- Cold/Snow: Indoor tasks. Too cold outside? Good. Stay in and work.
- Moderate: No excuses. Get outside or stay in - just pick something and do it.

Return your response as JSON with this exact structure:
{
  "message": "A direct, aggressive message like '${firstName ? `${firstName}, ` : ""}it's freezing out there. Stop making excuses and get inside. Time to {task1} or {task2}. Pick one and do it.'",
  "suggestedTasks": [
    {"id": "task-id-1", "title": "Original Title", "cleanedTitle": "cleaned title for natural language"},
    {"id": "task-id-2", "title": "Original Title", "cleanedTitle": "cleaned title for natural language"}
  ]
}

CRITICAL RULES:
1. When listing multiple tasks in the message, ALWAYS use "or" to connect them, never "and". Example: "Fix the bookshelf or organize the home office" NOT "Fix the bookshelf and organize the home office". Give them a choice, not a burden.
2. You MUST ONLY reference tasks from the "User's tasks" list provided above. DO NOT invent, create, or suggest tasks that are not in that list. Every task ID you return MUST match a task ID from the list above.
3. If you mention a task in the message, it MUST be in the suggestedTasks array with a valid ID from the user's task list.

IMPORTANT: Be aggressive and direct. This is "Better Do It" - a command, not a suggestion. Find at least 1-2 tasks FROM THE PROVIDED LIST. Only return null if absolutely no tasks from the list could possibly be done.`;

  try {
    const result = await generateText({
      model: openai("o3-mini"),
      prompt,
      temperature: 0.8,
    });

    const text = result.text.trim();
    let parsed;

    try {
      const jsonMatch =
        text.match(/```json\s*([\s\S]*?)\s*```/) ||
        text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          parsed = JSON.parse(jsonObjectMatch[0]);
        } else {
          parsed = JSON.parse(text);
        }
      }
    } catch (parseError) {
      return null;
    }

    if (!parsed) {
      return null;
    }

    if (
      !parsed.message ||
      !Array.isArray(parsed.suggestedTasks) ||
      parsed.suggestedTasks.length === 0
    ) {
      return null;
    }

    const validTasks = parsed.suggestedTasks.filter((t: any) => {
      return tasks.some((task) => task.id === t.id);
    });

    if (validTasks.length === 0) {
      return null;
    }

    return {
      message: parsed.message,
      suggestedTasks: validTasks.map((t: any) => ({
        id: t.id,
        title: t.title || tasks.find((task) => task.id === t.id)?.title || "",
        cleanedTitle:
          t.cleanedTitle ||
          t.title ||
          tasks.find((task) => task.id === t.id)?.title ||
          "",
      })),
    };
  } catch (error) {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const userIp = getUserIp(req);
    const url = new URL(req.url);
    const testLocation = url.searchParams.get("testLocation");

    let locationToUse = testLocation || userIp;
    if (
      !testLocation &&
      (userIp === "auto" || userIp === "::1" || userIp === "127.0.0.1")
    ) {
      const devLocation = process.env.WEATHER_DEFAULT_LOCATION;
      if (devLocation) {
        locationToUse = devLocation;
      }
    }

    const weather = await getCurrentWeather(locationToUse);
    if (!weather) {
      return Response.json(
        { error: "Could not fetch weather data" },
        { status: 500 }
      );
    }

    const weatherType = categorizeWeather(
      weather.tempF,
      weather.precipMm,
      weather.isSnow
    );

    if (!weatherType) {
      return Response.json(
        { error: "Weather conditions not suitable for suggestions" },
        { status: 200 }
      );
    }

    const tasks = await getUserTasks(userId);
    const weatherDescription = `${weather.condition}, ${Math.round(weather.tempF)}°F${weather.precipMm > 0 ? `, ${weather.precipMm}mm precipitation` : ""}`;
    const userName = (session.user.name as string) || "";
    const firstName = userName.split(" ")[0] || "";

    let suggestions;
    try {
      if (tasks.length === 0) {
        suggestions = await suggestNewTasksWithAI(
          weatherType,
          weatherDescription,
          firstName
        );
      } else {
        suggestions = await suggestTasksWithAI(
          weatherType,
          weatherDescription,
          tasks,
          firstName
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
        return Response.json(
          {
            error:
              "AI service not configured. Please add OPENAI_API_KEY to your environment variables.",
            weatherInfo: {
              tempF: weather.tempF,
              condition: weather.condition,
              weatherType,
            },
          },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!suggestions || suggestions.suggestedTasks.length === 0) {
      return Response.json(
        {
          error: "No tasks match current weather conditions",
          weatherInfo: {
            tempF: weather.tempF,
            condition: weather.condition,
            weatherType,
          },
        },
        { status: 200 }
      );
    }

    return Response.json({
      weatherType,
      weatherDescription,
      message: suggestions.message,
      suggestedTasks: suggestions.suggestedTasks,
      isNewTask: tasks.length === 0,
    });
  } catch (error) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
