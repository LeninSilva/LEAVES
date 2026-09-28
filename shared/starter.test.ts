import { describe, expect, it } from "vitest";
import { STARTER_LIBRARY, pickStarter } from "./starter.js";

describe("starter library", () => {
  it("keeps the original 21 lines first, in order, so remembered positions still point to them", () => {
    expect(STARTER_LIBRARY[0].author).toBe("Epictetus");
    expect(STARTER_LIBRARY[20].author).toBe("Søren Kierkegaard");
    expect(STARTER_LIBRARY.slice(0, 21).filter((l) => l.isParaphrase).map((l) => l.author)).toEqual(["Søren Kierkegaard"]);
  });

  it("ranges widely, with every line short, sourced and unique", () => {
    expect(STARTER_LIBRARY.length).toBeGreaterThan(50);
    expect(new Set(STARTER_LIBRARY.map((l) => l.quote)).size).toBe(STARTER_LIBRARY.length);
    for (const line of STARTER_LIBRARY) {
      expect(line.quote.split(/\s+/).length).toBeLessThan(40);
      expect(line.source.length).toBeGreaterThan(0);
      expect(line.quote).not.toMatch(/—/);
    }
    for (const voice of ["Ptahhotep", "Confucius", "Thiruvalluvar", "Laxmi Prasad Devkota", "Saadi", "Ibn Sina", "Denis Diderot"]) {
      expect(STARTER_LIBRARY.some((l) => l.author === voice)).toBe(true);
    }
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
    for (let i = 0; i < 50; i++) {
      const pick = pickStarter({ used: [], allowReligious: false, skippedVoices: ["seneca"] });
      expect(pick.line.religious).toBe(false);
      expect(pick.line.author).not.toBe("Seneca");
    }
  });
});
