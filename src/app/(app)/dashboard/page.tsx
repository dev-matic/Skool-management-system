import type { Metadata } from "next";
import { CalendarRange, School, UserPlus, Users } from "lucide-react";
import {
  Badge,
  LinkButton,
  PageHeader,
  Panel,
  QuickActions,
  Table,
  TBody,
  TableEmpty,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { formatDate, weekdayName } from "@/domain/dates";
import { hasAnyRole, ROLE_LABELS } from "@/domain/roles";
import { pickYear } from "@/domain/terms";
import { getCurrentTerm, listYears } from "@/server/academic-years";
import { myAssignments } from "@/server/assignments";
import { getTenantContext } from "@/server/tenant";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Every page checks access itself; layouts alone are not enough.
  const ctx = await getTenantContext();
  const isTeacher = hasAnyRole(ctx.roles, ["teacher"]);
  const isAdmin = hasAnyRole(ctx.roles, ["admin"]);
  const current = await getCurrentTerm(ctx);

  let teaching: { className: string; subjects: string[]; isClassTeacher: boolean }[] = [];
  let yearName: string | null = null;
  if (isTeacher) {
    const years = await listYears(ctx);
    const year = pickYear(years, undefined, current.today);
    if (year) {
      yearName = year.name;
      const rows = await myAssignments(ctx, year.id);
      const byClass = new Map<string, { subjects: string[]; isClassTeacher: boolean }>();
      for (const r of rows) {
        const entry = byClass.get(r.className) ?? {
          subjects: [],
          isClassTeacher: r.isClassTeacher,
        };
        entry.subjects.push(r.subjectName);
        byClass.set(r.className, entry);
      }
      teaching = [...byClass].map(([className, v]) => ({ className, ...v }));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="-mb-4 text-label text-ink-secondary">
        {weekdayName(current.today)}{" "}
        <span className="tabular-nums">{formatDate(current.today)}</span>
      </p>
      <PageHeader
        title={`Welcome, ${ctx.userName}`}
        description={
          <>
            You are signed in to{" "}
            <strong className="font-semibold text-ink">{ctx.schoolName}</strong> as{" "}
            {ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")}.
          </>
        }
      />

      {isAdmin && (
        <QuickActions>
          <LinkButton href="/setup/staff/new" variant="primary" icon={UserPlus}>
            Add staff
          </LinkButton>
          <LinkButton href="/setup/classes" icon={School}>
            Classes
          </LinkButton>
          <LinkButton href="/setup/teachers" icon={Users}>
            Assign teachers
          </LinkButton>
          <LinkButton href="/setup/years" icon={CalendarRange}>
            Years &amp; terms
          </LinkButton>
        </QuickActions>
      )}

      {isTeacher && (
        <section aria-labelledby="my-classes" className="flex max-w-3xl flex-col gap-2">
          <h2 id="my-classes" className="text-heading font-semibold">
            Your classes{yearName ? `, ${yearName}` : ""}
          </h2>
          <Table caption="Classes and subjects you teach">
            <THead>
              <tr>
                <Th>Class</Th>
                <Th>Subjects you teach</Th>
              </tr>
            </THead>
            <TBody>
              {teaching.length === 0 && (
                <TableEmpty
                  columns={2}
                  message="No classes assigned to you yet. Your school administrator assigns them."
                />
              )}
              {teaching.map((t) => (
                <Tr key={t.className}>
                  <Td className="font-medium whitespace-nowrap">
                    {t.className} {t.isClassTeacher && <Badge>Class teacher</Badge>}
                  </Td>
                  <Td>{t.subjects.join(", ")}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </section>
      )}

      <Panel title="Getting started" className="max-w-2xl">
        <p>
          Students, attendance, scores and fees appear in the menu as they are built. Areas marked
          (soon) are not available yet.
        </p>
      </Panel>
    </div>
  );
}
