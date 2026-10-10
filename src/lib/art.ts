import { useSyncExternalStore } from "react";
import type { ArtSpec, Subject } from "../../shared/constants";
import { sceneFromMotif } from "../illustration/understand";
import { useSettings } from "./store";
import type { ResolvedTheme } from "./theme";
import type { Entry, IllustrationStyle } from "./types";

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

// ---- the picture for an entry ------------------------------------------------------

/** The file name of a subject in public/art: "paper boat" is paper-boat. */
export const subjectSlug = (subject: Subject) => subject.replace(/ /g, "-");

/**
 * What the entry's picture shows. The scene chosen after Finish names it; older entries
 * only have a motif, and an entry with neither is still being read (null).
 */
export function entrySubject(e: Pick<Entry, "art" | "motif">): Subject | null {
  const art: Pick<ArtSpec, "subject"> | null = e.art ?? (e.motif ? sceneFromMotif(e.motif) : null);
  return art?.subject ?? null;
}

/** Quiet pictures are SVG; Storybook ones are WebP at 256 for lists and 512 for the entry itself. */
export function entryArtUrl(style: Exclude<IllustrationStyle, "drawn">, theme: ResolvedTheme, subject: Subject, size: "thumb" | "large"): string {
  const slug = subjectSlug(subject);
  return style === "quiet" ? `/art/entries-simple/${theme}/${slug}.svg` : `/art/entries/${theme}/${slug}-${size === "thumb" ? 256 : 512}.webp`;
}

const SUBJECT_WORDS: Record<Subject, string> = {
  tree: "a tree",
  sapling: "a young sapling",
  flowers: "flowers",
  birds: "birds",
  nest: "a nest",
  fox: "a sleeping fox",
  boat: "a boat on the water",
  "paper boat": "a paper boat",
  lighthouse: "a lighthouse",
  bridge: "a bridge",
  path: "a path",
  mountain: "a mountain",
  moon: "the moon",
  kite: "a kite",
  stones: "a stack of stones",
  house: "a house with a lit window",
  door: "a door",
  bench: "a bench",
  lantern: "a lantern",
  candle: "a candle",
  teacup: "a cup of tea",
  "open book": "an open book",
  letter: "a letter",
  umbrella: "an umbrella",
};

export function subjectAlt(subject: Subject, style: Exclude<IllustrationStyle, "drawn">): string {
  return `${style === "quiet" ? "A simple drawing" : "A painted scene"} of ${SUBJECT_WORDS[subject]}.`;
}

/** The chosen style, once settings have loaded; Quiet is the default for everyone. */
export function useIllustrationStyle(): IllustrationStyle | null {
  const [settings, ready] = useSettings();
  return ready ? settings.illustrationStyle : null;
}

/**
 * Asks for the Storybook pictures of the subjects this person's entries use, in both themes,
 * so the service worker keeps them for offline use. Quiet pictures are kept from the start.
 */
export async function warmStorybook(subjects?: Subject[]): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  const list = subjects ?? (await usedSubjects());
  for (const theme of ["daylight", "lamplight"] as const) {
    for (const subject of list) {
      for (const size of ["thumb", "large"] as const) {
        try {
          await fetch(entryArtUrl("storybook", theme, subject, size));
        } catch {
          return;
        }
      }
    }
  }
}

async function usedSubjects(): Promise<Subject[]> {
  const { finishedEntries } = await import("./db");
  const found = new Set<Subject>();
  for (const e of await finishedEntries()) {
    const s = entrySubject(e);
    if (s) found.add(s);
  }
  return [...found];
}
