import { z } from "zod";

import { MOODS, MOTIFS, SEASONS, TIMES_OF_DAY } from "./constants";
import type { OpeningThought, OpeningThoughtRequest, ReflectRequest, ReflectionResult, IllustrateRequest } from "./constants";

export * from "./constants";

/** What the reflection model must return. Nullable fields are empty when crisis is true. */
export const ReflectionResultSchema = z.object({
  title: z.string().min(1).max(60),
  themes: z.array(z.string()).min(1).max(3),
  mood: z.enum(MOODS),
  motif: z.enum(MOTIFS),
  season: z.enum(SEASONS),
  timeOfDay: z.enum(TIMES_OF_DAY),
  scene: z.string().min(1).max(400),
  illustrationAlt: z.string().min(1).max(300),
  photoAlt: z.string().max(300).nullable(),
  quote: z.string().nullable(),
  author: z.string().nullable(),
  source: z.string().nullable(),
  isParaphrase: z.boolean(),
  bridge: z.string().min(1).max(600),
  crisis: z.boolean(),
});

export const ReflectRequestSchema = z.object({
  text: z.string().max(200_000),
  /** Small JPEG as base64, no data: prefix. */
  photo: z.string().max(2_000_000).nullable(),
  /** Human wording of when the entry was written, e.g. "Saturday, September 26, 9:42 PM". */
  when: z.string().max(80),
  recentVoices: z.array(z.string().max(120)).max(20),
  lovedVoices: z.array(z.string().max(120)).max(50),
  skippedVoices: z.array(z.string().max(120)).max(50),
  allowReligious: z.boolean(),
});

export const OpeningThoughtSchema = z.object({
  quote: z.string().min(1),
  author: z.string().min(1),
  source: z.string().nullable(),
  isParaphrase: z.boolean(),
});

export const OpeningThoughtRequestSchema = z.object({
  recentVoices: z.array(z.string().max(120)).max(20),
  lovedVoices: z.array(z.string().max(120)).max(50),
  skippedVoices: z.array(z.string().max(120)).max(50),
  allowReligious: z.boolean(),
});

export const IllustrateRequestSchema = z.object({
  scene: z.string().min(1).max(400),
  season: z.enum(SEASONS),
  timeOfDay: z.enum(TIMES_OF_DAY),
  mood: z.enum(MOODS),
});

// The plain interfaces in constants.ts and these schemas must agree.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const schemasMatchTypes: [
  Same<z.infer<typeof ReflectionResultSchema>, ReflectionResult>,
  Same<z.infer<typeof ReflectRequestSchema>, ReflectRequest>,
  Same<z.infer<typeof OpeningThoughtSchema>, OpeningThought>,
  Same<z.infer<typeof OpeningThoughtRequestSchema>, OpeningThoughtRequest>,
  Same<z.infer<typeof IllustrateRequestSchema>, IllustrateRequest>,
] = [true, true, true, true, true];

/** Words in a string, counted loosely across scripts. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const EM_DASH = /\s*[—―]\s*/g;

/**
 * Enforces the rules the model is asked to follow that can be checked in code.
 * Returns a list of problems; an empty list means the result is acceptable.
 */
export function checkReflection(
  r: ReflectionResult,
  ctx: { recentVoices: string[]; skippedVoices: string[] },
): string[] {
  const problems: string[] = [];
  if (r.crisis) return problems;
  if (!r.quote || !r.author) problems.push("quote and author are required when crisis is false");
  if (r.quote && wordCount(r.quote) >= 40) problems.push("quote must be under 40 words");
  const author = (r.author ?? "").toLowerCase();
  const same = (v: string) => {
    const a = v.trim().toLowerCase();
    return a.length > 0 && (author === a || author.includes(a) || a.includes(author));
  };
  if (author && ctx.skippedVoices.some(same)) problems.push("author is in skippedVoices");
  if (author && ctx.recentVoices.some(same)) problems.push("author is in recentVoices");
  const titleWords = wordCount(r.title);
  if (titleWords < 1 || titleWords > 6) problems.push("title must be 2 to 5 words");
  return problems;
}

/** Light clean-up for rules that are safe to fix rather than reject. */
export function tidyReflection(r: ReflectionResult): ReflectionResult {
  const tidy = (s: string) => s.replace(EM_DASH, ", ").replace(/!/g, ".").replace(/\.\.+/g, ".");
  return {
    ...r,
    title: sentenceCase(r.title.replace(/[.!]+$/, "").trim()),
    bridge: tidy(r.bridge),
    quote: r.quote ? r.quote.replace(EM_DASH, ", ").trim() : r.quote,
  };
}

export function sentenceCase(s: string): string {
  if (!s) return s;
  // Keep words that are all caps (acronyms) or capitalised mid-sentence (names) as they are.
  return s.charAt(0).toUpperCase() + s.slice(1);
}
