import type { Entry, Photo } from "./types";

/** An entry as older versions stored it: one optional photo, no captions. */
interface LegacyPhoto {
  id?: string;
  url: string;
  thumbUrl: string;
  alt?: string;
  altEdited?: boolean;
  caption?: string;
  width?: number;
  height?: number;
}

type StoredEntry = Omit<Entry, "photos"> & { photos?: LegacyPhoto[]; photo?: LegacyPhoto | null };

function tidyPhoto(p: LegacyPhoto): Photo {
  return {
    // The blob key is already unique and stable, so it makes a good id for pictures saved before ids existed.
    id: p.id || p.url.replace(/^idb:/, ""),
    url: p.url,
    thumbUrl: p.thumbUrl,
    alt: p.alt ?? "",
    altEdited: p.altEdited,
    caption: p.caption ?? "",
    width: p.width,
    height: p.height,
  };
}

/**
 * Brings an entry from any earlier version up to the current shape. Safe to call
 * on an entry that is already current, and on entries arriving from the cloud.
 */
export function normalizeEntry(stored: Entry | StoredEntry): Entry {
  const { photo, photos, ...rest } = stored as StoredEntry;
  const list = Array.isArray(photos) ? photos : photo ? [photo] : [];
  return { ...rest, photos: list.map(tidyPhoto) } as Entry;
}

/** Every local blob an entry refers to: its photos and thumbnails, and its drawing. */
export function blobKeysOf(entry: Entry | undefined): string[] {
  if (!entry) return [];
  const refs = [
    ...(entry.photos ?? []).flatMap((p) => [p.url, p.thumbUrl]),
    entry.illustration?.url,
    entry.illustration?.thumbUrl,
  ];
  return [...new Set(refs.filter((u): u is string => !!u && u.startsWith("idb:")).map((u) => u.slice(4)))];
}

export function photoBlobKeys(photo: Photo): string[] {
  return [photo.url, photo.thumbUrl].filter((u) => u.startsWith("idb:")).map((u) => u.slice(4));
}
