import type { ReactNode } from "react";
import { TINTS, cx, tintFor } from "@/components/ui";
import { DAY_NAMES } from "@/domain/timetable";

export interface GridRow {
  key: string;
  label: string;
  startsAt: string;
  endsAt: string;
  isBreak?: boolean;
}

export interface GridLesson {
  /** Subject name; it also picks the cell's tint. */
  title: string;
  /** Teacher (on a class timetable) or class (on a teacher's). */
  detail: string | null;
  room: string | null;
}

/**
 * A read-only weekly timetable (docs/design-system.md, Timetable cell):
 * periods down the side, days across, today's column marked. Breaks are a
 * grey band across the week. Prints on A4 landscape.
 */
export function TimetableGrid({
  caption,
  days,
  rows,
  lessons,
  today,
  empty = "Free",
}: {
  caption: string;
  days: number[];
  rows: GridRow[];
  /** Lessons by row key, then day. A slot may hold more than one lesson. */
  lessons: Map<string, Map<number, GridLesson[]>>;
  today?: number | null;
  empty?: ReactNode;
}) {
  return (
    <div className="relative overflow-x-auto rounded-panel border border-card-edge bg-surface shadow-card print:overflow-visible print:rounded-none print:border-black print:shadow-none">
      <table className="w-full min-w-[44rem] table-fixed border-collapse print:min-w-0">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-28" />
          {days.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="h-10 border-b border-divider bg-subtle px-3 text-left text-label font-semibold text-ink-secondary print:border-black print:bg-transparent"
            >
              Period
            </th>
            {days.map((d) => (
              <th
                key={d}
                scope="col"
                aria-current={d === today ? "date" : undefined}
                className={cx(
                  "h-10 border-b border-l border-divider px-2 text-left text-label font-semibold print:border-black print:bg-transparent print:text-black",
                  d === today ? "bg-brand-tint text-ink" : "bg-subtle text-ink-secondary",
                )}
              >
                {DAY_NAMES[d]}
                {d === today && <span className="ml-1 font-normal no-print">(today)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.isBreak ? (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="border-b border-divider bg-subtle px-3 py-1.5 text-left text-label font-normal text-ink-secondary tabular-nums print:border-black print:bg-transparent"
                >
                  {row.startsAt}–{row.endsAt}
                </th>
                <td
                  colSpan={days.length}
                  className="border-b border-l border-divider bg-subtle px-3 py-1.5 text-label font-semibold text-ink-secondary print:border-black print:bg-transparent"
                >
                  {row.label}
                </td>
              </tr>
            ) : (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="border-b border-divider px-3 py-2 text-left align-top print:border-black"
                >
                  <span className="block font-semibold">{row.label}</span>
                  <span className="block text-label font-normal text-ink-secondary tabular-nums print:text-black">
                    {row.startsAt}–{row.endsAt}
                  </span>
                </th>
                {days.map((d) => {
                  const here = lessons.get(row.key)?.get(d) ?? [];
                  return (
                    <td
                      key={d}
                      className={cx(
                        "border-b border-l border-divider p-1 align-top print:border-black",
                        d === today && "bg-brand-tint/40",
                      )}
                    >
                      {here.length === 0 ? (
                        <span className="block px-2 py-1.5 text-label text-ink-secondary">
                          {empty}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {here.map((l, i) => (
                            <LessonCard key={i} lesson={l} />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function LessonCard({ lesson }: { lesson: GridLesson }) {
  return (
    <div
      className={cx(
        "rounded-control px-2 py-1.5 leading-snug print:rounded-none print:bg-transparent print:p-0",
        TINTS[tintFor(lesson.title)].bg,
      )}
    >
      <span className="block font-semibold">{lesson.title}</span>
      {lesson.detail && (
        <span className="block text-label text-ink-secondary print:text-black">
          {lesson.detail}
        </span>
      )}
      {lesson.room && (
        <span className="block text-label text-ink-secondary print:text-black">{lesson.room}</span>
      )}
    </div>
  );
}

/** Groups lessons into the grid's lookup by row key and day. */
export function lessonMap<T extends { day: number }>(
  items: readonly T[],
  rowKey: (item: T) => string,
  toLesson: (item: T) => GridLesson,
): Map<string, Map<number, GridLesson[]>> {
  const map = new Map<string, Map<number, GridLesson[]>>();
  for (const item of items) {
    const key = rowKey(item);
    const byDay = map.get(key) ?? new Map<number, GridLesson[]>();
    byDay.set(item.day, [...(byDay.get(item.day) ?? []), toLesson(item)]);
    map.set(key, byDay);
  }
  return map;
}
