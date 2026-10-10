/**
 * Where everything goes on a share card. It knows nothing about canvases: it is given a way to
 * measure text, so the same plan can be tested with plain numbers and drawn with the real fonts.
 */

export const CARD_W = 1080;
export const CARD_H = 1350;
export const MARGIN = 96;
export const INNER = CARD_W - MARGIN * 2;
/** The strip of grass along the bottom edge sits inside this much space. */
export const FOOT = 72;

export type FontKey = "title" | "stamp" | "excerpt" | "caption" | "quote" | "quoteSmall" | "source";

/** Font shorthand, size and line height for each kind of text on the card. */
export const FONTS: Record<FontKey, { css: string; size: number; line: number }> = {
  title: { css: '600 56px "Literata", Georgia, serif', size: 56, line: 68 },
  stamp: { css: '600 28px "Nunito", system-ui, sans-serif', size: 28, line: 40 },
  excerpt: { css: '400 34px "Literata", Georgia, serif', size: 34, line: 52 },
  caption: { css: 'italic 400 28px "Literata", Georgia, serif', size: 28, line: 40 },
  quote: { css: 'italic 400 30px "Literata", Georgia, serif', size: 30, line: 44 },
  quoteSmall: { css: 'italic 400 25px "Literata", Georgia, serif', size: 25, line: 36 },
  source: { css: '600 24px "Nunito", system-ui, sans-serif', size: 24, line: 32 },
};

export type Measure = (font: FontKey, text: string) => number;

export interface CardInput {
  title: string;
  stamp: string;
  /** The words the writer chose to show. */
  excerpt: string;
  /** A photo's caption, when the card shows a photo. */
  caption: string;
  /** The quotation as it should read, with its quotation marks if it has them. */
  quote: string;
  /** "after Author, Source" */
  source: string;
  hasPicture: boolean;
}

export interface CardPlan {
  imageSize: number;
  title: string[];
  caption: string[];
  excerpt: string[];
  quote: string[];
  quoteFont: "quote" | "quoteSmall";
  source: string;
  /** True when the writer's own words had to be shortened to fit. */
  shortened: boolean;
}

/** Breaks one over-long word (a web address, say) into pieces that fit the line. */
function breakWord(measure: Measure, font: FontKey, word: string, width: number): string[] {
  const out: string[] = [];
  let piece = "";
  for (const ch of word) {
    if (piece && measure(font, piece + ch) > width) {
      out.push(piece);
      piece = ch;
    } else piece += ch;
  }
  if (piece) out.push(piece);
  return out;
}

/** Every line the text takes at this width, paragraphs kept apart. */
export function wrap(measure: Measure, font: FontKey, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const raw of para.split(/\s+/).filter(Boolean)) {
      for (const word of measure(font, raw) > width ? breakWord(measure, font, raw, width) : [raw]) {
        const next = line ? `${line} ${word}` : word;
        if (line && measure(font, next) > width) {
          lines.push(line);
          line = word;
        } else line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** At most `max` lines; if the text is longer, the last line ends in an ellipsis that fits. */
export function fit(measure: Measure, font: FontKey, text: string, width: number, max: number): { lines: string[]; cut: boolean } {
  if (max <= 0) return { lines: [], cut: text.trim().length > 0 };
  const all = wrap(measure, font, text, width);
  if (all.length <= max) return { lines: all, cut: false };
  const lines = all.slice(0, max);
  let last = lines[max - 1].replace(/[\s,.;:!?-]+$/, "");
  while (last && measure(font, `${last}…`) > width) last = last.slice(0, last.lastIndexOf(" ") > 0 ? last.lastIndexOf(" ") : -1);
  lines[max - 1] = `${last}…`;
  return { lines, cut: true };
}

const heightOf = (font: FontKey, n: number) => n * FONTS[font].line;

/**
 * Chooses how many lines each part gets, then how big the picture can be. When there is too much
 * to say, the writer's words shrink first, then the caption; the title and the quotation stay whole
 * (the quotation is set a little smaller before it is ever shortened).
 */
export function planCard(measure: Measure, input: CardInput): CardPlan {
  const minPicture = input.hasPicture ? 420 : 0;
  const quoteCandidates: { font: "quote" | "quoteSmall"; max: number }[] = [
    { font: "quote", max: 4 },
    { font: "quoteSmall", max: 6 },
  ];
  const quote = input.quote.trim()
    ? (quoteCandidates.map((c) => ({ ...c, ...fit(measure, c.font, input.quote.trim(), INNER, c.max) })).find((c) => !c.cut) ??
      (() => {
        const last = quoteCandidates[1];
        return { ...last, ...fit(measure, last.font, input.quote.trim(), INNER, last.max) };
      })())
    : { font: "quote" as const, lines: [] as string[], cut: false, max: 0 };
  const title = fit(measure, "title", input.title.trim(), INNER, 2).lines;
  const source = input.source.trim() ? fit(measure, "source", input.source.trim(), INNER, 1).lines[0] : "";

  const room = CARD_H - MARGIN - FOOT;
  let plan: CardPlan | null = null;
  const stampH = input.stamp ? FONTS.stamp.line : 0;
  for (const captionMax of [2, 1, 0]) {
    for (const excerptMax of [5, 4, 3, 2, 1, 0]) {
      const caption = input.hasPicture ? fit(measure, "caption", input.caption.trim().replace(/\s+/g, " "), INNER, captionMax) : { lines: [] as string[], cut: false };
      const excerpt = fit(measure, "excerpt", input.excerpt.trim(), INNER, excerptMax);
      const text =
        (title.length ? heightOf("title", title.length) + 16 : 0) +
        stampH +
        (excerpt.lines.length ? 32 + heightOf("excerpt", excerpt.lines.length) : 0) +
        (quote.lines.length ? 44 + heightOf(quote.font, quote.lines.length) + (source ? 8 + FONTS.source.line : 0) : 0);
      const captionH = caption.lines.length ? 20 + heightOf("caption", caption.lines.length) : 0;
      const spent = MARGIN + text + captionH + (input.hasPicture ? 48 : 0);
      const imageSize = input.hasPicture ? Math.min(INNER, room - spent) : 0;
      plan = {
        imageSize,
        title,
        caption: caption.lines,
        excerpt: excerpt.lines,
        quote: quote.lines,
        quoteFont: quote.font,
        source,
        shortened: excerpt.cut || caption.cut,
      };
      if (imageSize >= minPicture) return plan;
    }
  }
  // Everything is already as short as it goes; give the picture whatever room remains.
  return { ...plan!, imageSize: Math.max(0, plan!.imageSize) };
}
