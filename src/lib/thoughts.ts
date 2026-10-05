import { STARTER_LIBRARY, pickStarter, type StarterLine } from "../../shared/starter";
import { getMeta, getSettings, saveMeta } from "./db";

/**
 * The thought on a blank page. It stays the same while the app is used for a few
 * minutes, and is a new one each time the app is opened after that. Lines are
 * drawn from the whole library without repeating until every one has been seen.
 */
export const THOUGHT_LIFETIME_MS = 10 * 60_000;

let inFlight: Promise<StarterLine> | null = null;

async function choose(fresh: boolean, now: number): Promise<StarterLine> {
  const [settings, meta] = await Promise.all([getSettings(), getMeta()]);
  const held = meta.openingThought;
  if (!fresh && held && now - held.shownAt < THOUGHT_LIFETIME_MS && STARTER_LIBRARY[held.index]) {
    return STARTER_LIBRARY[held.index];
  }
  const pick = pickStarter({
    used: meta.starterUsed,
    allowReligious: settings.allowReligious,
    skippedVoices: settings.skippedVoices,
    lovedVoices: settings.lovedVoices,
  });
  await saveMeta({ starterUsed: pick.used, openingThought: { index: pick.index, shownAt: now } });
  return pick.line;
}

/** The thought for the blank page. Pass fresh to turn to another one at once. */
export function openingThought(opts: { fresh?: boolean; now?: number } = {}): Promise<StarterLine> {
  if (opts.fresh) return choose(true, opts.now ?? Date.now());
  inFlight ??= choose(false, opts.now ?? Date.now()).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Puts a chosen line on the blank page, for "Write about this" in the library. */
export async function setOpeningThought(id: string) {
  const index = STARTER_LIBRARY.findIndex((l) => l.id === id);
  if (index < 0) return;
  const meta = await getMeta();
  await saveMeta({
    openingThought: { index, shownAt: Date.now() },
    starterUsed: meta.starterUsed.includes(index) ? meta.starterUsed : [...meta.starterUsed, index],
  });
}

/** After Finish: this thought has done its work, so the next blank page gets a new one. */
export async function retireOpeningThought() {
  await saveMeta({ openingThought: null });
}
