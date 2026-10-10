import { describe, expect, it } from "vitest";
import { moodFromText, sceneFromText } from "../illustration/understand";
import { localTitle, hasContent, firstLine, movedPhoto, withPhoto, wordsOf } from "./entries";
import type { Photo } from "./types";

const photo = (id: string, caption = ""): Photo => ({ id, url: `idb:${id}`, thumbUrl: `idb:${id}-thumb`, alt: "", caption });

describe("localTitle", () => {
  it("uses the first words without ending on a joining word", () => {
    expect(localTitle({ text: "Walked to the river after work. It was gold.", photos: [] })).toBe("Walked to the river");
  });
  it("doesn't end on a word that leads into something cut off", () => {
    expect(localTitle({ text: "Walked by the river this morning.", photos: [] })).toBe("Walked by the river");
  });
  it("names photo-only entries, using the caption when there is one", () => {
    expect(localTitle({ text: "", photos: [photo("x")] })).toBe("Photo of the day");
    expect(localTitle({ text: "", photos: [photo("x", "Low sun on the lake. Cold hands.")] })).toBe("Low sun on the lake");
  });
  it("capitalises the first word", () => {
    expect(localTitle({ text: "quiet morning", photos: [] })).toBe("Quiet morning");
  });
});

it("knows when there is something to finish", () => {
  expect(hasContent({ text: "   ", photos: [] })).toBe(false);
  expect(hasContent({ text: "a", photos: [] })).toBe(true);
  expect(hasContent({ text: "", photos: [photo("x")] })).toBe(true);
});

it("shortens long first lines at a word", () => {
  expect(firstLine("one two three four", 10)).toBe("one two…");
});

describe("photos on a page", () => {
  it("changes one photo's caption and leaves the others alone", () => {
    const list = [photo("a", "first"), photo("b", "second")];
    const next = withPhoto(list, "b", { caption: "changed" });
    expect(next.map((p) => p.caption)).toEqual(["first", "changed"]);
    expect(list[1].caption).toBe("second");
  });

  it("moves a photo earlier or later, and never off the ends", () => {
    const list = [photo("a"), photo("b"), photo("c")];
    expect(movedPhoto(list, "c", -1).map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(movedPhoto(list, "a", 1).map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(movedPhoto(list, "a", -1)).toBe(list);
    expect(movedPhoto(list, "c", 1)).toBe(list);
  });

  it("counts captions among the words a drawing and reflection are made from", () => {
    expect(wordsOf({ text: "A good day.", photos: [photo("a", "The lake at dawn"), photo("b")] })).toBe("A good day.\n\nThe lake at dawn");
    expect(wordsOf({ text: "", photos: [photo("a", "Snow on the hills")] })).toBe("Snow on the hills");
  });
});

describe("reading an entry on the device", () => {
  it("finds the mood in the words, and ignores it when negated", () => {
    expect(moodFromText("I'm so grateful she is in my life.")).toBe("grateful");
    expect(moodFromText("Not happy. I cried on the bus.")).toBe("heavy");
    expect(moodFromText("Nothing much happened.")).toBe("calm");
  });

  it("turns what the entry is about into a picture", () => {
    const texted = sceneFromText("When Angana texted me I felt a bit better.", { seed: "a" });
    expect(texted.arrangement).toBe("reaching");
    const choice = sceneFromText("I don't know whether to take the job in Portland or stay here.", { seed: "b" });
    expect(["path", "door", "bridge"]).toContain(choice.subject);
  });

  it("lets concrete things set the scene", () => {
    const rain = sceneFromText("Rain all afternoon. Tea and a book by the window.", { seed: "c" });
    expect(rain.weather).toBe("rain");
    expect(rain.setting).toBe("indoors");
    const sea = sceneFromText("Walked by the sea with mom.", { seed: "d" });
    expect(sea.setting).toBe("shore");
    expect(["boat", "birds", "paper boat", "stones", "lighthouse"]).toContain(sea.subject);
  });

  it("usually draws the thing the entry names", () => {
    const cases: [string, string][] = [
      ["We rowed the little boat out across the lake at dawn.", "boat"],
      ["Crossed the old stone bridge on the way home.", "bridge"],
      ["Sat on the bench by the water and watched the lighthouse.", "lighthouse"],
      ["A fox crossed the path behind the house this morning.", "fox"],
      ["Lit a candle and read for an hour.", "candle"],
    ];
    for (const [text, subject] of cases) {
      let hits = 0;
      for (let i = 0; i < 60; i++) if (sceneFromText(text, { seed: `entry-${i}` }).subject === subject) hits++;
      expect(hits, text).toBeGreaterThanOrEqual(30);
    }
  });

  it("gives the same words the same picture, and Draw again a new one", () => {
    const a = sceneFromText("A quiet walk in the park.", { seed: "x" });
    expect(sceneFromText("A quiet walk in the park.", { seed: "x" })).toEqual(a);
  });
});
