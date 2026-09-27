import { getEntry, getMeta, putBlob, putDraft, putEntry, saveMeta, updateEntry, deleteBlob } from "./db";
import { currentTimeZone } from "./dates";
import { processPhoto } from "./photo";
import { newId } from "./rng";
import type { Entry } from "./types";

/** A blank page. Nothing is stored until the first keystroke or photo. */
export function blankEntry(): Entry {
  const now = Date.now();
  return {
    id: newId(),
    status: "draft",
    text: "",
    photo: null,
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

// ---- crash-proof text backup ------------------------------------------------
// IndexedDB writes are asynchronous and can be cut off when a phone kills the
// page. Every keystroke is also written synchronously to localStorage, and the
// newer of the two wins when the page is opened again.

const backupKey = (id: string) => `leaves.draft.${id}`;

export function backupText(id: string, text: string) {
  try {
    localStorage.setItem(backupKey(id), JSON.stringify({ text, at: Date.now() }));
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

function readBackup(id: string): { text: string; at: number } | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as { text: string; at: number }) : null;
  } catch {
    return null;
  }
}

/** The draft to reopen, merged with its crash backup, or a new blank page. */
export async function openDraft(id?: string | null): Promise<Entry> {
  const draftId = id ?? (await getMeta()).currentDraftId;
  if (draftId) {
    const stored = await getEntry(draftId);
    if (stored && stored.status === "draft") {
      const backup = readBackup(draftId);
      if (backup && backup.at > stored.updatedAt && backup.text !== stored.text) {
        return putEntry({ ...stored, text: backup.text });
      }
      return stored;
    }
    // A backup can exist even if the IndexedDB write never landed.
    const backup = readBackup(draftId);
    if (backup?.text) {
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

export async function attachPhoto(e: Entry, file: File): Promise<Entry> {
  const { full, thumb } = await processPhoto(file);
  const stamp = Date.now().toString(36);
  const url = await putBlob(`photo-${e.id}-${stamp}`, full);
  const thumbUrl = await putBlob(`photo-${e.id}-${stamp}-thumb`, thumb);
  if (e.photo) {
    await deleteBlob(e.photo.url);
    await deleteBlob(e.photo.thumbUrl);
  }
  return { ...beginIfNeeded(e), photo: { url, thumbUrl, alt: "", altEdited: false } };
}

export async function detachPhoto(e: Entry): Promise<Entry> {
  if (e.photo) {
    await deleteBlob(e.photo.url);
    await deleteBlob(e.photo.thumbUrl);
  }
  return { ...e, photo: null };
}

export function hasContent(e: Pick<Entry, "text" | "photo">): boolean {
  return e.text.trim().length > 0 || e.photo !== null;
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

const TRAILING = new Set(
  "a an the and or but so to of in on at for with from by after before about as into over than that then when while my our your his her their its".split(" "),
);

/** A title made on the device from the first words, for entries kept from AI or waiting for it. */
export function localTitle(e: Pick<Entry, "text" | "photo">): string {
  const firstLine = e.text.trim().split(/\n+/)[0] ?? "";
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0] ?? "";
  const words = firstSentence.replace(/[^\p{L}\p{N}'’\s-]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return e.photo ? "Photo of the day" : "A quiet page";
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
