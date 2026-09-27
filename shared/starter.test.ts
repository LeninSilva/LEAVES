import { describe, expect, it } from "vitest";
import { STARTER_LIBRARY, pickStarter } from "./starter";

describe("starter library", () => {
  it("has exactly the 21 given lines, one marked as a paraphrase", () => {
    expect(STARTER_LIBRARY).toHaveLength(21);
    expect(STARTER_LIBRARY.filter((l) => l.isParaphrase).map((l) => l.author)).toEqual(["Søren Kierkegaard"]);
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
