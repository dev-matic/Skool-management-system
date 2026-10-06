import type { Metadata } from "next";
import Link from "next/link";
import {
  Alert,
  Button,
  PageHeader,
  Select,
  Table,
  TBody,
  TableEmpty,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { hasAnyRole } from "@/domain/roles";
import { DAY_NAMES, isoWeekday } from "@/domain/timetable";
import { listTeachers } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { getSchoolTimetable, getTeacherTimetable, listTimetableClasses } from "@/server/timetable";
import { loadTerm } from "./load-term";
import { PrintButton } from "./print-button";
import { PrintHeader } from "./print-header";
import { TeacherGrid } from "./teacher-grid";
import { TermPicker } from "./term-picker";

export const metadata: Metadata = { title: "Timetable" };

type Params = { term?: string; day?: string; class?: string; teacher?: string };

/** Teachers: their own week. Admins: who teaches what, when and where. */
export default async function TimetablePage({ searchParams }: { searchParams: Promise<Params> }) {
  const ctx = await requireRole("admin", "teacher");
  const params = await searchParams;
  const { terms, term, today } = await loadTerm(ctx, params.term);
  if (!term) {
    return (
      <Alert tone="info" title="No terms yet">
        Timetables belong to a term.{" "}
        {hasAnyRole(ctx.roles, ["admin"]) && (
          <Link href="/setup/years" className="underline">
            Set up years and terms
          </Link>
        )}
      </Alert>
    );
  }
  const inTerm = term.startsOn <= today && today <= term.endsOn;
  const todayDay = inTerm ? isoWeekday(today) : null;

  if (!hasAnyRole(ctx.roles, ["admin"])) {
    const lessons = (await getTeacherTimetable(ctx, ctx.userId, term.id)) ?? [];
    return (
      <div className="flex flex-col gap-4">
        <PrintHeader
          schoolName={ctx.schoolName}
          title={`${ctx.userName}: timetable, ${term.name} ${term.yearName}`}
          today={today}
        />
        <div className="no-print">
          <PageHeader
            title="My timetable"
            description={`${term.name}, ${term.yearName} · ${lessons.length} lesson${lessons.length === 1 ? "" : "s"} a week`}
            actions={
              <>
                <TermPicker terms={terms} termId={term.id} />
                {lessons.length > 0 && <PrintButton />}
              </>
            }
          />
        </div>
        <TeacherGrid caption={`My timetable, ${term.name}`} lessons={lessons} today={todayDay} />
      </div>
    );
  }

  const [all, classes, teachers] = await Promise.all([
    getSchoolTimetable(ctx, term.id),
    listTimetableClasses(ctx, term.id),
    listTeachers(ctx),
  ]);
  // Opens on today (or Monday outside term time); "all" shows the week.
  const day = params.day ?? String(todayDay && todayDay <= 7 ? todayDay : 1);
  const lessons = (all ?? []).filter(
    (l) =>
      (day === "all" || String(l.day) === day) &&
      (!params.class || String(l.classId) === params.class) &&
      (!params.teacher || l.teacherId === params.teacher),
  );
  const unstaffed = lessons.filter((l) => !l.teacherId).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Whole school"
        description={`Who teaches what, when and where. ${term.name}, ${term.yearName}.`}
        actions={<TermPicker terms={terms} termId={term.id} keep={{ day: params.day }} />}
      />
      <form
        method="get"
        aria-label="Filter lessons"
        className="no-print flex flex-wrap items-end gap-3 rounded-panel border border-card-edge bg-surface p-3 shadow-card"
      >
        <input type="hidden" name="term" value={term.id} />
        <div className="flex flex-col gap-1">
          <label htmlFor="f-day" className="text-label font-semibold">
            Day
          </label>
          <Select id="f-day" name="day" defaultValue={day} className="w-40">
            <option value="all">Whole week</option>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
                {d === todayDay ? " (today)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-class" className="text-label font-semibold">
            Class
          </label>
          <Select id="f-class" name="class" defaultValue={params.class ?? ""} className="w-40">
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-teacher" className="text-label font-semibold">
            Teacher
          </label>
          <Select
            id="f-teacher"
            name="teacher"
            defaultValue={params.teacher ?? ""}
            className="w-52"
          >
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">Show</Button>
        <span className="pb-1.5 text-label text-ink-secondary" aria-live="polite">
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
          {unstaffed > 0 && (
            <strong className="ml-1 text-warning">· {unstaffed} without a teacher</strong>
          )}
        </span>
      </form>

      <Table caption={`Lessons, ${term.name}`}>
        <THead>
          <tr>
            {day === "all" && <Th>Day</Th>}
            <Th>Time</Th>
            <Th>Period</Th>
            <Th>Class</Th>
            <Th>Subject</Th>
            <Th>Teacher</Th>
            <Th>Room</Th>
          </tr>
        </THead>
        <TBody>
          {lessons.length === 0 && (
            <TableEmpty
              columns={day === "all" ? 7 : 6}
              message={
                (all ?? []).length === 0
                  ? "No lessons on the timetable for this term yet. Open a class to fill in its timetable."
                  : "No lessons match these filters."
              }
            />
          )}
          {lessons.map((l) => (
            <Tr key={`${l.classId}-${l.periodId}-${l.day}`}>
              {day === "all" && <Td>{DAY_NAMES[l.day]}</Td>}
              <Td className="whitespace-nowrap tabular-nums">
                {l.startsAt}–{l.endsAt}
              </Td>
              <Td className="text-ink-secondary">{l.periodName}</Td>
              <Td className="font-medium">
                <Link
                  href={`/timetable/classes/${l.classId}?term=${term.id}`}
                  className="text-brand-strong underline"
                >
                  {l.className}
                </Link>
              </Td>
              <Td>{l.subjectName}</Td>
              <Td>
                {l.teacherId ? (
                  <Link
                    href={`/timetable/teachers/${l.teacherId}?term=${term.id}`}
                    className="text-brand-strong underline"
                  >
                    {l.teacherName}
                  </Link>
                ) : (
                  <span className="font-semibold text-warning">No teacher</span>
                )}
              </Td>
              <Td className="text-ink-secondary">{l.roomName ?? "–"}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
