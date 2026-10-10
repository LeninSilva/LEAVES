import { useSyncExternalStore } from "react";
import type { ResolvedTheme } from "./theme";

/** The ten leaf shapes, one for each mood color, as drawn in public/art/leaves. */
export const LEAF_FILES = [
  "01-simple-calm",
  "02-birch-joyful",
  "03-oak-tender",
  "04-maple-grateful",
  "05-ginkgo-hopeful",
  "06-simple-curious",
  "07-birch-wistful",
  "08-oak-restless",
  "09-maple-tired",
  "10-ginkgo-heavy",
] as const;

export const leafUrl = (theme: ResolvedTheme, index: number) => `/art/leaves/${theme}/${LEAF_FILES[index % LEAF_FILES.length]}.svg`;

function currentTheme(): ResolvedTheme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "lamplight" ? "lamplight" : "daylight";
}

function subscribe(fn: () => void) {
  const observer = new MutationObserver(fn);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme in use right now, following changes at once (a warm evening, or a choice in Settings). */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, currentTheme, () => "daylight");
}
