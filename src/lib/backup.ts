import { strFromU8 } from "fflate";
import {
  allEntries,
  clearTombstone,
  emit,
  getBlob,
  getEntry,
  getSettings,
  putBlob,
  putEntry,
  saveMeta,
  saveSettings,
} from "./db";
import { entryDay, zonedParts } from "./dates";
import { blobKeysOf, normalizeEntry } from "./entryShape";
import { entryMarkdown, slug } from "./markdown";
import { readZipDirectory, readZipFile, ZipWriter } from "./zip";
import type { Entry, Settings } from "./types";

/**
 * A backup is one ZIP that works two ways. Open it on any computer and every entry
 * is a readable Markdown file beside its photos and drawing. Or give it back to
 * Leaves ("Restore from a backup") and everything returns exactly as it was,
 * captions, drafts and Recently deleted included. Nothing in it needs the cloud.
 */

const FORMAT = 2;
const DATA = "data/leaves.json";

interface BackupFile {
  app: "leaves";
  format: number;
  exportedAt: string;
  entries: Omit<Entry, "syncedAt">[];
  settings: Settings | null;
  /** Where each stored picture sits in the ZIP, by its key on the device. */
  files: Record<string, { path: string; type: string }>;
}

export class BackupError extends Error {}

export interface BackupSummary {
  entries: number;
  photos: number;
}

function ext(type: string): string {
  if (type.includes("svg")) return "svg";
  if (type.includes("webp")) return "webp";
  if (type.includes("png")) return "png";
  return "jpg";
}

function baseName(e: Entry, used: Set<string>): string {
  const p = e.finishedAt ? zonedParts(e.finishedAt, e.timeZone) : null;
  const time = p ? `${String(p.hour).padStart(2, "0")}${String(p.minute).padStart(2, "0")}` : "0000";
  const stem = `${entryDay(e)}-${time}-${slug(e.title ?? "entry")}`;
  let name = stem;
  let n = 2;
  while (used.has(name)) name = `${stem}-${n++}`;
  used.add(name);
  return name;
}

const README = (when: string) => `# Leaves backup

Made ${when}.

- entries/       one Markdown file per entry, readable anywhere
- photos/        your photographs (captions are in the entries)
- illustrations/ the drawing made for each entry
- reflections.md every reflection you received
- data/          everything Leaves needs to restore this backup

To put it all back: open Leaves, go to Settings, then Restore from a backup, and choose this file.
Entries you deleted within the last 30 days are in data/ only, so they can be restored too.
`;

/** Every entry, photo and caption in one ZIP. Drafts and Recently deleted are included. */
export async function buildBackup(): Promise<{ blob: Blob; summary: BackupSummary }> {
  const all = await allEntries();
  const zip = new ZipWriter();
  const files: BackupFile["files"] = {};
  const used = new Set<string>();
  const book: string[] = ["# Reflections", ""];
  let photos = 0;

  const keyOf = (ref: string) => (ref.startsWith("idb:") ? ref.slice(4) : ref);

  /** Adds a stored picture once, and says where it went. */
  const addFile = async (ref: string, path: string): Promise<string | null> => {
    const key = keyOf(ref);
    if (files[key]) return files[key].path;
    const blob = await getBlob(key);
    if (!blob) return null;
    await zip.blob(path, blob, { compress: blob.type.includes("svg") });
    files[key] = { path, type: blob.type || "application/octet-stream" };
    return path;
  };

  const live = all.filter((e) => !e.deletedAt).sort((a, b) => entryDay(a).localeCompare(entryDay(b)) || a.createdAt - b.createdAt);
  for (const e of live) {
    const name = baseName(e, used);
    const imagePaths = new Map<string, string>();
    for (const [i, p] of e.photos.entries()) {
      const blob = await getBlob(p.url);
      const path = blob ? await addFile(p.url, `photos/${name}-${i + 1}.${ext(blob.type)}`) : null;
      if (path) {
        imagePaths.set(p.id, `../${path}`);
        photos++;
      }
    }
    let illustration: { path: string; alt: string } | undefined;
    if (e.illustration) {
      const blob = await getBlob(e.illustration.url);
      const path = blob ? await addFile(e.illustration.url, `illustrations/${name}.${ext(blob.type)}`) : null;
      if (path) illustration = { path: `../${path}`, alt: e.illustration.alt };
    }
    zip.text(`entries/${name}.md`, entryMarkdown(e, { withPlace: true, frontMatter: true, imagePaths, illustration }));
    const r = e.reflection;
    if (r?.quote && !e.crisis) {
      book.push(
        `> ${r.isParaphrase ? r.quote : `“${r.quote}”`}`,
        ">",
        `> ${r.isParaphrase ? "after " : ""}${r.author ?? ""}${r.source ? `, ${r.source}` : ""}`,
        "",
        `From [${e.title}](entries/${name}.md)`,
        "",
      );
    }
  }

  // Everything else the entries use: thumbnails, and the pictures of deleted entries.
  for (const e of all) {
    for (const key of blobKeysOf(e)) {
      if (files[key]) continue;
      const blob = await getBlob(key);
      if (blob) await addFile(key, `data/${key.endsWith("-thumb") ? "thumbs" : "blobs"}/${key}.${ext(blob.type)}`);
    }
  }

  const data: BackupFile = {
    app: "leaves",
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    entries: all.map(({ syncedAt, ...rest }) => rest),
    settings: await getSettings(),
    files,
  };
  zip.text("reflections.md", book.join("\n"));
  zip.text("README.md", README(data.exportedAt.slice(0, 10)));
  zip.text(DATA, JSON.stringify(data));
  return { blob: await zip.finish(), summary: { entries: live.length, photos } };
}

export const backupFileName = (now = new Date()) => `leaves-${now.toISOString().slice(0, 10)}.zip`;

export async function markBackedUp() {
  await saveMeta({ lastBackupAt: Date.now() });
}

// ---- restoring --------------------------------------------------------------------

export interface RestoreSummary {
  restored: number;
  photos: number;
  /** Entries already here with the same or newer changes, left as they are. */
  kept: number;
}

const ID = /^[A-Za-z0-9_-]{8,64}$/;

function looksLikeEntry(x: unknown): x is Entry {
  const e = x as Partial<Entry> | null;
  return (
    !!e &&
    typeof e.id === "string" &&
    ID.test(e.id) &&
    typeof e.text === "string" &&
    (e.status === "draft" || e.status === "finished") &&
    typeof e.updatedAt === "number"
  );
}

/**
 * Puts a backup back. An entry is brought back only if it isn't here, or the
 * backup has newer changes to it; anything newer on this device is never overwritten.
 */
export async function restoreBackup(file: Blob): Promise<RestoreSummary> {
  let dir;
  try {
    dir = await readZipDirectory(file);
  } catch {
    throw new BackupError("That doesn't look like a Leaves backup.");
  }
  const dataFile = dir.get(DATA);
  if (!dataFile) {
    throw new BackupError("This ZIP has no data to restore. Backups made by older versions of Leaves can be read, but not restored.");
  }
  let data: BackupFile;
  try {
    data = JSON.parse(strFromU8(await readZipFile(file, dataFile))) as BackupFile;
  } catch {
    throw new BackupError("This backup is damaged and couldn't be read.");
  }
  if (data.app !== "leaves" || !Array.isArray(data.entries)) throw new BackupError("That doesn't look like a Leaves backup.");

  const summary: RestoreSummary = { restored: 0, photos: 0, kept: 0 };
  for (const raw of data.entries) {
    if (!looksLikeEntry(raw)) continue;
    const incoming = normalizeEntry(raw);
    const local = await getEntry(incoming.id);
    if (local && local.updatedAt >= incoming.updatedAt) {
      summary.kept++;
      continue;
    }
    // Pictures first, so an entry never points at something that isn't there.
    for (const key of blobKeysOf(incoming)) {
      if (await getBlob(key)) continue;
      const info = data.files?.[key];
      const inZip = info && typeof info.path === "string" ? dir.get(info.path) : undefined;
      if (!inZip) continue;
      const bytes = await readZipFile(file, inZip);
      await putBlob(key, new Blob([bytes as BlobPart], { type: info.type }), { silent: true });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { syncedAt, ...entry } = incoming;
    // Stamped as changed now, so that if there's an account it is backed up again.
    await putEntry(entry);
    await clearTombstone(entry.id);
    summary.restored++;
    summary.photos += entry.photos.length;
  }
  if (data.settings && (await getSettings()).updatedAt === 0) await saveSettings(data.settings);
  emit("blobs");
  return summary;
}
