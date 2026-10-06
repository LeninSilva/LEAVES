// @vitest-environment node
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { wipeLocal } from "./db";
import { themesFromText } from "./themes";
import { openingThought, retireOpeningThought, setOpeningThought, THOUGHT_LIFETIME_MS } from "./thoughts";

beforeEach(async () => {
  await wipeLocal();
});

describe("the thought on a blank page", () => {
  it("stays put for a few minutes, then is new each time the app is opened", async () => {
    const t0 = 1_000_000_000;
    const first = await openingThought({ now: t0 });
    expect((await openingThought({ now: t0 + 60_000 })).id).toBe(first.id);
    const later = await openingThought({ now: t0 + THOUGHT_LIFETIME_MS + 1000 });
    expect(later.id).not.toBe(first.id);
  });

  it("turns to another thought on request, and a finished page retires it", async () => {
    const first = await openingThought({ now: 5 });
    expect((await openingThought({ fresh: true, now: 6 })).id).not.toBe(first.id);
    const held = await openingThought({ now: 7 });
    await retireOpeningThought();
    expect((await openingThought({ now: 8 })).id).not.toBe(held.id);
  });

  it("shows a thought chosen in the library", async () => {
    await setOpeningThought("norlock-i-remain-pessimistic-but-i-do");
    expect((await openingThought()).author).toBe("Kathryn J. Norlock");
  });

  it("doesn't repeat a thought across a long run of openings", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add((await openingThought({ fresh: true })).id);
    expect(seen.size).toBe(60);
  });
});

describe("reading what an entry is about", () => {
  it("finds the themes in the words", () => {
    expect(themesFromText("So grateful for Maya today. We walked by the river and talked for hours.")).toEqual(
      expect.arrayContaining(["gratitude", "nature"]),
    );
    expect(themesFromText("My grandmother died last week. I miss her.")).toEqual(expect.arrayContaining(["death", "grief"]));
    expect(themesFromText("")).toEqual([]);
    expect(themesFromText("Hmm.")).toEqual([]);
  });
});
