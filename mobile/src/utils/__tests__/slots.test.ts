import { getNextDays, getTimeOptionsForDay } from "../slots";
import { Availability } from "../../types";

const WEDNESDAY = new Date(2026, 0, 7, 10, 0, 0); // 2026-01-07 10:00 local, a Wednesday
const SATURDAY = new Date(2026, 0, 10, 10, 0, 0); // a Saturday

describe("getNextDays", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(WEDNESDAY);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 14 days by default, starting today", () => {
    const days = getNextDays();
    expect(days).toHaveLength(14);
    expect(days[0].dateKey).toBe("2026-01-07");
    expect(days[13].dateKey).toBe("2026-01-20");
  });

  it("respects a custom count", () => {
    expect(getNextDays(3)).toHaveLength(3);
  });
});

describe("getTimeOptionsForDay", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses the 09:00-17:00 default window on a weekday when no availability is set", () => {
    jest.useFakeTimers();
    jest.setSystemTime(WEDNESDAY); // "now" is 10:00, so 09:xx slots are already in the past
    const options = getTimeOptionsForDay(WEDNESDAY, undefined, 60);
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => new Date(o.iso).getTime() > WEDNESDAY.getTime())).toBe(true);
    // Last slot + 60min must still fit within the 17:00 close.
    const last = new Date(options[options.length - 1].iso);
    expect(last.getHours() * 60 + last.getMinutes() + 60).toBeLessThanOrEqual(17 * 60);
  });

  it("has no default availability on a weekend when no availability is set", () => {
    jest.useFakeTimers();
    jest.setSystemTime(SATURDAY);
    const options = getTimeOptionsForDay(SATURDAY, undefined, 60);
    expect(options).toEqual([]);
  });

  it("uses an explicit availability window over the weekday default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(WEDNESDAY);
    const availability: Availability = {
      wednesday: [{ start: "11:00", end: "12:00" }],
    };
    const options = getTimeOptionsForDay(WEDNESDAY, availability, 30);
    // 11:00 and 11:30 both fit a 30-min service before the 12:00 close; 12:00 itself doesn't.
    expect(options.map((o) => o.label)).toEqual(["11:00", "11:30"]);
  });

  it("returns no slots when the service duration doesn't fit in the window", () => {
    jest.useFakeTimers();
    jest.setSystemTime(WEDNESDAY);
    const availability: Availability = {
      wednesday: [{ start: "11:00", end: "11:20" }],
    };
    const options = getTimeOptionsForDay(WEDNESDAY, availability, 30);
    expect(options).toEqual([]);
  });

  it("excludes slots that have already passed today", () => {
    jest.useFakeTimers();
    jest.setSystemTime(WEDNESDAY); // now = 10:00
    const availability: Availability = {
      wednesday: [{ start: "09:00", end: "11:00" }],
    };
    const options = getTimeOptionsForDay(WEDNESDAY, availability, 30);
    expect(options.map((o) => o.label)).toEqual(["10:30"]);
  });
});
