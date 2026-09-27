import type {
  IllustrateRequest,
  IllustrateResponse,
  OpeningThought,
  OpeningThoughtRequest,
  PlaceResponse,
  ReflectRequest,
  ReflectionResult,
  ServerConfig,
} from "../../shared/constants";
import { accessToken } from "./auth";

/**
 * Talks to the Leaves server. Keys for AI services live only on the server;
 * the browser sends one entry at a time and never logs it.
 */

export class OfflineError extends Error {
  constructor() {
    super("offline");
  }
}

async function call<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new OfflineError();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 30_000);
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  const token = await accessToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  try {
    const res = await fetch(path, { ...init, headers, signal: controller.signal });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new OfflineError();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

let configPromise: Promise<ServerConfig | null> | null = null;

/** What the server can do. Null when there is no server (the app still works fully). */
export function serverConfig(): Promise<ServerConfig | null> {
  if (!configPromise) {
    configPromise = call<ServerConfig>("/api/config", { timeoutMs: 8000 }).catch((err) => {
      if (err instanceof OfflineError) {
        configPromise = null;
        throw err;
      }
      // No server answered: work without AI for now and ask again in a minute.
      setTimeout(() => (configPromise = null), 60_000);
      return null;
    });
  }
  return configPromise;
}

/** The server validates every result against the schema before it answers. */
export function requestReflection(req: ReflectRequest): Promise<ReflectionResult> {
  return call<ReflectionResult>("/api/reflect", {
    method: "POST",
    body: JSON.stringify(req),
    timeoutMs: 120_000,
  });
}

export function requestOpeningThought(req: OpeningThoughtRequest): Promise<OpeningThought> {
  return call<OpeningThought>("/api/opening-thought", {
    method: "POST",
    body: JSON.stringify(req),
    timeoutMs: 60_000,
  });
}

export function requestIllustration(req: IllustrateRequest): Promise<IllustrateResponse> {
  return call<IllustrateResponse>("/api/illustrate", {
    method: "POST",
    body: JSON.stringify(req),
    timeoutMs: 180_000,
  });
}

/** Coarse place name. Coordinates are rounded before they leave the device and never stored. */
export function requestPlaceName(lat: number, lon: number): Promise<PlaceResponse> {
  const r = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
  return call<PlaceResponse>(`/api/place?lat=${r(lat)}&lon=${r(lon)}`, { timeoutMs: 12_000 });
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return call<T>(path, { method: "POST", body: JSON.stringify(body) });
}
