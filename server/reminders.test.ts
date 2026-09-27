import { describe, expect, it } from "vitest";
import { isDue, localClock } from "./reminders";

describe("daily reminder", () => {
  const now = new Date("2026-09-27T01:05:00Z"); // 9:05 PM in New York
  it("reads the local clock in the person's zone", () => {
    expect(localClock(now, "America/New_York")).toEqual({ date: "2026-09-26", hhmm: "21:05" });
  });
  it("sends once the time arrives, at most once a day", () => {
    expect(isDue({ reminder_time: "21:00", time_zone: "America/New_York", last_sent_date: null }, now)).toBe(true);
    expect(isDue({ reminder_time: "21:00", time_zone: "America/New_York", last_sent_date: "2026-09-26" }, now)).toBe(false);
    expect(isDue({ reminder_time: "21:30", time_zone: "America/New_York", last_sent_date: null }, now)).toBe(false);
  });
  it("skips a reminder that is hours late instead of sending it at an odd time", () => {
    expect(isDue({ reminder_time: "08:00", time_zone: "America/New_York", last_sent_date: null }, now)).toBe(false);
  });
});
