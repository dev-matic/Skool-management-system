import { formatDate, type IsoDate } from "./dates";

/*
 * Rules for academic years and terms (M2). ISO date strings compare
 * correctly as plain strings, so no date library is needed.
 */

export interface YearInput {
  name: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
}

export interface TermInput {
  number: number;
  name: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
}

/** Error messages keyed by field, ready to show next to the field. */
export type FieldErrors = Record<string, string>;

const YEAR_NAME = /^(\d{4})\/(\d{4})$/;

/** The usual name for a year starting on a date: 2025-09-08 -> "2025/2026". */
export function suggestYearName(startsOn: IsoDate): string {
  const start = Number(startsOn.slice(0, 4));
  return `${start}/${start + 1}`;
}

export function validateYear(year: YearInput): FieldErrors {
  const errors: FieldErrors = {};
  const m = YEAR_NAME.exec(year.name.trim());
  if (!m) {
    errors.name = "Write the year as 2025/2026.";
  } else if (Number(m[2]) !== Number(m[1]) + 1) {
    errors.name = "The second year must follow the first, e.g. 2025/2026.";
  } else if (year.startsOn && m[1] !== year.startsOn.slice(0, 4)) {
    errors.name = `The year should start in ${m[1]}; the start date is in ${year.startsOn.slice(0, 4)}.`;
  }
  if (year.startsOn && year.endsOn && year.endsOn <= year.startsOn) {
    errors.endsOn = "The end date must be after the start date.";
  }
  return errors;
}

/**
 * Checks a year's terms together: each inside the year, ending after it
 * starts, numbered 1, 2, 3… without gaps, and following each other without
 * overlapping. Errors are keyed "term<number>.<field>".
 */
export function validateTerms(year: YearInput, terms: TermInput[]): FieldErrors {
  const errors: FieldErrors = {};
  const sorted = [...terms].sort((a, b) => a.number - b.number);

  sorted.forEach((t, index) => {
    const key = `term${t.number}`;
    if (t.number !== index + 1) {
      errors[`${key}.number`] = `Terms must be numbered 1 to ${sorted.length} without gaps.`;
    }
    if (!t.name.trim()) errors[`${key}.name`] = "Give the term a name, e.g. Term 1.";
    if (t.endsOn <= t.startsOn) {
      errors[`${key}.endsOn`] = "The end date must be after the start date.";
    }
    if (t.startsOn < year.startsOn || t.endsOn > year.endsOn) {
      errors[`${key}.startsOn`] =
        `Term dates must fall within the academic year (${formatDate(year.startsOn)} to ${formatDate(year.endsOn)}).`;
    }
    const previous = sorted[index - 1];
    if (previous && t.startsOn <= previous.endsOn) {
      errors[`${key}.startsOn`] =
        `${t.name || `Term ${t.number}`} must start after ${previous.name || `Term ${previous.number}`} ends (${formatDate(previous.endsOn)}).`;
    }
  });
  return errors;
}

export interface DatedTerm {
  id: number;
  name: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
}

export type TermStatus<T extends DatedTerm = DatedTerm> =
  { kind: "in-term"; term: T } | { kind: "break"; next: T } | { kind: "none" };

/**
 * Which term is current on a date. During a holiday the next term is
 * returned, so screens can say "Holiday, Term 2 starts 05/01/2026".
 * After the last term with nothing set up yet, there is no current term.
 */
export function termStatus<T extends DatedTerm>(
  terms: readonly T[],
  today: IsoDate,
): TermStatus<T> {
  const sorted = [...terms].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const current = sorted.find((t) => t.startsOn <= today && today <= t.endsOn);
  if (current) return { kind: "in-term", term: current };
  const next = sorted.find((t) => t.startsOn > today);
  if (next) return { kind: "break", next };
  return { kind: "none" };
}
