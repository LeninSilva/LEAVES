import { useEffect, useState } from "react";
import { allEntries } from "./db";

/**
 * Browsers may clear a site's storage when a device runs low on space, unless the
 * site has been granted "persistent" storage. Installed apps usually are; this
 * asks for it and says plainly where things stand.
 */

export interface StorageReport {
  /** True once the browser has promised not to clear the notebook. Null where it can't say. */
  protectedStorage: boolean | null;
  usedBytes: number | null;
  availableBytes: number | null;
  entries: number;
  photos: number;
  drafts: number;
  deleted: number;
}

export async function isStorageProtected(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    return null;
  }
}

/** Asks the browser to keep this notebook. Safe to call again; resolves with the answer. */
export async function protectStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageReport(): Promise<StorageReport> {
  const [protectedStorage, estimate, entries] = await Promise.all([
    isStorageProtected(),
    navigator.storage?.estimate?.().catch(() => undefined),
    allEntries(),
  ]);
  const live = entries.filter((e) => !e.deletedAt);
  return {
    protectedStorage,
    usedBytes: estimate?.usage ?? null,
    availableBytes: estimate?.quota != null && estimate.usage != null ? Math.max(0, estimate.quota - estimate.usage) : null,
    entries: live.filter((e) => e.status === "finished").length,
    drafts: live.filter((e) => e.status === "draft").length,
    deleted: entries.length - live.length,
    photos: live.reduce((n, e) => n + e.photos.length, 0),
  };
}

export function useStorageReport(refresh: unknown = 0): StorageReport | null {
  const [report, setReport] = useState<StorageReport | null>(null);
  useEffect(() => {
    let alive = true;
    storageReport().then((r) => alive && setReport(r), () => undefined);
    return () => {
      alive = false;
    };
  }, [refresh]);
  return report;
}

/** "48 MB" or "1.2 GB", in plain words. */
export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
