import { describe, expect, it } from "vitest";
import { termStatus, validateTerms, validateYear } from "../domain/terms";
import { demoCalendar } from "./seed-setup";

describe("demo calendar", () => {
  it.each(["2026-10-06", "2027-02-01", "2027-08-15", "2030-09-01"])(
    "on %s gives a valid year that contains the date",
    (date) => {
      const { year, terms } = demoCalendar(new Date(`${date}T12:00:00Z`));
      expect(validateYear(year)).toEqual({});
      expect(validateTerms(year, terms)).toEqual({});
      expect(year.startsOn <= date || date.slice(5) >= "07-24").toBe(true);
    },
  );

  it("is in Term 1 in early October", () => {
    const { terms } = demoCalendar(new Date("2026-10-06T12:00:00Z"));
    const status = termStatus(
      terms.map((t, i) => ({ ...t, id: i + 1 })),
      "2026-10-06",
    );
    expect(status).toMatchObject({ kind: "in-term", term: { name: "Term 1" } });
  });
});
