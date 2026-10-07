import { CalendarCog } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { STAGE_LABELS } from "@/domain/levels";
import { hasAnyRole } from "@/domain/roles";
import { isoWeekday } from "@/domain/timetable";
import { requireRole } from "@/server/tenant";
import { getClassTimetable, listRooms } from "@/server/timetable";
import { loadTerm } from "../../load-term";
import { PrintButton } from "../../print-button";
import { PrintHeader } from "../../print-header";
import { TermPicker } from "../../term-picker";
import { TimetableGrid, lessonMap } from "../../timetable-grid";
import { ClassEditor } from "./class-editor";

export const metadata: Metadata = { title: "Class timetable" };

/** Admins edit a class's timetable; its teachers see it read-only. */
export default async function ClassTimetablePage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const ctx = await requireRole("admin", "teacher");
  const [{ classId }, { term: requested }] = await Promise.all([params, searchParams]);
  const { terms, term, today } = await loadTerm(ctx, requested);
  if (!term || !/^\d+$/.test(classId)) notFound();
  const timetable = await getClassTimetable(ctx, Number(classId), term.id);
  if (!timetable) notFound();
  const isAdmin = hasAnyRole(ctx.roles, ["admin"]);
  const inTerm = term.startsOn <= today && today <= term.endsOn;
  const todayDay = inTerm ? isoWeekday(today) : null;
  const plan = timetable.plan;
  const title = `${timetable.className} timetable`;

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
          description={[
            `${term.name}, ${term.yearName}`,
            timetable.classTeacherName ? `Class teacher: ${timetable.classTeacherName}` : null,
            plan ? `Follows ${plan.name}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <>
              <TermPicker terms={terms} termId={term.id} />
              {plan && <PrintButton />}
            </>
          }
        />
      </div>

      {!plan ? (
        <Alert
          tone="info"
          title={`No day plan for ${STAGE_LABELS[timetable.stage]} in ${term.name}`}
        >
          {isAdmin ? (
            <>
              Set up the periods and breaks first.{" "}
              <Link href={`/timetable/plans?term=${term.id}`} className="underline">
                Day plans &amp; rooms
              </Link>
            </>
          ) : (
            "Your administrator has not set up this timetable yet."
          )}
        </Alert>
      ) : isAdmin ? (
        <>
          {timetable.subjects.length === 0 && (
            <Alert tone="warning" title={`${timetable.className} takes no subjects yet`}>
              Tick its subjects on{" "}
              <Link href="/setup/subjects" className="underline">
                School setup › Subjects
              </Link>{" "}
              first.
            </Alert>
          )}
          <ClassEditor timetable={timetable} rooms={await listRooms(ctx)} today={todayDay} />
          <div className="no-print">
            <LinkButton href={`/timetable/plans?term=${term.id}`} size="compact" icon={CalendarCog}>
              Change periods and breaks
            </LinkButton>
          </div>
        </>
      ) : (
        <TimetableGrid
          caption={`${title}, ${term.name}`}
          days={plan.days}
          today={todayDay}
          rows={plan.periods.map((p) => ({
            key: String(p.id),
            label: p.name,
            startsAt: p.startsAt,
            endsAt: p.endsAt,
            isBreak: p.kind === "break",
          }))}
          lessons={lessonMap(
            timetable.lessons,
            (l) => String(l.periodId),
            (l) => ({ title: l.subjectName, detail: l.teacherName, room: l.roomName }),
          )}
        />
      )}
    </div>
  );
}
