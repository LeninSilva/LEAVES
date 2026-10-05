import { VOICES, type Theme } from "../voices.js";

export interface Quote {
  id: string;
  voice: string;
  /** The voice's name as it appears under the quotation. */
  author: string;
  text: string;
  /** The work it comes from, with the translator and year where there is one. */
  source: string;
  themes: Theme[];
  /** Shown without quotation marks, as "after" its author. */
  paraphrase: boolean;
  religious: boolean;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * One quotation. A line is quoted exactly only where its wording, and the
 * translation it is taken from, are certain. Anything else is marked as a
 * paraphrase, which the app shows as "after" its author.
 */
export function quote(
  voice: string,
  text: string,
  source: string,
  themes: Theme[],
  opts: { paraphrase?: boolean; religious?: boolean } = {},
): Quote {
  const who = VOICES[voice];
  if (!who) throw new Error(`Unknown voice "${voice}"`);
  const words = slug(text).split("-").slice(0, 6).join("-");
  return {
    id: `${voice}-${words}`,
    voice,
    author: who.name,
    text,
    source,
    themes,
    paraphrase: !!opts.paraphrase,
    religious: opts.religious ?? !!who.religious,
  };
}

/** The same quotation, marked as a paraphrase. */
export const after = { paraphrase: true } as const;
