import webpush from "web-push";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * One gentle notification a day, at the time the person chose, in their zone.
 * Rows live in the `reminders` table (written by the app under row-level
 * security). last_sent_date makes sure there is never more than one a day.
 */

const MESSAGE = "Your page is here whenever you want it.";

export const remindersAvailable = () =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && supabaseAdmin());

interface ReminderRow {
  endpoint: string;
  subscription: webpush.PushSubscription;
  reminder_time: string;
  time_zone: string;
  last_sent_date: string | null;
}

export function localClock(now: Date, timeZone: string): { date: string; hhmm: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}:${parts.minute}` };
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Due once the local time reaches the chosen time, if not already sent today.
 * A reminder more than two hours late is skipped rather than sent at an odd hour.
 */
export function isDue(row: Pick<ReminderRow, "reminder_time" | "time_zone" | "last_sent_date">, now: Date): boolean {
  const { date, hhmm } = localClock(now, row.time_zone);
  const late = minutes(hhmm) - minutes(row.reminder_time);
  return row.last_sent_date !== date && late >= 0 && late <= 120;
}

async function tick() {
  const sb = supabaseAdmin();
  if (!sb) return;
  const { data, error } = await sb.from("reminders").select("endpoint, subscription, reminder_time, time_zone, last_sent_date");
  if (error || !data) return;
  const now = new Date();
  for (const row of data as ReminderRow[]) {
    let zoneOk = true;
    try {
      localClock(now, row.time_zone);
    } catch {
      zoneOk = false;
    }
    if (!zoneOk || !isDue(row, now)) continue;
    const today = localClock(now, row.time_zone).date;
    // Mark first, so a crash can never lead to a second notification.
    await sb.from("reminders").update({ last_sent_date: today }).eq("endpoint", row.endpoint);
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({ body: MESSAGE }), { TTL: 60 * 60 * 6 });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await sb.from("reminders").delete().eq("endpoint", row.endpoint);
    }
  }
}

export function startReminders() {
  if (!remindersAvailable()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  setInterval(() => void tick().catch(() => undefined), 60_000);
}
