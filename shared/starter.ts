import { ALL_QUOTES } from "./quotes/index.js";
import type { Quote } from "./quotes/helper.js";
import type { Theme } from "./voices.js";

/**
 * The library of quotations. It supplies the thought on a blank page, the
 * reflection for entries kept from AI, and the fallback whenever AI is
 * unavailable. See shared/quotes/ for the lines and shared/voices.ts for who
 * said them. A line is quoted exactly only where its wording and translation
 * are certain; otherwise it is a plain paraphrase, shown as "after" its
 * author. Lines are only ever added at the end, because people's "already
 * seen" marks refer to them by position.
 */
export interface StarterLine {
  id: string;
  voice: string;
  quote: string;
  author: string;
  source: string;
  isParaphrase: boolean;
  religious: boolean;
  themes: readonly Theme[];
}

function toLine(q: Quote): StarterLine {
  return {
    id: q.id,
    voice: q.voice,
    quote: q.text,
    author: q.author,
    source: q.source,
    isParaphrase: q.paraphrase,
    religious: q.religious,
    themes: q.themes,
  };
}

export const STARTER_LIBRARY: readonly StarterLine[] = ALL_QUOTES.map(toLine);

export interface StarterPickOptions {
  /** Indices already used in the current round. */
  used: number[];
  allowReligious: boolean;
  skippedVoices: string[];
  /** Voices the person loves come up three times as often. */
  lovedVoices?: string[];
  /** What the entry is about. Lines on these themes are preferred when there are enough of them. */
  themes?: readonly Theme[];
}

const lower = (names: string[]) => names.map((v) => v.trim().toLowerCase()).filter(Boolean);

/**
 * Picks the next line without repeating one until every eligible line has been
 * used. Returns the pick and the updated list of used indices.
 */
export function pickStarter(
  opts: StarterPickOptions,
  random: () => number = Math.random,
): { line: StarterLine; index: number; used: number[] } {
  const skipped = lower(opts.skippedVoices);
  const loved = lower(opts.lovedVoices ?? []);
  const everything = STARTER_LIBRARY.map((line, index) => ({ line, index }));
  const eligible = everything.filter(
    ({ line }) => (opts.allowReligious || !line.religious) && !skipped.some((s) => line.author.toLowerCase().includes(s)),
  );
  // If every voice is skipped, fall back to the whole library rather than nothing.
  const pool = eligible.length > 0 ? eligible : everything;
  let used = opts.used.filter((i) => pool.some((p) => p.index === i));
  let fresh = pool.filter((p) => !used.includes(p.index));
  if (fresh.length === 0) {
    used = [];
    fresh = pool;
  }
  let candidates = fresh;
  if (opts.themes?.length) {
    const wanted = new Set<string>(opts.themes);
    const matching = fresh.filter(({ line }) => line.themes.some((t) => wanted.has(t)));
    if (matching.length >= 3) candidates = matching;
  }
  const weighted = candidates.flatMap((c) => (loved.some((l) => c.line.author.toLowerCase().includes(l)) ? [c, c, c] : [c]));
  const choice = weighted[Math.floor(random() * weighted.length)];
  return { line: choice.line, index: choice.index, used: [...used, choice.index] };
}
