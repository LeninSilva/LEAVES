import { deleteBlob, getEntry, getMeta, putBlob, putDraft, putEntry, saveMeta, updateEntry } from "./db";
import { currentTimeZone } from "./dates";
import { processPhoto } from "./photo";
import { newId } from "./rng";
import type { Entry, Photo } from "./types";

/** A blank page. Nothing is stored until the first keystroke or photo. */
export function blankEntry(): Entry {
  const now = Date.now();
  return {
    id: newId(),
    status: "draft",
    text: "",
    photos: [],
    place: null,
    startedAt: null,
    finishedAt: null,
    timeZone: currentTimeZone(),
    editedAt: null,
    keptFromAI: false,
    title: null,
    themes: [],
    mood: null,
    motif: null,
    season: null,
    timeOfDay: null,
    scene: null,
    illustration: null,
    reflection: null,
    crisis: false,
    share: { linkToken: null, published: false },
    steps: { reflection: "pending", illustration: "pending" },
    createdAt: now,
    updatedAt: now,
  };
}

// ---- crash-proof backup ----------------------------------------------------
// IndexedDB writes are asynchronous and can be cut off when a phone kills the
// page. Every change to the words or a caption is also written synchronously to
// localStorage, and the newer of the two wins when the page is opened again.

interface DraftBackup {
  text: string;
  captions?: Record<string, string>;
  at: number;
}

const backupKey = (id: string) => `leaves.draft.${id}`;

export function backupDraft(e: Pick<Entry, "id" | "text" | "photos">) {
  try {
    const captions: Record<string, string> = {};
    for (const p of e.photos) if (p.caption) captions[p.id] = p.caption;
    const backup: DraftBackup = { text: e.text, captions, at: Date.now() };
    localStorage.setItem(backupKey(e.id), JSON.stringify(backup));
  } catch {
    /* storage full or unavailable: IndexedDB still has it */
  }
}

export function clearBackup(id: string) {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    /* ignore */
  }
}

function readBackup(id: string): DraftBackup | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as DraftBackup) : null;
  } catch {
    return null;
  }
}

/** The stored draft with any newer, unsaved words or captions from its backup. */
function withBackup(stored: Entry, backup: DraftBackup): Entry {
  let changed = false;
  let next = stored;
  if (backup.text !== stored.text) {
    next = { ...next, text: backup.text };
    changed = true;
  }
  const photos = next.photos.map((p) => {
    const caption = backup.captions?.[p.id];
    if (caption !== undefined && caption !== p.caption) {
      changed = true;
      return { ...p, caption };
    }
    return p;
  });
  return changed ? { ...next, photos } : stored;
}

/** A finished entry reopened for editing, with any words or captions that were typed but never saved. */
export function recoverEdits(entry: Entry): Entry {
  const backup = readBackup(entry.id);
  return backup && backup.at > entry.updatedAt ? withBackup(entry, backup) : entry;
}

/** The draft to reopen, merged with its crash backup, or a new blank page. */
export async function openDraft(id?: string | null): Promise<Entry> {
  const draftId = id ?? (await getMeta()).currentDraftId;
  if (draftId) {
    const stored = await getEntry(draftId);
    if (stored && stored.status === "draft") {
      const backup = readBackup(draftId);
      if (backup && backup.at > stored.updatedAt) {
        const merged = withBackup(stored, backup);
        if (merged !== stored) return putEntry(merged);
      }
      return stored;
    }
    // A backup can exist even if the IndexedDB write never landed.
    const backup = readBackup(draftId);
    if (!stored && backup?.text) {
      const e = { ...blankEntry(), id: draftId, text: backup.text, startedAt: new Date(backup.at).toISOString() };
      await saveMeta({ currentDraftId: draftId });
      return putEntry(e);
    }
  }
  return blankEntry();
}

/** Stamps "began" on the first keystroke or photo and makes the draft current. */
export function beginIfNeeded(e: Entry): Entry {
  if (e.startedAt) return e;
  const tz = currentTimeZone();
  return { ...e, startedAt: new Date().toISOString(), timeZone: tz, startTimeZone: tz };
}

export async function saveDraft(e: Entry): Promise<Entry> {
  const saved = await putDraft(e);
  if (saved.status === "draft") {
    const meta = await getMeta();
    if (meta.currentDraftId !== e.id) await saveMeta({ currentDraftId: e.id });
  }
  return saved;
}

// ---- photographs --------------------------------------------------------------

/** There is no practical limit on entries; one entry stays readable up to this many pictures. */
export const MAX_PHOTOS = 30;

export class StorageFullError extends Error {
  constructor() {
    super("storage full");
  }
}

function isQuotaError(err: unknown): boolean {
  const e = err as { name?: string; code?: number } | null;
  return !!e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22);
}

/**
 * Resizes a picture, strips its location and camera data, and saves the picture
 * and its thumbnail on the device. Returns the Photo to put into an entry. It
 * never touches an entry itself, so words typed while it works are never lost.
 */
export async function storePhoto(entryId: string, file: File): Promise<Photo> {
  const { full, thumb, width, height } = await processPhoto(file);
  const id = newId();
  const fullKey = `photo-${entryId}-${id}`;
  const thumbKey = `${fullKey}-thumb`;
  try {
    const url = await putBlob(fullKey, full, { silent: true });
    const thumbUrl = await putBlob(thumbKey, thumb, { silent: true });
    return { id, url, thumbUrl, alt: "", altEdited: false, caption: "", width, height };
  } catch (err) {
    // Nothing refers to these yet, so removing them at once is safe.
    await Promise.allSettled([deleteBlob(fullKey), deleteBlob(thumbKey)]);
    throw isQuotaError(err) ? new StorageFullError() : err;
  }
}

/** The finished entry's photos with one changed. Used for captions and descriptions. */
export function withPhoto(photos: Photo[], id: string, change: Partial<Photo>): Photo[] {
  return photos.map((p) => (p.id === id ? { ...p, ...change } : p));
}

/** A photo moved one place earlier (-1) or later (1). */
export function movedPhoto(photos: Photo[], id: string, by: -1 | 1): Photo[] {
  const from = photos.findIndex((p) => p.id === id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= photos.length) return photos;
  const next = [...photos];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function hasContent(e: Pick<Entry, "text" | "photos">): boolean {
  return e.text.trim().length > 0 || e.photos.length > 0;
}

/** All the words of an entry: its text, then its photo captions. What the picture and reflection are made from. */
export function wordsOf(e: Pick<Entry, "text" | "photos">): string {
  const captions = e.photos.map((p) => p.caption.trim()).filter(Boolean);
  return [e.text.trim(), ...captions].filter(Boolean).join("\n\n");
}

/**
 * Finishes a draft. Idempotent: a second call (a double tap, or a retry after
 * a crash) returns the entry already finished and never makes a second one.
 */
export async function finishDraft(id: string): Promise<Entry | undefined> {
  const finished = await updateEntry(id, (e) => {
    if (e.status === "finished") return e;
    if (!hasContent(e)) return null;
    const now = new Date().toISOString();
    return {
      ...e,
      status: "finished",
      startedAt: e.startedAt ?? now,
      finishedAt: now,
      timeZone: currentTimeZone(),
      title: e.title ?? localTitle(e),
      steps: { reflection: "pending", illustration: "pending" },
    };
  });
  const meta = await getMeta();
  if (meta.currentDraftId === id) await saveMeta({ currentDraftId: null });
  clearBackup(id);
  return finished;
}

// Words a title shouldn't end on, because they lead into something that was cut off.
const TRAILING = new Set(
  ("a an the and or but so to of in on at for with from by after before about as into over than that then when while my our your his her their its " +
    "this these those some any each every no not is was were be been are am it i we you he she they me us him them who which what there here " +
    "very too also just only if because since until though although where whose would could should will can did do does has have had got")
    .split(" "),
);

/** A title made on the device from the first words, for entries kept from AI or waiting for it. */
export function localTitle(e: Pick<Entry, "text" | "photos">): string {
  const source = e.text.trim() ? e.text : (e.photos.find((p) => p.caption.trim())?.caption ?? "");
  const firstLine = source.trim().split(/\n+/)[0] ?? "";
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0] ?? "";
  const words = firstSentence.replace(/[^\p{L}\p{N}'’\s-]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return e.photos.length ? "Photo of the day" : "A quiet page";
  const picked = words.slice(0, 5);
  // Don't end on a small joining word ("Walked to the river after").
  while (picked.length > 2 && TRAILING.has(picked[picked.length - 1].toLowerCase())) picked.pop();
  const title = picked.join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function firstLine(text: string, max = 110): string {
  const line = text.trim().split(/\n+/)[0] ?? "";
  return line.length > max ? line.slice(0, max).replace(/\s+\S*$/, "") + "…" : line;
}
