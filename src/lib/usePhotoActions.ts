import { useCallback, useRef, useState } from "react";
import { showToast } from "../components/Toast";
import { cancelBlobDeletion, queueBlobDeletion, updateEntry } from "./db";
import { photoBlobKeys } from "./entryShape";
import { MAX_PHOTOS, StorageFullError, beginIfNeeded, movedPhoto, storePhoto, withPhoto } from "./entries";
import type { Entry, Photo } from "./types";

export const FULL_MESSAGE =
  "This device is out of room for photos. Make some space, or back up and remove older ones, then try again.";

export interface PhotoActions {
  add(files: File[]): Promise<void>;
  caption(id: string, caption: string): void;
  describe(id: string, alt: string): void;
  move(id: string, by: -1 | 1): void;
  remove(id: string): void;
  adding: { done: number; total: number } | null;
  error: string | null;
}

interface Options {
  entryId: string;
  /** The entry as the screen holds it right now. */
  current: () => Entry | null;
  /** Applies a change to that entry and saves it. */
  apply: (change: (e: Entry) => Entry, opts?: { immediate?: boolean }) => void;
}

function insertAt(photos: Photo[], photo: Photo, index: number): Photo[] {
  const next = photos.filter((p) => p.id !== photo.id);
  next.splice(Math.min(index, next.length), 0, photo);
  return next;
}

/**
 * Everything a page can do with its pictures. Each change is applied to the
 * entry as it is at that moment, never to a copy taken earlier, so words typed
 * while a photo is still being processed can't be overwritten. If the page has
 * been left or finished in the meantime, the stored entry is changed instead.
 */
export function usePhotoActions(options: Options): PhotoActions {
  const [adding, setAdding] = useState<PhotoActions["adding"]>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const { entryId } = options;

  const applyTo = useCallback(
    (change: (e: Entry) => Entry, opts?: { immediate?: boolean }) => {
      const { current, apply } = latest.current;
      const cur = current();
      if (cur && cur.id === entryId) apply(change, opts);
      else void updateEntry(entryId, change);
    },
    [entryId],
  );

  const add = useCallback(
    async (files: File[]) => {
      setError(null);
      const have = latest.current.current()?.photos.length ?? 0;
      const batch = files.slice(0, Math.max(0, MAX_PHOTOS - have));
      if (batch.length < files.length) setError(`A page holds up to ${MAX_PHOTOS} photos.`);
      let failed = 0;
      for (let i = 0; i < batch.length; i++) {
        setAdding({ done: i, total: batch.length });
        try {
          const photo = await storePhoto(entryId, batch[i]);
          applyTo((e) => ({ ...beginIfNeeded(e), photos: [...e.photos, photo] }), { immediate: true });
        } catch (err) {
          if (err instanceof StorageFullError) {
            setError(FULL_MESSAGE);
            failed = 0;
            break;
          }
          failed++;
        }
      }
      setAdding(null);
      if (failed) {
        setError(failed === 1 ? "Couldn't open that photo. Try a JPEG, PNG or HEIC." : `Couldn't open ${failed} of those photos. Try JPEG, PNG or HEIC.`);
      }
    },
    [applyTo, entryId],
  );

  const caption = useCallback(
    (id: string, text: string) => applyTo((e) => ({ ...e, photos: withPhoto(e.photos, id, { caption: text }) })),
    [applyTo],
  );

  const describe = useCallback(
    (id: string, alt: string) =>
      applyTo((e) => ({ ...e, photos: withPhoto(e.photos, id, { alt, altEdited: alt.length > 0 }) }), { immediate: true }),
    [applyTo],
  );

  const move = useCallback(
    (id: string, by: -1 | 1) => applyTo((e) => ({ ...e, photos: movedPhoto(e.photos, id, by) }), { immediate: true }),
    [applyTo],
  );

  const remove = useCallback(
    (id: string) => {
      const entry = latest.current.current();
      const index = entry?.photos.findIndex((p) => p.id === id) ?? -1;
      const photo = index >= 0 ? entry!.photos[index] : undefined;
      if (!photo) return;
      const keys = photoBlobKeys(photo);
      applyTo((e) => ({ ...e, photos: e.photos.filter((p) => p.id !== id) }), { immediate: true });
      // The picture's file stays for a week, so this can be undone and a crash can't leave a broken page.
      void queueBlobDeletion(keys);
      showToast(
        "Photo removed.",
        {
          label: "Undo",
          run: () => {
            void cancelBlobDeletion(keys);
            applyTo((e) => ({ ...e, photos: insertAt(e.photos, photo, index) }), { immediate: true });
          },
        },
        8000,
      );
    },
    [applyTo],
  );

  return { add, caption, describe, move, remove, adding, error };
}
