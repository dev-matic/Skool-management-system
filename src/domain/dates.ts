/**
 * School dates are calendar days with no time of day. They are stored and
 * passed around as ISO strings ("2025-09-08") and shown as dd/mm/yyyy
 * ("08/09/2025"), as Ghanaian schools write them.
 */
export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function toIso(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** True for a real calendar date written as yyyy-mm-dd. */
export function isIsoDate(value: string): boolean {
  const m = ISO.exec(value);
  return !!m && isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** "2025-09-08" -> "08/09/2025". */
export function formatDate(iso: IsoDate): string {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`Not an ISO date: "${iso}"`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Reads a date typed as dd/mm/yyyy (also accepts "." or "-" between parts and
 * single-digit day or month). Returns null for anything that is not a real
 * date, so 31/02/2026 is refused rather than rolled into March.
 */
export function parseDisplayDate(input: string): IsoDate | null {
  const m = DISPLAY.exec(input.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isRealDate(year, month, day) ? toIso(year, month, day) : null;
}

/** Today's date in a time zone (schools default to Africa/Accra). */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  // en-CA formats as yyyy-mm-dd.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2026-10-06" -> "Tuesday". */
export function weekdayName(iso: IsoDate): string {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`Not an ISO date: "${iso}"`);
  return WEEKDAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()]!;
}
