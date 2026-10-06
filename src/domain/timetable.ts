/*
 * Rules for day plans and timetables (M3). Times are "HH:MM" strings in the
 * 24-hour clock; they compare correctly as plain strings and as minutes.
 */

/** Error messages keyed by field, ready to show next to the field. */
export type FieldErrors = Record<string, string>;

/** ISO weekdays: 1 Monday ... 7 Sunday. */
export const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export const SCHOOL_WEEK = [1, 2, 3, 4, 5] as const;

const TIME = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/;

/**
 * Reads a time typed as 8:00, 08:00, 8.00 or 13:45 and returns "08:00", or
 * null when it is not a real 24-hour time. Database times ("08:00:00") work
 * too.
 */
export function parseTime(input: string): string | null {
  const m = TIME.exec(input.trim());
  if (!m) return null;
  const [hours, minutes] = [Number(m[1]), Number(m[2])];
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${m[2]}`;
}

export function toMinutes(time: string): number {
  const parsed = parseTime(time);
  if (!parsed) throw new Error(`Not a time: "${time}"`);
  return Number(parsed.slice(0, 2)) * 60 + Number(parsed.slice(3));
}

/** "08:00" and "08:40" -> "08:00–08:40". */
export function timeRange(startsAt: string, endsAt: string): string {
  return `${parseTime(startsAt)}–${parseTime(endsAt)}`;
}

/** True when two time ranges share at least one minute (touching is fine). */
export function overlaps(
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string },
): boolean {
  return toMinutes(a.startsAt) < toMinutes(b.endsAt) && toMinutes(b.startsAt) < toMinutes(a.endsAt);
}

export interface PeriodInput {
  kind: "lesson" | "break";
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface PlanInput {
  name: string;
  days: number[];
  periods: PeriodInput[];
}

/**
 * Checks a day plan. Errors are keyed "name", "days", "periods" and
 * "period-<index>" (the row to fix). Periods must be in time order and must
 * not overlap; a break may sit between lessons.
 */
export function validatePlan(plan: PlanInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!plan.name.trim()) errors.name = "Give the day plan a name, e.g. Main day.";
  if (plan.days.length === 0) errors.days = "Choose at least one school day.";
  if (plan.days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
    errors.days = "Choose days from Monday to Sunday.";
  }
  if (!plan.periods.some((p) => p.kind === "lesson")) {
    errors.periods = "Add at least one lesson period.";
  }

  let previous: (PeriodInput & { index: number }) | null = null;
  plan.periods.forEach((p, index) => {
    const key = `period-${index}`;
    const label = p.name.trim() || `Row ${index + 1}`;
    const start = parseTime(p.startsAt);
    const end = parseTime(p.endsAt);
    if (!p.name.trim()) {
      errors[key] = "Give this row a name, e.g. Period 1 or Break.";
    } else if (!start || !end) {
      errors[key] = `${label}: write times as 08:00, in the 24-hour clock.`;
    } else if (end <= start) {
      errors[key] = `${label} must end after it starts.`;
    } else if (previous && start < parseTime(previous.endsAt)!) {
      errors[key] =
        `${label} starts before ${previous.name.trim()} ends (${parseTime(previous.endsAt)}).`;
    }
    if (start && end && end > start) previous = { ...p, index };
  });
  return errors;
}

/** A lesson as the clash check needs it, with names for the messages. */
export interface LessonSlot {
  id?: number;
  classId: number;
  className: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  roomId: number | null;
  roomName: string | null;
  day: number;
  startsAt: string;
  endsAt: string;
}

function when(slot: LessonSlot): string {
  return `${DAY_NAMES[slot.day]} ${timeRange(slot.startsAt, slot.endsAt)}`;
}

/**
 * Clashes between the lessons being saved and every other lesson in the
 * term: a teacher in two places, a class with two lessons, or a room booked
 * twice at overlapping times on the same day. Lessons in different day plans
 * clash when their times overlap. Each message names the clash.
 */
export function findClashes(
  saving: readonly LessonSlot[],
  others: readonly LessonSlot[],
): string[] {
  const messages: string[] = [];
  const all = [...others];
  for (const lesson of saving) {
    for (const other of all) {
      if (other.day !== lesson.day || !overlaps(lesson, other)) continue;
      if (other.classId === lesson.classId) {
        messages.push(`${lesson.className} already has ${other.subjectName} on ${when(other)}.`);
        continue;
      }
      if (lesson.teacherId && other.teacherId === lesson.teacherId) {
        messages.push(
          `${lesson.teacherName} is already teaching ${other.className} (${other.subjectName}) on ${when(other)}, so cannot teach ${lesson.className} ${lesson.subjectName} then.`,
        );
      }
      if (lesson.roomId && other.roomId === lesson.roomId) {
        messages.push(
          `${lesson.roomName} is already booked for ${other.className} (${other.subjectName}) on ${when(other)}.`,
        );
      }
    }
    // Later lessons in the same save are checked against this one too.
    all.push(lesson);
  }
  return [...new Set(messages)];
}

/**
 * The term a timetable screen opens on: the one asked for, else the term
 * running today, else the next one to start, else the latest.
 */
export function pickTerm<T extends { id: number; startsOn: string; endsOn: string }>(
  terms: readonly T[],
  requested: string | undefined,
  today: string,
): T | null {
  const asked = terms.find((t) => String(t.id) === requested);
  if (asked) return asked;
  const sorted = [...terms].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return (
    sorted.find((t) => t.startsOn <= today && today <= t.endsOn) ??
    sorted.find((t) => t.startsOn > today) ??
    sorted.at(-1) ??
    null
  );
}

/** ISO weekday (1 Monday ... 7 Sunday) of a yyyy-mm-dd date. */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return day === 0 ? 7 : day;
}

const SHORT_DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** [1,2,3,4,5] -> "Mon–Fri"; [1,3,5] -> "Mon, Wed, Fri". */
export function formatDays(days: readonly number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return "No days";
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
  if (consecutive && sorted.length >= 3) {
    return `${SHORT_DAYS[sorted[0]!]}–${SHORT_DAYS[sorted.at(-1)!]}`;
  }
  return sorted.map((d) => SHORT_DAYS[d]).join(", ");
}
