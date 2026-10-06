import type { Metadata } from "next";
import Link from "next/link";
import { Alert, PageHeader, Table, TBody, TableEmpty, Td, Th, THead, Tr } from "@/components/ui";
import { listTeachers } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { getSchoolTimetable } from "@/server/timetable";
import { loadTerm } from "../load-term";
import { TermPicker } from "../term-picker";

export const metadata: Metadata = { title: "Teacher timetables" };

export default async function TeacherTimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [{ terms, term }, teachers] = await Promise.all([
    loadTerm(ctx, (await searchParams).term),
    listTeachers(ctx),
  ]);
  if (!term) {
    return (
      <Alert tone="info" title="Add this year's terms first">
        Timetables belong to a term.
      </Alert>
    );
  }
  const lessons = (await getSchoolTimetable(ctx, term.id)) ?? [];
  const count = (id: string) => lessons.filter((l) => l.teacherId === id).length;
  const classes = (id: string) =>
    [...new Set(lessons.filter((l) => l.teacherId === id).map((l) => l.className))].join(", ");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Teacher timetables"
        description={`${term.name}, ${term.yearName}. Open a teacher to see or print their week.`}
        actions={<TermPicker terms={terms} termId={term.id} />}
      />
      <Table caption={`Teachers and their lessons in ${term.name}`} className="max-w-4xl">
        <THead>
          <tr>
            <Th>Teacher</Th>
            <Th numeric>Lessons a week</Th>
            <Th>Classes</Th>
          </tr>
        </THead>
        <TBody>
          {teachers.length === 0 && (
            <TableEmpty columns={3} message="No teachers yet. Add them on School setup › Staff." />
          )}
          {teachers.map((t) => (
            <Tr key={t.userId}>
              <Td className="font-medium">
                <Link
                  href={`/timetable/teachers/${t.userId}?term=${term.id}`}
                  className="text-brand-strong underline"
                >
                  {t.name}
                </Link>
              </Td>
              <Td numeric>{count(t.userId)}</Td>
              <Td className="text-ink-secondary">{classes(t.userId) || "None yet"}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
