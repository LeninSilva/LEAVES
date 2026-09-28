import { describe, expect, it } from "vitest";
import { moodFromText, sceneFromText } from "../illustration/understand";
import { localTitle, hasContent, firstLine } from "./entries";

describe("localTitle", () => {
  it("uses the first words without ending on a joining word", () => {
    expect(localTitle({ text: "Walked to the river after work. It was gold.", photo: null })).toBe("Walked to the river");
  });
  it("names photo-only entries", () => {
    expect(localTitle({ text: "", photo: { url: "idb:x", thumbUrl: "idb:y", alt: "" } })).toBe("Photo of the day");
  });
  it("capitalises the first word", () => {
    expect(localTitle({ text: "quiet morning", photo: null })).toBe("Quiet morning");
  });
});

it("knows when there is something to finish", () => {
  expect(hasContent({ text: "   ", photo: null })).toBe(false);
  expect(hasContent({ text: "a", photo: null })).toBe(true);
});

it("shortens long first lines at a word", () => {
  expect(firstLine("one two three four", 10)).toBe("one two…");
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

  it("gives the same words the same picture, and Draw again a new one", () => {
    const a = sceneFromText("A quiet walk in the park.", { seed: "x" });
    expect(sceneFromText("A quiet walk in the park.", { seed: "x" })).toEqual(a);
  });
});
