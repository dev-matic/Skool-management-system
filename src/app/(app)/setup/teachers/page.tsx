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
import { getCurrentTerm, listYears } from "@/server/academic-years";
import { getAssignmentGrid } from "@/server/assignments";
import { listTeachers } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { pickYear } from "@/domain/terms";
import { AssignmentGridForm } from "./assignment-grid";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [{ year: requested }, years, current, teachers] = await Promise.all([
    searchParams,
    listYears(ctx),
    getCurrentTerm(ctx),
    listTeachers(ctx),
  ]);
  const year = pickYear(years, requested, current.today);
  const grid = year ? await getAssignmentGrid(ctx, year.id) : null;

  // Teaching load from what is saved: subjects and classes per teacher.
  const load = new Map<string, { subjects: number; classes: Set<string> }>();
  if (grid) {
    for (const c of grid.classes) {
      for (const s of grid.subjects) {
        const teacherId = grid.cells[`${c.id}:${s.id}`]?.teacherId;
        if (!teacherId) continue;
        const entry = load.get(teacherId) ?? { subjects: 0, classes: new Set<string>() };
        entry.subjects += 1;
        entry.classes.add(c.name);
        load.set(teacherId, entry);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teachers"
        description={
          year
            ? `Who teaches each subject in ${year.name}. Teachers enter attendance and scores for these.`
            : "Who teaches each subject."
        }
        actions={
          years.length > 1 && year ? (
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="year-choice" className="text-label font-semibold">
                Year
              </label>
              <Select id="year-choice" name="year" defaultValue={year.id} className="w-36">
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="compact">
                Show
              </Button>
            </form>
          ) : undefined
        }
      />

      {!year || !grid ? (
        <Alert tone="info">
          Add an academic year, its classes and subjects first.{" "}
          <Link href="/setup/years/new" className="underline">
            Add academic year
          </Link>
        </Alert>
      ) : grid.classes.length === 0 || grid.subjects.length === 0 ? (
        <Alert tone="info">
          Classes in {year.name} do not take any subjects yet.{" "}
          <Link href="/setup/subjects" className="underline">
            Tick subjects for each class
          </Link>
          .
        </Alert>
      ) : teachers.length === 0 ? (
        <Alert tone="info">
          No one has the Teacher role yet.{" "}
          <Link href="/setup/staff/new" className="underline">
            Add teachers
          </Link>
          .
        </Alert>
      ) : (
        <AssignmentGridForm key={year.id} yearId={year.id} grid={grid} teachers={teachers} />
      )}

      {grid && teachers.length > 0 && (
        <section aria-labelledby="load-heading" className="flex flex-col gap-2">
          <h2 id="load-heading" className="text-heading font-semibold">
            Teaching load{year ? `, ${year.name}` : ""}
          </h2>
          <Table caption="Subjects and classes per teacher" className="max-w-3xl">
            <THead>
              <tr>
                <Th>Teacher</Th>
                <Th numeric>Subjects</Th>
                <Th>Classes</Th>
              </tr>
            </THead>
            <TBody>
              {teachers.length === 0 && <TableEmpty columns={3} message="No teachers yet." />}
              {teachers.map((t) => {
                const entry = load.get(t.userId);
                return (
                  <Tr key={t.userId}>
                    <Td className="font-medium">{t.name}</Td>
                    <Td numeric>{entry?.subjects ?? 0}</Td>
                    <Td>
                      {entry ? (
                        [...entry.classes].join(", ")
                      ) : (
                        <span className="text-ink-secondary">Nothing assigned</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </section>
      )}
    </div>
  );
}
