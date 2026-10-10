import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme";

const evening = new Date("2026-10-10T22:30:00");
const noon = new Date("2026-10-10T12:00:00");
const warm = { warmEvenings: true, warmEveningsFrom: "20:00", warmEveningsTo: "06:00" };

describe("choosing the theme", () => {
  it("obeys an explicit Daylight even in a warm evening", () => {
    expect(resolveTheme({ theme: "daylight", ...warm }, evening, true)).toBe("daylight");
  });

  it("obeys an explicit Lamplight at noon", () => {
    expect(resolveTheme({ theme: "lamplight", ...warm }, noon, false)).toBe("lamplight");
  });

  it("follows the phone when Automatic", () => {
    expect(resolveTheme({ theme: "automatic", ...warm, warmEvenings: false }, noon, true)).toBe("lamplight");
    expect(resolveTheme({ theme: "automatic", ...warm, warmEvenings: false }, noon, false)).toBe("daylight");
  });

  it("switches an Automatic theme to Lamplight inside the warm-evenings window, and back", () => {
    expect(resolveTheme({ theme: "automatic", ...warm }, evening, false)).toBe("lamplight");
    expect(resolveTheme({ theme: "automatic", ...warm }, new Date("2026-10-10T03:00:00"), false)).toBe("lamplight");
    expect(resolveTheme({ theme: "automatic", ...warm }, noon, false)).toBe("daylight");
  });
});
