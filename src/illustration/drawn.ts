import type { ArtSpec, Mood, Motif, Season, TimeOfDay } from "../../shared/constants";
import { MOTIFS } from "../../shared/constants";
import { pick, seeded } from "../lib/rng";
import { describeArt, drawArt } from "./art";
import { sceneFromMotif } from "./understand";

/**
 * The drawn illustration for an entry: an original vector picture composed
 * from its scene (see art.ts). Entries from before scenes existed are drawn
 * from their motif.
 */

export interface DrawOptions {
  seed: string;
  art?: ArtSpec | null;
  motif?: Motif | null;
  mood?: Mood | null;
  season?: Season | null;
  timeOfDay?: TimeOfDay | null;
}

export function drawIllustration(o: DrawOptions): string {
  const art = o.art ?? sceneFromMotif(o.motif ?? motifFor(o.seed));
  return drawArt({ seed: o.seed, art, mood: o.mood, season: o.season, timeOfDay: o.timeOfDay });
}

export function drawnAlt(o: { art?: ArtSpec | null; motif?: Motif | null; timeOfDay?: TimeOfDay | null }): string {
  if (o.art) return describeArt(o.art, o.timeOfDay);
  return `A hand-drawn picture of ${o.motif ?? "a single tree"}.`;
}

/** Picks a motif for entries without one, seeded by the entry id. */
export function motifFor(seed: string): Motif {
  return pick(seeded(seed + ":motif"), MOTIFS);
}

/** The closest classic motif for a scene, kept on each entry for older exports and the share card. */
export function motifForArt(art: ArtSpec): Motif {
  const m: Partial<Record<ArtSpec["subject"], Motif>> = {
    tree: "a single tree",
    sapling: "a seedling",
    flowers: "a seedling",
    birds: "two birds on a branch",
    boat: "a small boat on still water",
    "paper boat": "a small boat on still water",
    path: "a path through tall grass",
    moon: "a moon over a field",
    house: "a lit window at dusk",
    lantern: "a lit window at dusk",
    candle: "a lit window at dusk",
    door: "a lit window at dusk",
    bench: "a bench under a tree",
    teacup: "a teacup by a window",
    "open book": "a teacup by a window",
    letter: "a teacup by a window",
    bridge: "a bridge over a stream",
    umbrella: "rain on a pond",
  };
  return m[art.subject] ?? (art.accents.includes("falling leaves") ? "falling leaves" : "a single tree");
}
