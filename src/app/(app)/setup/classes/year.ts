import type { YearWithTerms } from "@/server/academic-years";

/** The year to show: the one asked for, else the one containing today, else the newest. */
export function pickYear(years: YearWithTerms[], requested: string | undefined, today: string) {
  return (
    years.find((y) => String(y.id) === requested) ??
    years.find((y) => y.startsOn <= today && today <= y.endsOn) ??
    years[0] ??
    null
  );
}
