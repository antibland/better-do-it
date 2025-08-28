/**
 * Week boundary helpers tied to Wednesday 6:00 PM Eastern Time (America/New_York).
 *
 * Rules implemented:
 * - Weeks start every Wednesday at 6 PM ET.
 *
 * We compute in ET but store timestamps in UTC in the DB. Comparisons use UTC ISO strings
 * derived from the ET boundary moments.
 */

const NEW_YORK_TZ = "America/New_York";

/** Convert a JS Date to a plain object in a target time zone. */
function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Create a Date that represents an ET wall-clock timestamp interpreted in ET, returned as a UTC Date. */
function newYorkDateToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  // Build an ISO string as if it were local ET time, then parse with that zone using `toLocaleString` trick.
  // Simpler: construct a date from parts in ET and then convert to UTC via string.
  const isoLocal = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hour
    .toString()
    .padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second
    .toString()
    .padStart(2, "0")}`;
  // Use Date parsing via timeZone formatting to obtain UTC epoch
  const asUtcMs = Date.parse(
    new Intl.DateTimeFormat("en-US", {
      timeZone: NEW_YORK_TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(isoLocal))
  );
  // Fallback if parsing failed
  if (Number.isNaN(asUtcMs)) {
    return new Date(isoLocal + ":00Z");
  }
  return new Date(asUtcMs);
}

/** Returns the UTC Date for the start of the current week (Wednesday 18:00 ET). */
export function getCurrentWeekStartEt(now: Date = new Date()): Date {
  const p = getZonedParts(now, NEW_YORK_TZ);
  // 0=Sunday ... 6=Saturday in ET
  const dayOfWeek = new Date(
    now.toLocaleString("en-US", { timeZone: NEW_YORK_TZ })
  ).getDay();

  // Compute days since last Wednesday
  const WEDNESDAY = 3; // Sunday=0
  let daysSinceWednesday = (dayOfWeek - WEDNESDAY + 7) % 7;

  // If it's Wednesday before 18:00 ET, we haven't reached the week start today
  const isWednesday = dayOfWeek === WEDNESDAY;
  if (isWednesday && p.hour < 18) {
    daysSinceWednesday = (daysSinceWednesday + 7) % 7 || 7; // treat as previous week's Wednesday
  }

  // Determine the date (ET) for that Wednesday
  const etToday = new Date(
    now.toLocaleString("en-US", { timeZone: NEW_YORK_TZ })
  );
  const startEt = new Date(etToday);
  startEt.setDate(etToday.getDate() - daysSinceWednesday);
  const startYear = startEt.getFullYear();
  const startMonth = startEt.getMonth() + 1;
  const startDay = startEt.getDate();

  return newYorkDateToUtc(startYear, startMonth, startDay, 18, 0, 0);
}

/** Returns the UTC Date for the start of the previous week (one week before current). */
export function getPreviousWeekStartEt(now: Date = new Date()): Date {
  const currentStart = getCurrentWeekStartEt(now);
  return new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
}

/** Returns the UTC Date for the start of the next week (one week after current). */
export function getNextWeekStartEt(now: Date = new Date()): Date {
  const currentStart = getCurrentWeekStartEt(now);
  return new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/** Format a Date to SQLite-compatible UTC string: YYYY-MM-DD HH:MM:SS */
export function toSqliteUtc(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds()
  )}`;
}
