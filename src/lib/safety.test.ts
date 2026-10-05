// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { BackupError, buildBackup, restoreBackup } from "./backup";
import {
  allEntries,
  cancelBlobDeletion,
  db,
  emptyTrash,
  finishedEntries,
  getBlob,
  getEntry,
  putBlob,
  purgeEntry,
  purgeExpiredTrash,
  putEntry,
  queueBlobDeletion,
  restoreFromTrash,
  sweepBlobs,
  tombstones,
  trashEntry,
  trashedEntries,
  kvGet,
  wipeLocal,
} from "./db";
import { blobKeysOf, normalizeEntry } from "./entryShape";
import { beginIfNeeded, blankEntry, finishDraft, saveDraft } from "./entries";
import { readZipDirectory, readZipFile, ZipWriter } from "./zip";
import type { Entry, Photo } from "./types";

const DAY = 86_400_000;

beforeEach(async () => {
  await wipeLocal();
});

const bytes = (s: string) => new TextEncoder().encode(s);

/** A finished entry with `n` photos, each really stored. */
async function entryWithPhotos(text: string, captions: string[] = []): Promise<Entry> {
  const draft = await saveDraft(beginIfNeeded({ ...blankEntry(), text }));
  const photos: Photo[] = [];
  for (const [i, caption] of captions.entries()) {
    const id = `p${i}-${draft.id.slice(0, 6)}`;
    const key = `photo-${draft.id}-${id}`;
    await putBlob(key, new Blob([bytes(`full ${text} ${i}`)], { type: "image/jpeg" }), { silent: true });
    await putBlob(`${key}-thumb`, new Blob([bytes(`thumb ${i}`)], { type: "image/jpeg" }), { silent: true });
    photos.push({ id, url: `idb:${key}`, thumbUrl: `idb:${key}-thumb`, alt: "", caption, width: 400, height: 300 });
  }
  await putEntry({ ...draft, photos });
  return (await finishDraft(draft.id))!;
}

describe("entries from earlier versions", () => {
  it("are upgraded on the way out: the one photo becomes the first of a list, with an empty caption", async () => {
    const legacy = { ...blankEntry(), id: "legacy-entry-0001", status: "finished" as const, text: "From before captions." } as Record<string, unknown>;
    delete legacy.photos;
    legacy.photo = { url: "idb:photo-old", thumbUrl: "idb:photo-old-thumb", alt: "A lake", altEdited: true };
    await (await db()).put("entries", legacy as unknown as Entry);

    const entry = await getEntry("legacy-entry-0001");
    expect(entry?.photos).toHaveLength(1);
    expect(entry?.photos[0]).toMatchObject({ id: "photo-old", alt: "A lake", altEdited: true, caption: "" });
    expect("photo" in (entry as object)).toBe(false);
    expect(blobKeysOf(entry)).toEqual(["photo-old", "photo-old-thumb"]);
  });

  it("leaves an up-to-date entry as it is", () => {
    const e = { ...blankEntry(), photos: [{ id: "a", url: "idb:a", thumbUrl: "idb:a-t", alt: "x", caption: "c" }] };
    expect(normalizeEntry(e).photos).toEqual(e.photos.map((p) => ({ ...p, altEdited: undefined, width: undefined, height: undefined })));
  });
});

describe("deleting an entry", () => {
  it("moves it to Recently deleted, keeping every word and photo, and out of the entries list", async () => {
    const e = await entryWithPhotos("A day I may regret deleting.", ["the lake", "the dog"]);
    await trashEntry(e.id);

    expect((await finishedEntries()).map((x) => x.id)).not.toContain(e.id);
    const [gone] = await trashedEntries();
    expect(gone.id).toBe(e.id);
    expect(gone.text).toBe("A day I may regret deleting.");
    expect(gone.photos.map((p) => p.caption)).toEqual(["the lake", "the dog"]);
    for (const key of blobKeysOf(gone)) expect(await getBlob(key)).toBeDefined();
  });

  it("clears the share link on the device when it is deleted", async () => {
    const e = await entryWithPhotos("Shared once.");
    await putEntry({ ...e, share: { linkToken: "tok", published: true } });
    await trashEntry(e.id);
    expect((await getEntry(e.id))?.share).toEqual({ linkToken: null, published: false });
  });

  it("can be brought back whole", async () => {
    const e = await entryWithPhotos("Come back.", ["still here"]);
    await trashEntry(e.id);
    await restoreFromTrash(e.id);
    const back = (await finishedEntries()).find((x) => x.id === e.id);
    expect(back?.deletedAt).toBeFalsy();
    expect(back?.photos[0].caption).toBe("still here");
    expect(await trashedEntries()).toHaveLength(0);
  });

  it("is removed for good, with its photos, only when asked or after 30 days", async () => {
    const e = await entryWithPhotos("Gone.", ["x"]);
    const keys = blobKeysOf(e);
    await trashEntry(e.id);
    await purgeEntry(e.id);
    expect(await getEntry(e.id)).toBeUndefined();
    for (const key of keys) expect(await getBlob(key)).toBeUndefined();
    expect((await tombstones()).map((t) => t.id)).toContain(e.id);
  });

  it("keeps recent deletions and removes only the ones past their 30 days", async () => {
    const old = await entryWithPhotos("Old.");
    const recent = await entryWithPhotos("Recent.");
    const now = Date.now();
    await putEntry({ ...old, deletedAt: now - 31 * DAY });
    await putEntry({ ...recent, deletedAt: now - 2 * DAY });
    expect(await purgeExpiredTrash(now)).toBe(1);
    expect(await getEntry(old.id)).toBeUndefined();
    expect(await getEntry(recent.id)).toBeDefined();
  });

  it("can empty Recently deleted", async () => {
    for (const t of ["a", "b"]) await trashEntry((await entryWithPhotos(`Entry ${t}.`)).id);
    await emptyTrash();
    expect(await trashedEntries()).toHaveLength(0);
  });

  it("is never undone by a late autosave of the old draft text", async () => {
    const e = await entryWithPhotos("Final.");
    await trashEntry(e.id);
    await saveDraft({ ...e, status: "draft", text: "stale" });
    expect((await getEntry(e.id))?.text).toBe("Final.");
    expect((await getEntry(e.id))?.deletedAt).toBeTruthy();
  });
});

describe("taking a photo out of an entry", () => {
  it("keeps its file for a week, so it can be undone and a crash can't leave a broken page", async () => {
    await putBlob("photo-x", new Blob([bytes("img")]), { silent: true });
    const t0 = 1_000_000;
    await queueBlobDeletion(["photo-x"], t0);

    expect(await sweepBlobs({ now: t0 + 6 * DAY })).toEqual([]);
    expect(await getBlob("photo-x")).toBeDefined();

    expect(await sweepBlobs({ now: t0 + 8 * DAY })).toEqual(["photo-x"]);
    expect(await getBlob("photo-x")).toBeUndefined();
    expect(await kvGet<string[]>("remoteBlobRemovals")).toEqual(["photo-x"]);
  });

  it("is not removed after Undo", async () => {
    await putBlob("photo-y", new Blob([bytes("img")]), { silent: true });
    await queueBlobDeletion(["photo-y"], 0);
    await cancelBlobDeletion(["photo-y"]);
    expect(await sweepBlobs({ now: 30 * DAY })).toEqual([]);
    expect(await getBlob("photo-y")).toBeDefined();
  });

  it("is never removed while any entry, even a deleted one, still uses it", async () => {
    const e = await entryWithPhotos("Uses it.", ["keep me"]);
    const keys = blobKeysOf(e);
    await trashEntry(e.id);
    await queueBlobDeletion(keys, 0);
    expect(await sweepBlobs({ now: 30 * DAY })).toEqual([]);
    for (const key of keys) expect(await getBlob(key)).toBeDefined();
  });
});

describe("a backup file", () => {
  it("restores everything exactly: captions, order, drafts and Recently deleted included", async () => {
    const a = await entryWithPhotos("First day.", ["the lake", "the dog"]);
    const b = await entryWithPhotos("Second day.", ["snow"]);
    const draft = await saveDraft(beginIfNeeded({ ...blankEntry(), text: "Half a thought" }));
    await trashEntry(b.id);
    const before = (await allEntries()).sort((x, y) => x.id.localeCompare(y.id));
    const photoBytes = new Uint8Array(await (await getBlob(a.photos[1].url))!.arrayBuffer());

    const { blob, summary } = await buildBackup();
    expect(summary).toEqual({ entries: 2, photos: 2 }); // not counting the deleted one

    await wipeLocal();
    expect(await allEntries()).toHaveLength(0);

    const result = await restoreBackup(blob);
    expect(result).toMatchObject({ restored: 3, kept: 0 });

    const after = (await allEntries()).sort((x, y) => x.id.localeCompare(y.id));
    expect(after.map((e) => [e.id, e.status, e.text, !!e.deletedAt])).toEqual(before.map((e) => [e.id, e.status, e.text, !!e.deletedAt]));
    const restoredA = after.find((e) => e.id === a.id)!;
    expect(restoredA.photos.map((p) => p.caption)).toEqual(["the lake", "the dog"]);
    expect(new Uint8Array(await (await getBlob(restoredA.photos[1].url))!.arrayBuffer())).toEqual(photoBytes);
    expect(await getBlob(restoredA.photos[0].thumbUrl)).toBeDefined();
    expect(after.find((e) => e.id === draft.id)?.status).toBe("draft");
    // Restored entries are marked changed, so an account backs them up again.
    expect(after.every((e) => !e.syncedAt)).toBe(true);
  });

  it("never overwrites newer changes already on the device", async () => {
    const e = await entryWithPhotos("Version one.");
    const { blob } = await buildBackup();
    await putEntry({ ...(await getEntry(e.id))!, text: "Version two, written after the backup." });
    const result = await restoreBackup(blob);
    expect(result).toMatchObject({ restored: 0, kept: 1 });
    expect((await getEntry(e.id))?.text).toBe("Version two, written after the backup.");
  });

  it("also opens anywhere as plain files: Markdown with the caption beside its photo", async () => {
    await entryWithPhotos("A morning by the lake.", ["Low sun over the water"]);
    const { blob } = await buildBackup();
    const dir = await readZipDirectory(blob);
    const names = [...dir.keys()];
    expect(names).toEqual(expect.arrayContaining(["README.md", "reflections.md", "data/leaves.json"]));
    const md = names.find((n) => n.startsWith("entries/") && n.endsWith(".md"))!;
    const text = new TextDecoder().decode(await readZipFile(blob, dir.get(md)!));
    expect(text).toContain("A morning by the lake.");
    expect(text).toContain("*Low sun over the water*");
    expect(text).toMatch(/!\[.*\]\(\.\.\/photos\/.+\.jpg\)/);
    expect(names.some((n) => n.startsWith("photos/") && n.endsWith(".jpg"))).toBe(true);
  });

  it("is refused politely when it isn't a Leaves backup", async () => {
    await expect(restoreBackup(new Blob([bytes("not a zip at all")]))).rejects.toBeInstanceOf(BackupError);
    const zip = new ZipWriter();
    zip.text("hello.txt", "just a zip");
    await expect(restoreBackup(await zip.finish())).rejects.toBeInstanceOf(BackupError);
  });

  it("skips entries that are damaged instead of failing the whole restore", async () => {
    const good = await entryWithPhotos("Good page.");
    const { blob } = await buildBackup();
    const dir = await readZipDirectory(blob);
    const data = JSON.parse(new TextDecoder().decode(await readZipFile(blob, dir.get("data/leaves.json")!)));
    data.entries.push({ id: "../../evil", text: 5 }, null, "nonsense");
    const zip = new ZipWriter();
    zip.text("data/leaves.json", JSON.stringify(data));
    await wipeLocal();
    const result = await restoreBackup(await zip.finish());
    expect(result.restored).toBe(1);
    expect((await allEntries()).map((e) => e.id)).toEqual([good.id]);
  });
});
