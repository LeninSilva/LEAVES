import {
  allEntries,
  blobKeysOf,
  clearTombstone,
  db,
  dropEntryFromSync,
  emit,
  getBlob,
  getMeta,
  getSettings,
  kvGet,
  kvSet,
  putBlob,
  saveMeta,
  saveSettings,
  subscribe,
  tombstones,
} from "./db";
import { ensureSession, supabase } from "./auth";
import type { Entry, Settings } from "./types";

/**
 * Local-first sync. IndexedDB is the source of truth on the device; the cloud
 * keeps a copy. Each entry is one row (its JSON) and each image one object in
 * a private bucket under the person's own folder. Row-level security keeps
 * every account's data apart. Last write wins per entry.
 */

const BUCKET = "leaves";
const TOMBSTONE_GRACE_MS = 12_000; // leaves time for Undo before a delete syncs
const UPLOADED_KEY = "uploadedBlobs";

let running = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function wireEntry(e: Entry): Omit<Entry, "syncedAt"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncedAt, ...rest } = e;
  return rest;
}

async function uploadedSet(): Promise<Set<string>> {
  return new Set((await kvGet<string[]>(UPLOADED_KEY)) ?? []);
}

async function markSynced(id: string, updatedAt: number) {
  const d = await db();
  const tx = d.transaction("entries", "readwrite");
  const current = await tx.store.get(id);
  if (current && current.updatedAt === updatedAt) await tx.store.put({ ...current, syncedAt: updatedAt });
  await tx.done;
}

async function push(uid: string) {
  const sb = (await supabase())!;
  const uploaded = await uploadedSet();
  const entries = (await allEntries()).filter((e) => !e.syncedAt || e.updatedAt > e.syncedAt);
  for (const entry of entries) {
    for (const key of blobKeysOf(entry)) {
      if (uploaded.has(key)) continue;
      const blob = await getBlob(key);
      if (!blob) continue;
      const { error } = await sb.storage.from(BUCKET).upload(`${uid}/${key}`, blob, {
        upsert: true,
        contentType: blob.type || "application/octet-stream",
      });
      if (error) throw error;
      uploaded.add(key);
    }
    await kvSet(UPLOADED_KEY, [...uploaded]);
    const { error } = await sb.from("entries").upsert({
      id: entry.id,
      user_id: uid,
      data: wireEntry(entry),
      deleted: false,
      updated_at: new Date(entry.updatedAt).toISOString(),
    });
    if (error) throw error;
    await markSynced(entry.id, entry.updatedAt);
  }

  const now = Date.now();
  for (const t of await tombstones()) {
    if (now - t.deletedAt < TOMBSTONE_GRACE_MS) continue;
    const { error } = await sb
      .from("entries")
      .upsert({ id: t.id, user_id: uid, data: {}, deleted: true, updated_at: new Date(t.deletedAt).toISOString() });
    if (error) throw error;
    if (t.blobKeys.length) {
      await sb.storage.from(BUCKET).remove(t.blobKeys.map((k) => `${uid}/${k}`));
      t.blobKeys.forEach((k) => uploaded.delete(k));
      await kvSet(UPLOADED_KEY, [...uploaded]);
    }
    await clearTombstone(t.id);
  }

  const settings = await getSettings();
  const settingsSyncedAt = (await kvGet<number>("settingsSyncedAt")) ?? 0;
  if (settings.updatedAt > settingsSyncedAt) {
    const { error } = await sb.from("settings").upsert({
      user_id: uid,
      data: settings,
      updated_at: new Date(settings.updatedAt).toISOString(),
    });
    if (error) throw error;
    await kvSet("settingsSyncedAt", settings.updatedAt);
  }
}

async function pull() {
  const sb = (await supabase())!;
  const meta = await getMeta();
  let query = sb
    .from("entries")
    .select("id, data, deleted, updated_at, synced_at")
    .order("synced_at", { ascending: true })
    .limit(500);
  if (meta.lastPullAt) query = query.gt("synced_at", meta.lastPullAt);
  const { data: rows, error } = await query;
  if (error) throw error;
  let cursor = meta.lastPullAt;
  const d = await db();
  let changed = false;
  for (const row of rows ?? []) {
    cursor = row.synced_at as string;
    const remoteUpdated = Date.parse(row.updated_at as string);
    const local = await d.get("entries", row.id as string);
    if (row.deleted) {
      if (local && local.updatedAt <= remoteUpdated) await dropEntryFromSync(row.id as string);
      continue;
    }
    if (!local || remoteUpdated > local.updatedAt) {
      const incoming = row.data as Entry;
      await d.put("entries", { ...incoming, updatedAt: remoteUpdated, syncedAt: remoteUpdated });
      // Images from the cloud are already uploaded.
      const uploaded = await uploadedSet();
      blobKeysOf(incoming).forEach((k) => uploaded.add(k));
      await kvSet(UPLOADED_KEY, [...uploaded]);
      changed = true;
    }
  }
  if (changed) emit("entries");
  if (cursor !== meta.lastPullAt) await saveMeta({ lastPullAt: cursor });
  if ((rows?.length ?? 0) === 500) again = true;

  const { data: s } = await sb.from("settings").select("data, updated_at").maybeSingle();
  if (s) {
    const remote = Date.parse(s.updated_at as string);
    const local = await getSettings();
    if (remote > local.updatedAt) {
      await saveSettings({ ...(s.data as Settings), updatedAt: remote }, { fromSync: true });
      await kvSet("settingsSyncedAt", remote);
    }
  }
}

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  if (!navigator.onLine) return;
  const user = await ensureSession();
  if (!user) return;
  running = true;
  try {
    await pull();
    await push(user.id);
  } catch (err) {
    console.warn("Sync paused", (err as Error).message);
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync(1500);
    }
  }
}

export function scheduleSync(delay = 2000) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

let started = false;

export async function startSync() {
  if (started || !(await supabase())) return;
  started = true;
  subscribe("entries", () => scheduleSync());
  subscribe("settings", () => scheduleSync());
  window.addEventListener("online", () => scheduleSync(500));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(500);
  });
  setInterval(() => document.visibilityState === "visible" && scheduleSync(0), 5 * 60_000);
  // Tombstones wait out the Undo window, so check again after it.
  setInterval(async () => {
    if ((await tombstones()).length) scheduleSync(0);
  }, TOMBSTONE_GRACE_MS + 1000);
  scheduleSync(300);
}

/** Downloads an image this device doesn't have yet. */
export async function fetchRemoteBlob(ref: string): Promise<Blob | null> {
  const sb = await supabase();
  if (!sb || !navigator.onLine) return null;
  const { data: session } = await sb.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return null;
  const key = ref.startsWith("idb:") ? ref.slice(4) : ref;
  const { data, error } = await sb.storage.from(BUCKET).download(`${uid}/${key}`);
  if (error || !data) return null;
  await putBlob(key, data, { silent: true });
  return data;
}

/** Deletes every row and file this account has in the cloud. */
export async function deleteRemoteEverything(): Promise<void> {
  const sb = await supabase();
  if (!sb) return;
  const { data: session } = await sb.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return;
  // Storage: list and remove the person's folders.
  for (const bucket of [BUCKET, "shared"]) {
    for (;;) {
      const { data: files } = await sb.storage.from(bucket).list(uid, { limit: 1000 });
      if (!files || files.length === 0) break;
      const paths: string[] = [];
      for (const f of files) {
        if (f.id) paths.push(`${uid}/${f.name}`);
        else {
          const { data: inner } = await sb.storage.from(bucket).list(`${uid}/${f.name}`, { limit: 1000 });
          inner?.forEach((i) => paths.push(`${uid}/${f.name}/${i.name}`));
        }
      }
      if (paths.length === 0) break;
      await sb.storage.from(bucket).remove(paths);
    }
  }
  await sb.from("entries").delete().eq("user_id", uid);
  await sb.from("settings").delete().eq("user_id", uid);
  await sb.from("shares").delete().eq("user_id", uid);
  await sb.from("profiles").delete().eq("user_id", uid);
  await sb.from("reminders").delete().eq("user_id", uid);
}
