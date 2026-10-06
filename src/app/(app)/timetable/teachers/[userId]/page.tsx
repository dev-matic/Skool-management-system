import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { hasAnyRole } from "@/domain/roles";
import { isoWeekday } from "@/domain/timetable";
import { listTeachers } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { getTeacherTimetable } from "@/server/timetable";
import { loadTerm } from "../../load-term";
import { PrintButton } from "../../print-button";
import { PrintHeader } from "../../print-header";
import { TeacherGrid } from "../../teacher-grid";
import { TermPicker } from "../../term-picker";

export const metadata: Metadata = { title: "Teacher timetable" };

/** Any teacher's week for admins; a teacher may only open their own. */
export default async function TeacherTimetablePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const ctx = await requireRole("admin", "teacher");
  const [{ userId }, { term: requested }] = await Promise.all([params, searchParams]);
  const isAdmin = hasAnyRole(ctx.roles, ["admin"]);
  if (!isAdmin && userId !== ctx.userId) notFound();
  const { terms, term, today } = await loadTerm(ctx, requested);
  if (!term) notFound();
  const name =
    userId === ctx.userId
      ? ctx.userName
      : (await listTeachers(ctx)).find((t) => t.userId === userId)?.name;
  if (!name) notFound();
  const lessons = await getTeacherTimetable(ctx, userId, term.id);
  if (!lessons) notFound();
  const todayDay = term.startsOn <= today && today <= term.endsOn ? isoWeekday(today) : null;
  const title = `${name}: timetable`;

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader
        schoolName={ctx.schoolName}
        title={`${title}, ${term.name} ${term.yearName}`}
        today={today}
      />
      <div className="no-print">
        <PageHeader
          title={title}
          description={`${term.name}, ${term.yearName} · ${lessons.length} lesson${lessons.length === 1 ? "" : "s"} a week`}
          actions={
            <>
              <TermPicker terms={terms} termId={term.id} />
              {lessons.length > 0 && <PrintButton />}
            </>
          }
        />
      </div>
      <TeacherGrid caption={`${title}, ${term.name}`} lessons={lessons} today={todayDay} />
    </div>
  );
}
