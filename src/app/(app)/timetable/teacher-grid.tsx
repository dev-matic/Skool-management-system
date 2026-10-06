import { TableEmpty } from "@/components/ui";
import type { TimetableLesson } from "@/server/timetable";
import { TimetableGrid, lessonMap, type GridRow } from "./timetable-grid";

/**
 * A teacher's week. Their lessons can come from different day plans (KG and
 * JHS), so rows are the distinct lesson times, named after the period.
 */
export function TeacherGrid({
  caption,
  lessons,
  today,
}: {
  caption: string;
  lessons: TimetableLesson[];
  today: number | null;
}) {
  if (lessons.length === 0) {
    return (
      <div className="rounded-panel border border-card-edge bg-surface shadow-card">
        <table className="w-full">
          <caption className="sr-only">{caption}</caption>
          <tbody>
            <TableEmpty columns={1} message="No lessons on the timetable for this term yet." />
          </tbody>
        </table>
      </div>
    );
  }
  const slot = (l: TimetableLesson) => `${l.startsAt}-${l.endsAt}`;
  const rows = new Map<string, GridRow>();
  for (const l of lessons) {
    const key = slot(l);
    const existing = rows.get(key);
    rows.set(key, {
      key,
      label: existing && existing.label !== l.periodName ? "Lesson" : l.periodName,
      startsAt: l.startsAt,
      endsAt: l.endsAt,
    });
  }
  const days = [...new Set([1, 2, 3, 4, 5, ...lessons.map((l) => l.day)])].sort((a, b) => a - b);
  return (
    <TimetableGrid
      caption={caption}
      days={days}
      today={today}
      rows={[...rows.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt))}
      lessons={lessonMap(lessons, slot, (l) => ({
        title: l.subjectName,
        detail: l.className,
        room: l.roomName,
      }))}
    />
  );
}
