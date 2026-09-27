/**
 * Dates are stored as UTC ISO strings plus the IANA zone where the person was.
 * Everything shown is formatted with Intl.DateTimeFormat in that zone, so
 * 12 or 24 hour time follows the phone's locale.
 */

export function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function zonedParts(iso: string, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(iso))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour % 24, minute: out.minute };
}

/** "2026-09-26" for the calendar day in the given zone. */
export function dayKey(iso: string, timeZone: string): string {
  const p = zonedParts(iso, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Entries begun late and finished just after midnight belong to the day they began. */
const MAX_OVERNIGHT_MS = 6 * 60 * 60 * 1000;

export interface Stampable {
  startedAt: string | null;
  finishedAt: string | null;
  timeZone: string;
  startTimeZone?: string;
  place?: { name: string } | null;
}

export function crossesMidnight(e: Stampable): boolean {
  if (!e.startedAt || !e.finishedAt) return false;
  const duration = Date.parse(e.finishedAt) - Date.parse(e.startedAt);
  if (duration <= 0 || duration > MAX_OVERNIGHT_MS) return false;
  const startDay = dayKey(e.startedAt, e.timeZone);
  const endDay = dayKey(e.finishedAt, e.timeZone);
  return dayNumber(endDay) - dayNumber(startDay) === 1;
}

/** The calendar day an entry is filed under, in the zone where it was written. */
export function entryDay(e: Stampable): string {
  const iso = crossesMidnight(e) ? e.startedAt! : (e.finishedAt ?? e.startedAt ?? new Date().toISOString());
  return dayKey(iso, e.timeZone);
}

function dateLong(iso: string, timeZone: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "long" }).format(new Date(iso));
}

function timeShort(iso: string, timeZone: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone, timeStyle: "short" }).format(new Date(iso));
}

/**
 * "September 26, 2026 at 9:42 PM", or "September 26, 2026, 11:50 PM to 12:10 AM"
 * across midnight, with " in [place]" when a place is set and wanted.
 */
export function formatStamp(e: Stampable, opts: { locale?: string; withPlace?: boolean } = {}): string {
  const { locale, withPlace = true } = opts;
  if (!e.finishedAt) return "";
  let text: string;
  if (crossesMidnight(e)) {
    text = `${dateLong(e.startedAt!, e.timeZone, locale)}, ${timeShort(e.startedAt!, e.timeZone, locale)} to ${timeShort(e.finishedAt, e.timeZone, locale)}`;
  } else {
    text = new Intl.DateTimeFormat(locale, { timeZone: e.timeZone, dateStyle: "long", timeStyle: "short" }).format(
      new Date(e.finishedAt),
    );
  }
  if (withPlace && e.place?.name) text += ` in ${e.place.name}`;
  return text;
}

/** "September 26, 2026 at 9:42 PM" for a single moment in a zone. */
export function formatMoment(iso: string, timeZone: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "long", timeStyle: "short" }).format(new Date(iso));
}

/** "Saturday, September 26" for the top of the page. */
export function formatToday(now: Date = new Date(), locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone }).format(now);
}

/** "September 2026" for list groups. */
export function formatMonth(key: string, locale?: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** Short time for list rows: "Sep 26, 9:42 PM". */
export function formatRowDate(e: Stampable, locale?: string): string {
  if (!e.finishedAt) return "";
  const iso = crossesMidnight(e) ? e.startedAt! : e.finishedAt;
  return new Intl.DateTimeFormat(locale, {
    timeZone: e.timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Friendly phrase sent to the model, without place: "Saturday, September 26, 9:42 PM". */
export function describeWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Minutes since midnight for an "HH:MM" string. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True when `now` falls in [from, to), wrapping past midnight when from > to. */
export function inWindow(now: Date, from: string, to: string): boolean {
  const n = now.getHours() * 60 + now.getMinutes();
  const a = toMinutes(from);
  const b = toMinutes(to);
  if (a === b) return false;
  return a < b ? n >= a && n < b : n >= a || n < b;
}

/** Days that match "on this day": same month and day in an earlier year, or one month ago. */
export function onThisDayKeys(todayKey: string): { yearsAgo: (key: string) => boolean; monthAgo: string } {
  const [y, m, d] = todayKey.split("-").map(Number);
  const mmdd = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const lastDay = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)).getUTCDate();
  const monthAgo = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
  return {
    yearsAgo: (key) => key.slice(5) === mmdd && Number(key.slice(0, 4)) < y,
    monthAgo,
  };
}

/** "20:00" as the phone shows times, e.g. "8:00 PM". */
export function formatClock(hhmm: string, locale?: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, 0, 1, h || 0, m || 0)),
  );
}

/** Time of day and season where the entry was written, for drawings made without AI. */
export function naturalMoment(iso: string, timeZone: string): {
  timeOfDay: "dawn" | "morning" | "afternoon" | "evening" | "night";
  season: "spring" | "summer" | "autumn" | "winter";
} {
  const p = zonedParts(iso, timeZone);
  const h = p.hour;
  const timeOfDay = h >= 5 && h < 7 ? "dawn" : h < 12 && h >= 7 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 20 ? "evening" : "night";
  // Southern-hemisphere zones get the opposite season.
  const south = /^(Australia|Antarctica|Pacific\/Auckland|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek))/.test(timeZone);
  const m = ((p.month - 1 + (south ? 6 : 0)) % 12) + 1;
  const season = m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
  return { timeOfDay, season };
}
