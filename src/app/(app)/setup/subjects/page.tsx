import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Alert,
  Button,
  LinkButton,
  PageHeader,
  Select,
  StatusChip,
  Table,
  TBody,
  TableEmpty,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { getCurrentTerm, listYears } from "@/server/academic-years";
import { getMatrix, listSubjects } from "@/server/subjects";
import { requireRole } from "@/server/tenant";
import { pickYear } from "@/domain/terms";
import { AddSubjectForm, SubjectMatrix } from "./subject-forms";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [{ year: requested }, years, current] = await Promise.all([
    searchParams,
    listYears(ctx),
    getCurrentTerm(ctx),
  ]);
  const year = pickYear(years, requested, current.today);
  const [subjects, matrix] = await Promise.all([
    listSubjects(ctx, year?.id ?? null),
    year ? getMatrix(ctx, year.id) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subjects"
        description="What the school teaches, and which classes take each subject."
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

      <section aria-labelledby="subject-list" className="flex flex-col gap-2">
        <h2 id="subject-list" className="text-heading font-semibold">
          Subject list
        </h2>
        <Table caption="Subjects the school teaches">
          <THead>
            <tr>
              <Th>Subject</Th>
              <Th>Short name</Th>
              <Th numeric>{year ? `Classes in ${year.name}` : "Classes"}</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </THead>
          <TBody>
            {subjects.length === 0 && (
              <TableEmpty columns={5} message="No subjects yet. Add them below." />
            )}
            {subjects.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td>{s.shortName ?? <span className="text-ink-secondary">—</span>}</Td>
                <Td numeric>{s.classCount}</Td>
                <Td>{s.isArchived && <StatusChip status="archived" />}</Td>
                <Td className="py-1 text-right">
                  <LinkButton
                    href={`/setup/subjects/${s.id}`}
                    size="compact"
                    variant="ghost"
                    icon={Pencil}
                    aria-label={`Edit ${s.name}`}
                  >
                    Edit
                  </LinkButton>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
        <AddSubjectForm />
      </section>

      <section aria-labelledby="by-class" className="flex flex-col gap-2">
        <h2 id="by-class" className="text-heading font-semibold">
          Subjects by class{year ? `, ${year.name}` : ""}
        </h2>
        {!year ? (
          <Alert tone="info">
            Add an academic year and its classes first.{" "}
            <Link href="/setup/years/new" className="underline">
              Add academic year
            </Link>
          </Alert>
        ) : matrix && matrix.classes.length === 0 ? (
          <Alert tone="info">
            No classes in {year.name} yet.{" "}
            <Link href="/setup/classes" className="underline">
              Add classes
            </Link>
          </Alert>
        ) : matrix && matrix.subjects.length === 0 ? (
          <Alert tone="info">Add subjects above, then tick which classes take them.</Alert>
        ) : (
          matrix && (
            <SubjectMatrix
              key={year.id}
              yearId={year.id}
              classes={matrix.classes}
              subjects={matrix.subjects}
              taken={[...matrix.taken]}
            />
          )
        )}
      </section>
    </div>
  );
}
