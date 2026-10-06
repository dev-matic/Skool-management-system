import { describe, expect, it } from "vitest";
import {
  overlappingYear,
  suggestYearName,
  termStatus,
  termWeeks,
  validateTerms,
  validateYear,
  type TermInput,
} from "./terms";

// FAKE dates for tests only; not any school's real calendar.
const YEAR = { name: "2025/2026", startsOn: "2025-09-08", endsOn: "2026-07-24" };
const THREE_TERMS: TermInput[] = [
  { number: 1, name: "Term 1", startsOn: "2025-09-08", endsOn: "2025-12-12" },
  { number: 2, name: "Term 2", startsOn: "2026-01-06", endsOn: "2026-04-02" },
  { number: 3, name: "Term 3", startsOn: "2026-04-27", endsOn: "2026-07-24" },
];

describe("suggestYearName", () => {
  it("names the year from its start date", () => {
    expect(suggestYearName("2025-09-08")).toBe("2025/2026");
  });
});

describe("validateYear", () => {
  it("accepts a normal year", () => {
    expect(validateYear(YEAR)).toEqual({});
  });

  it.each([
    ["2025-26", "Write the year as 2025/2026."],
    ["2025/2027", "The second year must follow the first, e.g. 2025/2026."],
    ["2024/2025", "The year should start in 2024; the start date is in 2025."],
  ])("explains a wrong name %s", (name, message) => {
    expect(validateYear({ ...YEAR, name }).name).toBe(message);
  });

  it("refuses an end date before the start date", () => {
    expect(validateYear({ ...YEAR, endsOn: "2025-09-01" }).endsOn).toBe(
      "The end date must be after the start date.",
    );
  });
});

describe("validateTerms", () => {
  it("accepts three terms in order", () => {
    expect(validateTerms(YEAR, THREE_TERMS)).toEqual({});
  });

  it("accepts terms given in any order", () => {
    expect(validateTerms(YEAR, [...THREE_TERMS].reverse())).toEqual({});
  });

  it("supports a school with two terms", () => {
    expect(validateTerms(YEAR, THREE_TERMS.slice(0, 2))).toEqual({});
  });

  it("refuses overlapping terms and names the clash", () => {
    const overlapping = [THREE_TERMS[0]!, { ...THREE_TERMS[1]!, startsOn: "2025-12-01" }];
    expect(validateTerms(YEAR, overlapping)["term2.startsOn"]).toBe(
      "Term 2 must start after Term 1 ends (12/12/2025).",
    );
  });

  it("refuses a term outside the academic year", () => {
    const late = [...THREE_TERMS.slice(0, 2), { ...THREE_TERMS[2]!, endsOn: "2026-08-14" }];
    expect(validateTerms(YEAR, late)["term3.startsOn"]).toBe(
      "Term dates must fall within the academic year (08/09/2025 to 24/07/2026).",
    );
  });

  it("refuses a gap in term numbers", () => {
    const gap = [THREE_TERMS[0]!, { ...THREE_TERMS[2]! }];
    expect(validateTerms(YEAR, gap)["term3.number"]).toBe(
      "Terms must be numbered 1 to 2 without gaps.",
    );
  });

  it("refuses a term that ends before it starts", () => {
    const backwards = [{ ...THREE_TERMS[0]!, endsOn: "2025-09-01" }];
    expect(validateTerms(YEAR, backwards)["term1.endsOn"]).toBe(
      "The end date must be after the start date.",
    );
  });

  it("requires a name", () => {
    expect(validateTerms(YEAR, [{ ...THREE_TERMS[0]!, name: " " }])["term1.name"]).toBeDefined();
  });
});

describe("termStatus", () => {
  const terms = THREE_TERMS.map((t, i) => ({ ...t, id: i + 1 }));

  it("finds the term containing the date, including first and last days", () => {
    expect(termStatus(terms, "2025-09-08")).toMatchObject({ kind: "in-term", term: { id: 1 } });
    expect(termStatus(terms, "2026-02-15")).toMatchObject({ kind: "in-term", term: { id: 2 } });
    expect(termStatus(terms, "2026-07-24")).toMatchObject({ kind: "in-term", term: { id: 3 } });
  });

  it("during a holiday, gives the next term", () => {
    expect(termStatus(terms, "2025-12-25")).toMatchObject({ kind: "break", next: { id: 2 } });
    expect(termStatus(terms, "2025-08-01")).toMatchObject({ kind: "break", next: { id: 1 } });
  });

  it("has no current term after the last one", () => {
    expect(termStatus(terms, "2026-08-10")).toEqual({ kind: "none" });
    expect(termStatus([], "2026-08-10")).toEqual({ kind: "none" });
  });
});

describe("overlappingYear", () => {
  const existing = [{ id: 1, name: "2025/2026", startsOn: "2025-09-08", endsOn: "2026-07-24" }];

  it("finds a year whose dates overlap", () => {
    const next = { name: "2026/2027", startsOn: "2026-07-01", endsOn: "2027-07-23" };
    expect(overlappingYear(next, existing)?.id).toBe(1);
  });

  it("allows a year that starts after the last one ends", () => {
    const next = { name: "2026/2027", startsOn: "2026-09-07", endsOn: "2027-07-23" };
    expect(overlappingYear(next, existing)).toBeNull();
  });
});

describe("termWeeks", () => {
  it("counts weeks including both the first and last day", () => {
    expect(termWeeks("2026-09-08", "2026-12-11")).toBe(14);
    expect(termWeeks("2026-09-07", "2026-09-11")).toBe(1);
  });
});
