import { describe, expect, it } from "vitest";
import { ALL_QUOTES } from "./quotes/index.js";
import { LEGACY } from "./quotes/legacy.js";
import { STARTER_LIBRARY, pickStarter } from "./starter.js";
import { THEMES, TRADITIONS, VOICE_LIST, VOICES } from "./voices.js";

describe("starter library", () => {
  it("keeps the original 57 lines first, in order, so remembered positions still point to them", () => {
    expect(STARTER_LIBRARY.slice(0, 57).map((l) => l.quote)).toEqual(LEGACY.map((l) => l.text));
    expect(STARTER_LIBRARY[0].author).toBe("Epictetus");
    expect(STARTER_LIBRARY[20].author).toBe("Søren Kierkegaard");
    expect(STARTER_LIBRARY[56].author).toBe("Simone Weil");
    expect(STARTER_LIBRARY.slice(0, 21).filter((l) => l.isParaphrase).map((l) => l.author)).toEqual(["Søren Kierkegaard"]);
  });

  it("is deep, and ranges widely", () => {
    expect(STARTER_LIBRARY.length).toBeGreaterThan(200);
    expect(VOICE_LIST.length).toBeGreaterThan(130);
    for (const voice of [
      "Ptahhotep", "Plato", "Socrates", "Aristotle", "Plutarch", "Confucius", "Zhuangzi", "Mencius", "Friedrich Nietzsche", "René Descartes",
      "Karl Marx", "Friedrich Engels", "Che Guevara", "Fidel Castro", "Mao Zedong", "Pope Francis", "Pope Leo XIV", "The Buddha", "Pablo Neruda",
      "Gabriel García Márquez", "Simone de Beauvoir", "Jean-Paul Sartre", "Albert Camus", "Julia Annas", "Rosalind Hursthouse", "Myisha Cherry",
      "Alva Noë", "Hannah Ginsborg", "John Searle", "Kathryn J. Norlock", "Ali ibn Abi Talib",
    ]) {
      expect(STARTER_LIBRARY.some((l) => l.author === voice), voice).toBe(true);
    }
  });

  it("gives every line a real voice, a source, themes, and a short length", () => {
    const ids = new Set<string>();
    for (const q of ALL_QUOTES) {
      expect(VOICES[q.voice], `${q.id} has a voice`).toBeDefined();
      expect(q.author).toBe(VOICES[q.voice].name);
      expect(q.source.length, q.id).toBeGreaterThan(0);
      expect(q.themes.length, q.id).toBeGreaterThanOrEqual(1);
      expect(q.themes.length, q.id).toBeLessThanOrEqual(3);
      for (const t of q.themes) expect(THEMES as readonly string[], `${q.id} theme ${t}`).toContain(t);
      expect(q.text.split(/\s+/).length, q.id).toBeLessThanOrEqual(45);
      expect(q.text, q.id).not.toMatch(/—/);
      expect(ids.has(q.id), `duplicate id ${q.id}`).toBe(false);
      ids.add(q.id);
    }
    expect(new Set(ALL_QUOTES.map((q) => q.text)).size).toBe(ALL_QUOTES.length);
  });

  it("describes every voice, and every voice has something to read", () => {
    const used = new Set(ALL_QUOTES.map((q) => q.voice));
    const traditions = new Set<string>(TRADITIONS.map((t) => t.id));
    for (const v of VOICE_LIST) {
      expect(v.about.length, v.id).toBeGreaterThan(20);
      expect(traditions.has(v.tradition), v.id).toBe(true);
      expect(used.has(v.id), `${v.id} has a quotation`).toBe(true);
    }
    expect(new Set(VOICE_LIST.map((v) => v.id)).size).toBe(VOICE_LIST.length);
  });

  it("never repeats a line until all have been used", () => {
    let used: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < STARTER_LIBRARY.length; i++) {
      const pick = pickStarter({ used, allowReligious: true, skippedVoices: [] });
      expect(seen.has(pick.index)).toBe(false);
      seen.add(pick.index);
      used = pick.used;
    }
    expect(seen.size).toBe(STARTER_LIBRARY.length);
    const next = pickStarter({ used, allowReligious: true, skippedVoices: [] });
    expect(next.used).toHaveLength(1); // a new round begins
  });

  it("leaves out religious voices when asked, and skipped voices", () => {
    for (let i = 0; i < 80; i++) {
      const pick = pickStarter({ used: [], allowReligious: false, skippedVoices: ["seneca"] });
      expect(pick.line.religious).toBe(false);
      expect(pick.line.author).not.toBe("Seneca");
    }
  });

  it("prefers lines on the themes of what was written", () => {
    for (let i = 0; i < 60; i++) {
      const pick = pickStarter({ used: [], allowReligious: true, skippedVoices: [], themes: ["nature"] });
      expect(pick.line.themes).toContain("nature");
    }
  });

  it("brings up loved voices more often", () => {
    let weil = 0;
    let n = 0;
    for (let i = 0; i < 600; i++) {
      const pick = pickStarter({ used: [], allowReligious: true, skippedVoices: [], lovedVoices: ["Simone Weil"] });
      n++;
      if (pick.line.author === "Simone Weil") weil++;
    }
    const fair = (n * 3) / STARTER_LIBRARY.length; // three Weil lines in a library of this size would be about this many
    expect(weil).toBeGreaterThan(fair * 1.5);
  });
});
