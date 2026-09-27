import { serverConfig } from "./ai";
import { currentUser, isAccount, supabase } from "./auth";
import { currentTimeZone, zonedParts } from "./dates";

/**
 * One gentle notification a day at the chosen time: "Your page is here
 * whenever you want it." Delivered by web push from the server, so it works
 * when the app is closed. Never more than one a day, never guilt.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type ReminderResult = { ok: true } | { ok: false; message: string };

export async function enableReminder(time: string): Promise<ReminderResult> {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "This browser can't show reminders. On iPhone, add Leaves to your Home Screen first." };
  }
  const config = await serverConfig().catch(() => null);
  const sb = await supabase();
  if (!config?.vapidPublicKey || !sb) return { ok: false, message: "Reminders aren't set up on this server." };
  const user = await currentUser();
  if (!isAccount(user)) return { ok: false, message: "Sign in to get a daily reminder." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, message: "Notifications are turned off for Leaves in your settings." };
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey) }));
  const tz = currentTimeZone();
  // If today's time has already passed, the first reminder comes tomorrow.
  const now = zonedParts(new Date().toISOString(), tz);
  const nowHHMM = `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`;
  const today = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
  const { error } = await sb.from("reminders").upsert({
    endpoint: sub.endpoint,
    user_id: user.id,
    subscription: sub.toJSON(),
    reminder_time: time,
    time_zone: tz,
    last_sent_date: nowHHMM >= time ? today : null,
  });
  if (error) return { ok: false, message: "Couldn't save the reminder. Try again." };
  return { ok: true };
}

export async function disableReminder(): Promise<void> {
  try {
    // getRegistration, not ready: ready never settles where no worker was registered.
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    const sb = await supabase();
    if (sub && sb) await sb.from("reminders").delete().eq("endpoint", sub.endpoint);
    await sub?.unsubscribe();
  } catch {
    /* nothing to undo */
  }
}
