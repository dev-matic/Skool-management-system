import type { Metadata } from "next";
import Link from "next/link";
import { Alert, PageHeader, Table, TBody, TableEmpty, Td, Th, THead, Tr } from "@/components/ui";
import { STAGE_LABELS } from "@/domain/levels";
import { hasAnyRole } from "@/domain/roles";
import { requireRole } from "@/server/tenant";
import { getDayPlans, getSchoolTimetable, listTimetableClasses } from "@/server/timetable";
import { loadTerm } from "../load-term";
import { TermPicker } from "../term-picker";

export const metadata: Metadata = { title: "Class timetables" };

export default async function ClassTimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const ctx = await requireRole("admin", "teacher");
  const isAdmin = hasAnyRole(ctx.roles, ["admin"]);
  const { terms, term } = await loadTerm(ctx, (await searchParams).term);
  if (!term) {
    return (
      <Alert tone="info" title="No terms yet">
        Timetables belong to a term.
      </Alert>
    );
  }
  const [classes, plans, lessons] = await Promise.all([
    listTimetableClasses(ctx, term.id),
    getDayPlans(ctx, term.id),
    isAdmin ? getSchoolTimetable(ctx, term.id) : Promise.resolve(null),
  ]);
  const planFor = (stage: string) => plans.find((p) => p.stages.some((s) => s === stage))?.name;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={isAdmin ? "Class timetables" : "My classes"}
        description={
          isAdmin
            ? `${term.name}, ${term.yearName}. Open a class to fill in or change its timetable.`
            : `${term.name}, ${term.yearName}. Timetables of the classes you teach.`
        }
        actions={<TermPicker terms={terms} termId={term.id} />}
      />
      <Table caption={`Classes in ${term.yearName}`} className="max-w-4xl">
        <THead>
          <tr>
            <Th>Class</Th>
            <Th>Stage</Th>
            <Th>Day plan</Th>
            {isAdmin && <Th numeric>Lessons a week</Th>}
          </tr>
        </THead>
        <TBody>
          {classes.length === 0 && (
            <TableEmpty
              columns={isAdmin ? 4 : 3}
              message={
                isAdmin
                  ? `No classes in ${term.yearName} yet. Add them on School setup › Classes.`
                  : "You are not assigned to any class this year."
              }
            />
          )}
          {classes.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium">
                <Link
                  href={`/timetable/classes/${c.id}?term=${term.id}`}
                  className="text-brand-strong underline"
                >
                  {c.name}
                </Link>
              </Td>
              <Td>{STAGE_LABELS[c.stage]}</Td>
              <Td className={planFor(c.stage) ? undefined : "text-warning"}>
                {planFor(c.stage) ?? "None yet"}
              </Td>
              {isAdmin && <Td numeric>{lessons?.filter((l) => l.classId === c.id).length ?? 0}</Td>}
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
