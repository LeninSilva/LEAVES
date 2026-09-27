import { describe, expect, it } from "vitest";
import { crossesMidnight, entryDay, formatStamp, inWindow, onThisDayKeys, formatMonth, naturalMoment } from "./dates";

const NY = "America/New_York";

describe("formatStamp", () => {
  it("shows the finish time as a natural phrase", () => {
    const e = { startedAt: "2026-09-27T01:30:00Z", finishedAt: "2026-09-27T01:42:00Z", timeZone: NY };
    expect(formatStamp(e, { locale: "en-US" })).toBe("September 26, 2026 at 9:42 PM");
  });

  it("follows 24 hour locales", () => {
    const e = { startedAt: "2026-09-27T01:30:00Z", finishedAt: "2026-09-27T01:42:00Z", timeZone: NY };
    expect(formatStamp(e, { locale: "en-GB" })).toContain("21:42");
  });

  it("adds the place when there is one", () => {
    const e = {
      startedAt: "2026-09-27T01:30:00Z",
      finishedAt: "2026-09-27T01:42:00Z",
      timeZone: NY,
      place: { name: "Grandma's kitchen" },
    };
    expect(formatStamp(e, { locale: "en-US" })).toBe("September 26, 2026 at 9:42 PM in Grandma's kitchen");
    expect(formatStamp(e, { locale: "en-US", withPlace: false })).toBe("September 26, 2026 at 9:42 PM");
  });

  it("files an entry begun before midnight under the day it began", () => {
    // 11:50 PM to 12:10 AM in New York
    const e = { startedAt: "2026-09-27T03:50:00Z", finishedAt: "2026-09-27T04:10:00Z", timeZone: NY };
    expect(crossesMidnight(e)).toBe(true);
    expect(entryDay(e)).toBe("2026-09-26");
    expect(formatStamp(e, { locale: "en-US" })).toBe("September 26, 2026, 11:50 PM to 12:10 AM");
  });

  it("does not treat a draft left for days as one night", () => {
    const e = { startedAt: "2026-09-20T03:50:00Z", finishedAt: "2026-09-27T04:10:00Z", timeZone: NY };
    expect(crossesMidnight(e)).toBe(false);
    expect(entryDay(e)).toBe("2026-09-27");
  });

  it("shows the time where it was written, not where it is read (travel)", () => {
    // Written in Tokyo at 8:05 AM on September 27; read in New York.
    const e = { startedAt: "2026-09-26T22:55:00Z", finishedAt: "2026-09-26T23:05:00Z", timeZone: "Asia/Tokyo" };
    expect(formatStamp(e, { locale: "en-US" })).toBe("September 27, 2026 at 8:05 AM");
    expect(entryDay(e)).toBe("2026-09-27");
  });

  it("handles a DST change inside an overnight entry", () => {
    // Nov 1, 2026 is the US fall-back night. 11:50 PM EDT Oct 31 to 12:20 AM EDT Nov 1.
    const e = { startedAt: "2026-11-01T03:50:00Z", finishedAt: "2026-11-01T04:20:00Z", timeZone: NY };
    expect(entryDay(e)).toBe("2026-10-31");
  });
});

describe("inWindow", () => {
  const at = (h: number, m = 0) => new Date(2026, 8, 26, h, m);
  it("wraps past midnight", () => {
    expect(inWindow(at(21), "20:00", "06:00")).toBe(true);
    expect(inWindow(at(3), "20:00", "06:00")).toBe(true);
    expect(inWindow(at(6), "20:00", "06:00")).toBe(false);
    expect(inWindow(at(12), "20:00", "06:00")).toBe(false);
  });
  it("works within a day", () => {
    expect(inWindow(at(13), "12:00", "14:00")).toBe(true);
    expect(inWindow(at(14), "12:00", "14:00")).toBe(false);
  });
});

describe("on this day", () => {
  it("matches the same date in earlier years and one month ago", () => {
    const k = onThisDayKeys("2026-09-26");
    expect(k.yearsAgo("2025-09-26")).toBe(true);
    expect(k.yearsAgo("2026-09-26")).toBe(false);
    expect(k.monthAgo).toBe("2026-08-26");
  });
  it("clamps short months", () => {
    expect(onThisDayKeys("2026-03-31").monthAgo).toBe("2026-02-28");
    expect(onThisDayKeys("2026-01-15").monthAgo).toBe("2025-12-15");
  });
});

it("formats month headings", () => {
  expect(formatMonth("2026-09", "en-US")).toBe("September 2026");
});

it("finds the time of day and season where the entry was written", () => {
  expect(naturalMoment("2026-09-27T01:42:00Z", NY)).toEqual({ timeOfDay: "night", season: "autumn" });
  expect(naturalMoment("2026-09-26T16:00:00Z", "Australia/Sydney")).toEqual({ timeOfDay: "night", season: "spring" });
});
