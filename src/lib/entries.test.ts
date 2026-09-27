import { describe, expect, it } from "vitest";
import { motifFromText } from "../illustration/drawn";
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

it("finds a drawing subject on the device for entries kept from AI", () => {
  expect(motifFromText("Rain all afternoon. Tea and a book.")).toBe("rain on a pond");
  expect(motifFromText("Nothing much happened.")).toBeNull();
});
