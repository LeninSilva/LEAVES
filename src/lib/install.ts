import { useSyncExternalStore } from "react";

/**
 * Putting Leaves on a home screen. Chrome and Edge let a page offer the install
 * itself, once they decide the app qualifies; the browser's offer is caught here
 * and held until the person asks. iPhones have no such offer, so they are shown
 * the two taps instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** Already running from the home screen. */
  installed: boolean;
  /** The browser has offered an install that a button can start. */
  canPrompt: boolean;
  ios: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function read(): InstallState {
  if (typeof window === "undefined") return { installed: false, canPrompt: false, ios: false };
  const installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return { installed, canPrompt: deferred !== null, ios };
}

let state = read();

function update() {
  const next = read();
  if (next.installed === state.installed && next.canPrompt === state.canPrompt && next.ios === state.ios) return;
  state = next;
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    update();
  });
  matchMedia("(display-mode: standalone)").addEventListener?.("change", update);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Starts the browser's own install. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  const offer = deferred;
  if (!offer) return false;
  deferred = null;
  update();
  await offer.prompt();
  const choice = await offer.userChoice;
  return choice.outcome === "accepted";
}
