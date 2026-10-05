import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { activeAccount } from "./account";
import { blobKeysOf, normalizeEntry } from "./entryShape";
import { DEFAULT_META, DEFAULT_SETTINGS, type Entry, type Meta, type Settings } from "./types";

interface LeavesDB extends DBSchema {
  entries: { key: string; value: Entry; indexes: { status: string } };
  blobs: { key: string; value: Blob };
  kv: { key: string; value: unknown };
  tombstones: { key: string; value: Tombstone };
}

export interface Tombstone {
  id: string;
  deletedAt: number;
  blobKeys: string[];
}

/** Deleted entries wait here this long before they are removed for good. */
export const TRASH_DAYS = 30;
const DAY = 86_400_000;
/** A picture taken out of an entry is kept this long before its file is removed. */
const BLOB_GRACE_DAYS = 7;

// Each account has its own notebook on the device, so two people sharing a
// phone or laptop never see each other's pages. "leaves" holds a guest's pages.
const GUEST_DB = "leaves";
const dbName = (account: string | null) => (account ? `leaves-${account}` : GUEST_DB);
let dbPromise: Promise<IDBPDatabase<LeavesDB>> | null = null;

function openNotebook(name: string) {
  const opening: Promise<IDBPDatabase<LeavesDB>> = openDB<LeavesDB>(name, 1, {
    // Another tab is removing this notebook (someone signed out there): let go
    // at once, or every later attempt to open storage would wait forever.
    blocking() {
      void opening.then((d) => d.close());
      if (name === dbName(activeAccount()) && typeof location !== "undefined") location.reload();
    },
    terminated() {
      dbPromise = null;
    },
    upgrade(d) {
      const entries = d.createObjectStore("entries", { keyPath: "id" });
      entries.createIndex("status", "status");
      d.createObjectStore("blobs");
      d.createObjectStore("kv");
      d.createObjectStore("tombstones", { keyPath: "id" });
    },
  });
  return opening;
}

export function db(): Promise<IDBPDatabase<LeavesDB>> {
  if (!dbPromise) dbPromise = openNotebook(dbName(activeAccount()));
  return dbPromise;
}

/**
 * Readies an account's notebook before switching to it. The first time
 * someone signs in on this device, pages they wrote as a guest move into
 * their account (and then back up), so nothing they wrote is lost.
 */
export async function prepareNotebook(account: string, opts: { adoptGuest: boolean }) {
  const target = await openNotebook(dbName(account));
  if (opts.adoptGuest) {
    const guest = await openNotebook(GUEST_DB);
    const [entries, blobKeys, guestMeta, guestSettings, targetSettings] = await Promise.all([
      guest.getAll("entries"),
      guest.getAllKeys("blobs"),
      guest.get("kv", "meta") as Promise<Partial<Meta> | undefined>,
      guest.get("kv", "settings") as Promise<Settings | undefined>,
      target.get("kv", "settings") as Promise<Settings | undefined>,
    ]);
    const blobs = await Promise.all(blobKeys.map(async (k) => [k, await guest.get("blobs", k)] as const));
    const tx = target.transaction(["entries", "blobs", "kv"], "readwrite");
    for (const e of entries) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { syncedAt, ...rest } = e;
      await tx.objectStore("entries").put({ ...rest, updatedAt: Date.now() });
    }
    for (const [k, b] of blobs) if (b) await tx.objectStore("blobs").put(b, k);
    if (guestSettings && !targetSettings) await tx.objectStore("kv").put(guestSettings, "settings");
    const targetMeta = (await tx.objectStore("kv").get("meta")) as Partial<Meta> | undefined;
    const meta = { ...DEFAULT_META, ...guestMeta, ...targetMeta, lastPullAt: targetMeta?.lastPullAt ?? null };
    await tx.objectStore("kv").put({ ...meta, welcomed: true, signInNudgeShown: true }, "meta");
    await tx.done;
    const clear = guest.transaction(["entries", "blobs", "kv", "tombstones"], "readwrite");
    await Promise.all(["entries", "blobs", "kv", "tombstones"].map((s) => clear.objectStore(s as "kv").clear()));
    await clear.done;
    guest.close();
  } else {
    const meta = (await target.get("kv", "meta")) as Partial<Meta> | undefined;
    await target.put("kv", { ...DEFAULT_META, ...meta, welcomed: true, signInNudgeShown: true }, "meta");
  }
  target.close();
}

/** Removes an account's notebook from this device (its backup stays in the cloud). */
export async function forgetNotebook(account: string) {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(dbName(account));
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/** How many changes on this device haven't reached the backup yet. */
export async function unsyncedCount(): Promise<number> {
  const d = await db();
  const [entries, marks] = await Promise.all([d.getAll("entries"), d.getAll("tombstones")]);
  return entries.filter((e) => !e.syncedAt || e.updatedAt > e.syncedAt).length + marks.length;
}

// ---- change notifications -------------------------------------------------

type Topic = "entries" | "settings" | "meta" | "blobs";
const listeners = new Map<Topic, Set<() => void>>();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(dbName(activeAccount())) : null;

channel?.addEventListener("message", (e: MessageEvent<Topic>) => emitLocal(e.data));

function emitLocal(topic: Topic) {
  listeners.get(topic)?.forEach((fn) => fn());
}

export function emit(topic: Topic) {
  emitLocal(topic);
  channel?.postMessage(topic);
}

export function subscribe(topic: Topic, fn: () => void): () => void {
  let set = listeners.get(topic);
  if (!set) listeners.set(topic, (set = new Set()));
  set.add(fn);
  return () => set!.delete(fn);
}

// ---- entries --------------------------------------------------------------

export async function getEntry(id: string): Promise<Entry | undefined> {
  const stored = await (await db()).get("entries", id);
  return stored ? normalizeEntry(stored) : undefined;
}

/** Every entry, including drafts and ones in Recently deleted. This is what the backup copies. */
export async function allEntries(): Promise<Entry[]> {
  return (await (await db()).getAll("entries")).map(normalizeEntry);
}

export async function finishedEntries(): Promise<Entry[]> {
  const list = await (await db()).getAllFromIndex("entries", "status", "finished");
  return list
    .map(normalizeEntry)
    .filter((e) => !e.deletedAt)
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));
}

export async function draftEntries(): Promise<Entry[]> {
  const list = await (await db()).getAllFromIndex("entries", "status", "draft");
  return list
    .map(normalizeEntry)
    .filter((e) => !e.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Writes an entry, stamping updatedAt so sync knows it changed. */
export async function putEntry(entry: Entry, opts: { silent?: boolean; fromSync?: boolean } = {}) {
  const value = opts.fromSync ? entry : { ...entry, updatedAt: Date.now() };
  await (await db()).put("entries", value);
  if (!opts.silent) emit("entries");
  return value;
}

/**
 * Saves a draft, unless that entry has already been finished (a late autosave
 * must never turn a finished entry back into a draft) or has been deleted.
 */
export async function putDraft(entry: Entry): Promise<Entry> {
  const d = await db();
  const tx = d.transaction("entries", "readwrite");
  const stored = await tx.store.get(entry.id);
  if (stored && (stored.status === "finished" || stored.deletedAt)) {
    await tx.done;
    return normalizeEntry(stored);
  }
  const value = { ...entry, status: "draft" as const, updatedAt: Date.now() };
  await tx.store.put(value);
  await tx.done;
  emit("entries");
  return value;
}

/**
 * Applies a change to the stored entry inside one transaction so concurrent
 * background steps never overwrite each other.
 */
export async function updateEntry(
  id: string,
  change: (e: Entry) => Entry | null,
): Promise<Entry | undefined> {
  const d = await db();
  const tx = d.transaction("entries", "readwrite");
  const raw = await tx.store.get(id);
  if (!raw) {
    await tx.done;
    return undefined;
  }
  const current = normalizeEntry(raw);
  const next = change(current);
  if (next && next !== current) {
    const stamped = { ...next, updatedAt: Date.now() };
    await tx.store.put(stamped);
    await tx.done;
    emit("entries");
    return stamped;
  }
  await tx.done;
  return current;
}

// ---- Recently deleted -----------------------------------------------------

/** Deleted entries, most recently deleted first. */
export async function trashedEntries(): Promise<Entry[]> {
  return (await allEntries()).filter((e) => !!e.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

/**
 * Moves an entry to Recently deleted. Nothing is lost: its words and photos stay
 * where they are, out of sight, and can be brought back for 30 days. Any link
 * it was shared by is cleared here (the caller turns the link off in the cloud).
 */
export async function trashEntry(id: string): Promise<Entry | undefined> {
  const trashed = await updateEntry(id, (e) =>
    e.deletedAt ? e : { ...e, deletedAt: Date.now(), share: { linkToken: null, published: false } },
  );
  if ((await getMeta()).currentDraftId === id) await saveMeta({ currentDraftId: null });
  return trashed;
}

export async function restoreFromTrash(id: string): Promise<Entry | undefined> {
  return updateEntry(id, (e) => (e.deletedAt ? { ...e, deletedAt: null } : e));
}

/** Removes an entry and its pictures for good, and leaves a mark so the cloud copy goes too. */
export async function purgeEntry(id: string) {
  const d = await db();
  const raw = await d.get("entries", id);
  if (!raw) return;
  const keys = blobKeysOf(normalizeEntry(raw));
  const tx = d.transaction(["entries", "blobs", "tombstones"], "readwrite");
  await tx.objectStore("entries").delete(id);
  for (const key of keys) await tx.objectStore("blobs").delete(key);
  await tx.objectStore("tombstones").put({ id, deletedAt: Date.now(), blobKeys: keys });
  await tx.done;
  try {
    localStorage.removeItem(`leaves.draft.${id}`);
  } catch {
    /* storage may be unavailable */
  }
  emit("entries");
}

export async function emptyTrash() {
  for (const e of await trashedEntries()) await purgeEntry(e.id);
}

/** Removes entries that have been in Recently deleted past the grace period. Returns how many. */
export async function purgeExpiredTrash(now = Date.now()): Promise<number> {
  const expired = (await trashedEntries()).filter((e) => (e.deletedAt ?? 0) <= now && now - (e.deletedAt ?? 0) > TRASH_DAYS * DAY);
  for (const e of expired.slice(0, 50)) await purgeEntry(e.id);
  return Math.min(expired.length, 50);
}

/** Removes an entry that was deleted on another device. No tombstone is needed. */
export async function dropEntryFromSync(id: string) {
  const d = await db();
  const raw = await d.get("entries", id);
  if (!raw) return;
  const tx = d.transaction(["entries", "blobs"], "readwrite");
  await tx.objectStore("entries").delete(id);
  for (const key of blobKeysOf(normalizeEntry(raw))) await tx.objectStore("blobs").delete(key);
  await tx.done;
  emit("entries");
}

export async function tombstones() {
  return (await db()).getAll("tombstones");
}

export async function clearTombstone(id: string) {
  await (await db()).delete("tombstones", id);
}

// ---- blobs ----------------------------------------------------------------

export async function putBlob(key: string, blob: Blob, opts: { silent?: boolean } = {}): Promise<string> {
  await (await db()).put("blobs", blob, key);
  if (!opts.silent) emit("blobs");
  return "idb:" + key;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get("kv", key)) as T | undefined;
}

export async function kvSet(key: string, value: unknown) {
  await (await db()).put("kv", value, key);
}

export async function getBlob(ref: string): Promise<Blob | undefined> {
  const key = ref.startsWith("idb:") ? ref.slice(4) : ref;
  return (await db()).get("blobs", key);
}

export async function deleteBlob(ref: string) {
  const key = ref.startsWith("idb:") ? ref.slice(4) : ref;
  await (await db()).delete("blobs", key);
}

/**
 * Pictures are never deleted the moment they are taken out of an entry: a crash
 * between the two steps would leave an entry pointing at nothing, and a mis-tap
 * could not be undone. They are queued, and removed after a grace period only if
 * no entry (including ones in Recently deleted) uses them any more.
 */
interface PendingBlob {
  key: string;
  at: number;
}
const PENDING = "pendingBlobDeletes";
const REMOTE_REMOVALS = "remoteBlobRemovals";

export async function queueBlobDeletion(keys: string[], now = Date.now()) {
  if (!keys.length) return;
  const d = await db();
  const tx = d.transaction("kv", "readwrite");
  const list = ((await tx.store.get(PENDING)) as PendingBlob[] | undefined) ?? [];
  const have = new Set(list.map((p) => p.key));
  for (const key of keys) if (!have.has(key)) list.push({ key, at: now });
  await tx.store.put(list, PENDING);
  await tx.done;
}

/** Undo: a picture put back into an entry must not be removed. */
export async function cancelBlobDeletion(keys: string[]) {
  const d = await db();
  const tx = d.transaction("kv", "readwrite");
  const list = ((await tx.store.get(PENDING)) as PendingBlob[] | undefined) ?? [];
  const drop = new Set(keys);
  await tx.store.put(
    list.filter((p) => !drop.has(p.key)),
    PENDING,
  );
  await tx.done;
}

/** Removes queued pictures that are past the grace period and no longer used. Returns the keys removed. */
export async function sweepBlobs(opts: { now?: number; graceMs?: number } = {}): Promise<string[]> {
  const now = opts.now ?? Date.now();
  const graceMs = opts.graceMs ?? BLOB_GRACE_DAYS * DAY;
  const d = await db();
  // One transaction for the check and the removal, so a picture put back by Undo can't slip between them.
  const tx = d.transaction(["entries", "blobs", "kv"], "readwrite");
  const kv = tx.objectStore("kv");
  const pending = ((await kv.get(PENDING)) as PendingBlob[] | undefined) ?? [];
  const due = pending.filter((p) => now - p.at >= graceMs);
  if (!due.length) {
    await tx.done;
    return [];
  }
  const used = new Set((await tx.objectStore("entries").getAll()).flatMap((e) => blobKeysOf(normalizeEntry(e))));
  const doomed = due.filter((p) => !used.has(p.key)).map((p) => p.key);
  for (const key of doomed) await tx.objectStore("blobs").delete(key);
  const dueKeys = new Set(due.map((p) => p.key));
  await kv.put(
    pending.filter((p) => !dueKeys.has(p.key)),
    PENDING,
  );
  if (doomed.length) {
    const earlier = ((await kv.get(REMOTE_REMOVALS)) as string[] | undefined) ?? [];
    await kv.put([...new Set([...earlier, ...doomed])], REMOTE_REMOVALS);
  }
  await tx.done;
  return doomed;
}

/** Cloud copies of pictures removed on this device, waiting to be removed from the backup. */
export async function takeRemoteRemovals(): Promise<string[]> {
  return ((await kvGet<string[]>(REMOTE_REMOVALS)) ?? []).slice();
}

export async function clearRemoteRemovals(done: string[]) {
  const left = ((await kvGet<string[]>(REMOTE_REMOVALS)) ?? []).filter((k) => !done.includes(k));
  await kvSet(REMOTE_REMOVALS, left);
}

/**
 * Deleting an entry turns off any link it was shared by. When the device is
 * offline that waits here, and happens as soon as it can.
 */
const REVOKE = "pendingShareRevocations";

export async function queueShareRevocation(entryId: string) {
  const list = (await kvGet<string[]>(REVOKE)) ?? [];
  if (!list.includes(entryId)) await kvSet(REVOKE, [...list, entryId]);
}

export async function pendingShareRevocations(): Promise<string[]> {
  return (await kvGet<string[]>(REVOKE)) ?? [];
}

export async function clearShareRevocations(done: string[]) {
  const left = ((await kvGet<string[]>(REVOKE)) ?? []).filter((id) => !done.includes(id));
  await kvSet(REVOKE, left);
}

// ---- settings and meta ----------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const stored = (await (await db()).get("kv", "settings")) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>, opts: { fromSync?: boolean } = {}) {
  const next = { ...(await getSettings()), ...patch };
  if (!opts.fromSync) next.updatedAt = Date.now();
  await (await db()).put("kv", next, "settings");
  emit("settings");
  return next;
}

export async function getMeta(): Promise<Meta> {
  const stored = (await (await db()).get("kv", "meta")) as Partial<Meta> | undefined;
  return { ...DEFAULT_META, ...stored };
}

export async function saveMeta(patch: Partial<Meta>) {
  const next = { ...(await getMeta()), ...patch };
  await (await db()).put("kv", next, "meta");
  emit("meta");
  return next;
}

/** Removes everything this app keeps on the device. */
export async function wipeLocal() {
  const d = await db();
  const tx = d.transaction(["entries", "blobs", "kv", "tombstones"], "readwrite");
  await Promise.all([
    tx.objectStore("entries").clear(),
    tx.objectStore("blobs").clear(),
    tx.objectStore("kv").clear(),
    tx.objectStore("tombstones").clear(),
  ]);
  await tx.done;
  clearDraftBackups();
  (["entries", "settings", "meta", "blobs"] as Topic[]).forEach(emit);
}

function clearDraftBackups() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("leaves.draft."))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage may be unavailable */
  }
}
