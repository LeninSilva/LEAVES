import { openDB, type DBSchema, type IDBPDatabase } from "idb";
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

const DB_NAME = "leaves";
let dbPromise: Promise<IDBPDatabase<LeavesDB>> | null = null;

export function db(): Promise<IDBPDatabase<LeavesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LeavesDB>(DB_NAME, 1, {
      upgrade(d) {
        const entries = d.createObjectStore("entries", { keyPath: "id" });
        entries.createIndex("status", "status");
        d.createObjectStore("blobs");
        d.createObjectStore("kv");
        d.createObjectStore("tombstones", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// ---- change notifications -------------------------------------------------

type Topic = "entries" | "settings" | "meta" | "blobs";
const listeners = new Map<Topic, Set<() => void>>();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("leaves") : null;

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
  return (await db()).get("entries", id);
}

export async function allEntries(): Promise<Entry[]> {
  return (await db()).getAll("entries");
}

export async function finishedEntries(): Promise<Entry[]> {
  const list = await (await db()).getAllFromIndex("entries", "status", "finished");
  return list.sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));
}

export async function draftEntries(): Promise<Entry[]> {
  const list = await (await db()).getAllFromIndex("entries", "status", "draft");
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
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
 * must never turn a finished entry back into a draft).
 */
export async function putDraft(entry: Entry): Promise<Entry> {
  const d = await db();
  const tx = d.transaction("entries", "readwrite");
  const stored = await tx.store.get(entry.id);
  if (stored && stored.status === "finished") {
    await tx.done;
    return stored;
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
  const current = await tx.store.get(id);
  if (!current) {
    await tx.done;
    return undefined;
  }
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

export interface RemovedEntry {
  entry: Entry;
  blobs: [string, Blob][];
}

/** Deletes an entry and its images, keeping a copy in memory so it can be undone. */
export async function removeEntry(id: string): Promise<RemovedEntry | null> {
  const d = await db();
  const entry = await d.get("entries", id);
  if (!entry) return null;
  const keys = blobKeysOf(entry);
  const blobs: [string, Blob][] = [];
  for (const key of keys) {
    const b = await d.get("blobs", key);
    if (b) blobs.push([key, b]);
  }
  const tx = d.transaction(["entries", "blobs", "tombstones"], "readwrite");
  await tx.objectStore("entries").delete(id);
  for (const key of keys) await tx.objectStore("blobs").delete(key);
  await tx.objectStore("tombstones").put({ id, deletedAt: Date.now(), blobKeys: keys });
  await tx.done;
  emit("entries");
  return { entry, blobs };
}

export async function restoreEntry(removed: RemovedEntry) {
  const d = await db();
  const tx = d.transaction(["entries", "blobs", "tombstones"], "readwrite");
  for (const [key, blob] of removed.blobs) await tx.objectStore("blobs").put(blob, key);
  await tx.objectStore("entries").put({ ...removed.entry, updatedAt: Date.now() });
  await tx.objectStore("tombstones").delete(removed.entry.id);
  await tx.done;
  emit("entries");
  emit("blobs");
}

/** Removes an entry that was deleted on another device. No tombstone is needed. */
export async function dropEntryFromSync(id: string) {
  const d = await db();
  const entry = await d.get("entries", id);
  if (!entry) return;
  const tx = d.transaction(["entries", "blobs"], "readwrite");
  await tx.objectStore("entries").delete(id);
  for (const key of blobKeysOf(entry)) await tx.objectStore("blobs").delete(key);
  await tx.done;
  emit("entries");
}

export async function tombstones() {
  return (await db()).getAll("tombstones");
}

export async function clearTombstone(id: string) {
  await (await db()).delete("tombstones", id);
}

export function blobKeysOf(entry: Entry | undefined): string[] {
  if (!entry) return [];
  return [entry.photo?.url, entry.photo?.thumbUrl, entry.illustration?.url, entry.illustration?.thumbUrl]
    .filter((u): u is string => !!u && u.startsWith("idb:"))
    .map((u) => u.slice(4));
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
  try {
    localStorage.clear();
  } catch {
    /* storage may be unavailable */
  }
  (["entries", "settings", "meta", "blobs"] as Topic[]).forEach(emit);
}
