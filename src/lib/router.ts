import { useSyncExternalStore } from "react";

/** A very small history router. Paths are plain strings like "/entry/abc". */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") window.addEventListener("popstate", notify);

export function navigate(path: string, opts: { replace?: boolean; state?: unknown } = {}) {
  if (path === location.pathname + location.search && !opts.state) return;
  if (opts.replace) history.replaceState(opts.state ?? null, "", path);
  else history.pushState(opts.state ?? null, "", path);
  notify();
}

export function back(fallback = "/") {
  if (history.state && (history.state as { fromApp?: boolean }).fromApp) history.back();
  else navigate(fallback, { replace: true });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => location.pathname, () => "/");
}

export function useRouteState<T>(): T | null {
  return useSyncExternalStore(subscribe, () => history.state as T | null, () => null);
}

/** Matches "/entry/:id" style patterns. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

/** Navigates inside the app and marks the history entry so Back can return. */
export function go(path: string, state: Record<string, unknown> = {}) {
  navigate(path, { state: { ...state, fromApp: true } });
}
