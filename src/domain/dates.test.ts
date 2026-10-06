import { describe, expect, it } from "vitest";
import { formatDate, isIsoDate, parseDisplayDate, todayIn } from "./dates";

describe("formatDate", () => {
  it("shows dates as dd/mm/yyyy", () => {
    expect(formatDate("2025-09-08")).toBe("08/09/2025");
  });

  it("refuses anything that is not an ISO date", () => {
    expect(() => formatDate("08/09/2025")).toThrow();
  });
});

describe("parseDisplayDate", () => {
  it.each([
    ["08/09/2025", "2025-09-08"],
    ["8/9/2025", "2025-09-08"],
    ["08.09.2025", "2025-09-08"],
    [" 29/02/2028 ", "2028-02-29"],
  ])("reads %s as %s", (input, iso) => {
    expect(parseDisplayDate(input)).toBe(iso);
  });

  it.each(["31/02/2026", "29/02/2026", "13/13/2025", "2025-09-08", "09/2025", ""])(
    "refuses %s",
    (input) => {
      expect(parseDisplayDate(input)).toBeNull();
    },
  );

  it("reads day first, never US-style month first", () => {
    expect(parseDisplayDate("03/04/2026")).toBe("2026-04-03");
  });
});

describe("isIsoDate", () => {
  it("accepts real dates only", () => {
    expect(isIsoDate("2025-12-31")).toBe(true);
    expect(isIsoDate("2025-02-30")).toBe(false);
    expect(isIsoDate("25-12-31")).toBe(false);
  });
});

describe("todayIn", () => {
  it("uses the school's time zone, not the server's", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Tokyo but still 31 Dec in Accra (UTC+0).
    const now = new Date("2025-12-31T23:30:00Z");
    expect(todayIn("Africa/Accra", now)).toBe("2025-12-31");
    expect(todayIn("Asia/Tokyo", now)).toBe("2026-01-01");
  });
});
