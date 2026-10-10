import { describe, expect, it } from "vitest";
import { ALL_QUOTES } from "../../shared/quotes";
import { CARD_H, FONTS, FOOT, INNER, MARGIN, fit, planCard, wrap, type CardInput, type Measure } from "./cardLayout";

/** A stand-in for the real fonts: every letter is a little over half as wide as the type is tall. */
const measure: Measure = (font, text) => text.length * FONTS[font].size * 0.52;

const base: CardInput = { title: "A walk by the river", stamp: "October 10, 2026 at 5:49 AM", excerpt: "The light was low and golden.", caption: "", quote: "", source: "", hasPicture: true };

/** The height the plan uses, which must stay inside the card. */
function used(plan: ReturnType<typeof planCard>, input: CardInput) {
  const text =
    plan.title.length * FONTS.title.line + 16 +
    (input.stamp ? FONTS.stamp.line : 0) +
    (plan.excerpt.length ? 32 + plan.excerpt.length * FONTS.excerpt.line : 0) +
    (plan.quote.length ? 44 + plan.quote.length * FONTS[plan.quoteFont].line + (plan.source ? 8 + FONTS.source.line : 0) : 0);
  return MARGIN + text + (plan.caption.length ? 20 + plan.caption.length * FONTS.caption.line : 0) + (plan.imageSize ? plan.imageSize + 48 : 0);
}

describe("wrapping", () => {
  it("keeps every word and breaks only between them", () => {
    const lines = wrap(measure, "excerpt", "one two three four five six seven eight nine ten ".repeat(8), INNER);
    expect(lines.join(" ").split(" ").length).toBe(80);
    for (const l of lines) expect(measure("excerpt", l)).toBeLessThanOrEqual(INNER);
  });

  it("breaks a word too long for any line, such as a web address", () => {
    const lines = wrap(measure, "excerpt", "https://example.com/" + "a".repeat(200), INNER);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measure("excerpt", l)).toBeLessThanOrEqual(INNER);
  });

  it("ends a cut text in an ellipsis that still fits", () => {
    const { lines, cut } = fit(measure, "excerpt", "word ".repeat(300), INNER, 3);
    expect(cut).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
    expect(measure("excerpt", lines[2])).toBeLessThanOrEqual(INNER);
  });

  it("returns nothing for no room or no words", () => {
    expect(fit(measure, "excerpt", "hello", INNER, 0).lines).toEqual([]);
    expect(wrap(measure, "excerpt", "   ", INNER)).toEqual([]);
  });
});

describe("the card plan", () => {
  it("gives a short entry a big picture", () => {
    const plan = planCard(measure, base);
    expect(plan.imageSize).toBeGreaterThan(780);
    expect(plan.shortened).toBe(false);
    expect(used(plan, base)).toBeLessThanOrEqual(CARD_H - FOOT);
  });

  it("always fits on the card, however much there is to say", () => {
    const cases: Partial<CardInput>[] = [
      { title: "An extremely long title that keeps going and going well past the end of the second line, so it has to be shortened somewhere" },
      { excerpt: "A very long passage. ".repeat(80) },
      { caption: "A caption that goes on. ".repeat(20) },
      { quote: "“" + "A long, long thought. ".repeat(14) + "”", source: "Somebody With A Very Long Name, A Book With A Long Title: The Complete Edition" },
      { title: "Long ".repeat(40), excerpt: "Words ".repeat(300), caption: "Caption ".repeat(60), quote: "“" + "Quoted ".repeat(60) + "”", source: "Author, Source" },
    ];
    for (const extra of cases) {
      const input = { ...base, ...extra };
      const plan = planCard(measure, input);
      expect(used(plan, input), JSON.stringify(Object.keys(extra))).toBeLessThanOrEqual(CARD_H - FOOT);
      expect(plan.imageSize).toBeGreaterThan(0);
      const groups: [Parameters<Measure>[0], string[]][] = [["title", plan.title], ["excerpt", plan.excerpt], ["caption", plan.caption], [plan.quoteFont, plan.quote]];
      for (const [font, lines] of groups) for (const l of lines) expect(measure(font, l)).toBeLessThanOrEqual(INNER);
    }
  });

  it("shortens the writer's own words before the quotation or the title", () => {
    const input = { ...base, excerpt: "Words ".repeat(300), quote: "“A short thought.”", source: "Author, Source" };
    const plan = planCard(measure, input);
    expect(plan.shortened).toBe(true);
    expect(plan.quote).toEqual(["“A short thought.”"]);
    expect(plan.source).toBe("Author, Source");
    expect(plan.title).toHaveLength(1);
  });

  it("plans a card with no picture, no words and no quotation", () => {
    const input = { ...base, hasPicture: false, excerpt: "", quote: "" };
    const plan = planCard(measure, input);
    expect(plan.imageSize).toBe(0);
    expect(plan.excerpt).toEqual([]);
    expect(plan.quote).toEqual([]);
  });

  it("never cuts a quotation from the library", () => {
    for (const q of ALL_QUOTES) {
      const text = q.text;
      const quote = q.paraphrase ? text : `“${text}”`;
      const plan = planCard(measure, { ...base, quote, source: `${q.paraphrase ? "after " : ""}${q.author}` });
      expect(plan.quote.join(" ").replace(/\s+/g, " ").endsWith("…"), `${q.author}: ${text.slice(0, 40)}`).toBe(false);
      expect(plan.quote.join(" ")).toBe(quote);
    }
  });
});
