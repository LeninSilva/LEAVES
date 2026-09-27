import { describe, expect, it } from "vitest";
import { ReflectionResultSchema, checkReflection, tidyReflection, type ReflectionResult } from "./schema";

const base: ReflectionResult = {
  title: "Gold on the river",
  themes: ["light", "family"],
  mood: "tender",
  motif: "a small boat on still water",
  season: "autumn",
  timeOfDay: "evening",
  scene: "A small boat resting on a gold river at dusk.",
  illustrationAlt: "A small boat on a golden river.",
  photoAlt: null,
  quote: "Heaven is under our feet as well as over our heads.",
  author: "Henry David Thoreau",
  source: "Walden (1854)",
  isParaphrase: false,
  bridge: "You stayed by the water longer than you meant to — and the light held you!",
  crisis: false,
};

describe("reflection checks", () => {
  it("accepts a good result", () => {
    expect(ReflectionResultSchema.parse(base)).toBeTruthy();
    expect(checkReflection(base, { recentVoices: [], skippedVoices: [] })).toEqual([]);
  });
  it("rejects recent and skipped voices", () => {
    expect(checkReflection(base, { recentVoices: ["Thoreau"], skippedVoices: [] })).toContain("author is in recentVoices");
    expect(checkReflection(base, { recentVoices: [], skippedVoices: ["henry david thoreau"] })).toContain("author is in skippedVoices");
  });
  it("rejects quotes of 40 words or more", () => {
    const long = { ...base, quote: Array.from({ length: 40 }, () => "word").join(" ") };
    expect(checkReflection(long, { recentVoices: [], skippedVoices: [] })).toContain("quote must be under 40 words");
  });
  it("allows crisis replies without a quote", () => {
    const crisis = { ...base, quote: null, author: null, source: null, crisis: true };
    expect(checkReflection(crisis, { recentVoices: [], skippedVoices: [] })).toEqual([]);
  });
  it("removes em dashes and exclamation points from the bridge", () => {
    const t = tidyReflection(base);
    expect(t.bridge).not.toMatch(/[—!]/);
    expect(t.bridge).toBe("You stayed by the water longer than you meant to, and the light held you.");
  });
});
