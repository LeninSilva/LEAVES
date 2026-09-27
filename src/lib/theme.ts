import { inWindow } from "./dates";
import type { Settings } from "./types";

export type ResolvedTheme = "daylight" | "lamplight";

export function prefersDark(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Automatic follows the phone. Warm evenings, when on, switches to Lamplight
 * inside its window unless Lamplight is already chosen.
 */
export function resolveTheme(s: Pick<Settings, "theme" | "warmEvenings" | "warmEveningsFrom" | "warmEveningsTo">, now = new Date(), systemDark = prefersDark()): ResolvedTheme {
  if (s.theme === "lamplight") return "lamplight";
  if (s.warmEvenings && inWindow(now, s.warmEveningsFrom, s.warmEveningsTo)) return "lamplight";
  if (s.theme === "daylight") return "daylight";
  return systemDark ? "lamplight" : "daylight";
}

const THEME_COLORS: Record<ResolvedTheme, string> = { daylight: "#eaf0e3", lamplight: "#1e2923" };

export function applyAppearance(s: Settings) {
  const root = document.documentElement;
  const theme = resolveTheme(s);
  root.dataset.theme = theme;
  root.dataset.textSize = s.textSize;
  root.dataset.writingFont = s.writingFont;
  root.dataset.reduceMotion = String(s.reduceMotion || prefersReducedMotion());
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    // Read by the inline script in index.html so the first paint has the right theme.
    localStorage.setItem("leaves.appearance", JSON.stringify({
      theme: s.theme,
      warmEvenings: s.warmEvenings,
      warmEveningsFrom: s.warmEveningsFrom,
      warmEveningsTo: s.warmEveningsTo,
      textSize: s.textSize,
      writingFont: s.writingFont,
      reduceMotion: s.reduceMotion,
    }));
  } catch {
    /* private mode */
  }
}

export function reducedMotion(): boolean {
  return document.documentElement.dataset.reduceMotion === "true";
}
