import { useEffect, useState } from "react";
import {
  draftEntries,
  finishedEntries,
  getBlob,
  getEntry,
  getMeta,
  getSettings,
  subscribe,
} from "./db";
import { fetchRemoteBlob } from "./sync";
import { DEFAULT_META, DEFAULT_SETTINGS, type Entry, type Meta, type Settings } from "./types";

function useLive<T>(topic: "entries" | "settings" | "meta" | "blobs", load: () => Promise<T>, initial: T, deps: unknown[] = []) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const run = () =>
      load().then((v) => {
        if (alive) {
          setValue(v);
          setReady(true);
        }
      });
    run();
    const off = subscribe(topic, run);
    return () => {
      alive = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [value, ready] as const;
}

export function useEntries() {
  return useLive<Entry[]>("entries", finishedEntries, []);
}

export function useDrafts() {
  return useLive<Entry[]>("entries", draftEntries, []);
}

export function useEntry(id: string | null | undefined) {
  return useLive<Entry | undefined>("entries", () => (id ? getEntry(id) : Promise.resolve(undefined)), undefined, [id]);
}

export function useSettings() {
  return useLive<Settings>("settings", getSettings, DEFAULT_SETTINGS);
}

export function useMeta() {
  return useLive<Meta>("meta", getMeta, DEFAULT_META);
}

const urlCache = new Map<string, string>();

/** Resolves an "idb:" reference to an object URL, downloading from the cloud if needed. */
export function useBlobUrl(ref: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(ref ? urlCache.get(ref) ?? null : null);
  useEffect(() => {
    if (!ref) {
      setUrl(null);
      return;
    }
    if (!ref.startsWith("idb:")) {
      setUrl(ref);
      return;
    }
    let alive = true;
    const load = async () => {
      const cached = urlCache.get(ref);
      if (cached) {
        setUrl(cached);
        return;
      }
      let blob = await getBlob(ref);
      if (!blob) {
        blob = (await fetchRemoteBlob(ref)) ?? undefined;
      }
      if (!alive || !blob) return;
      const u = URL.createObjectURL(blob);
      urlCache.set(ref, u);
      setUrl(u);
    };
    load();
    const off = subscribe("blobs", () => {
      if (!urlCache.has(ref)) load();
    });
    return () => {
      alive = false;
      off();
    };
  }, [ref]);
  return url;
}

/** Forget a cached object URL when its blob is replaced. */
export function dropBlobUrl(ref: string | null | undefined) {
  if (!ref) return;
  const u = urlCache.get(ref);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(ref);
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
