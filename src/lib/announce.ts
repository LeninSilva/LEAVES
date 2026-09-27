/**
 * Polite live-region announcements for background results. Messages are queued
 * and spaced out so a quick second message never cuts off the first.
 */
let region: HTMLElement | null = null;
const queue: string[] = [];
let busy = false;
const GAP_MS = 1800;

export function mountAnnouncer() {
  if (region || typeof document === "undefined") return;
  region = document.createElement("div");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("role", "status");
  region.className = "visually-hidden";
  document.body.appendChild(region);
}

function next() {
  const message = queue.shift();
  if (message === undefined || !region) {
    busy = false;
    return;
  }
  busy = true;
  region.textContent = "";
  window.setTimeout(() => {
    if (region) region.textContent = message;
    window.setTimeout(next, GAP_MS);
  }, 100);
}

export function announce(message: string) {
  mountAnnouncer();
  queue.push(message);
  if (!busy) next();
}
