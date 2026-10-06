import { ArrowDown, ArrowUp, ListPlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Icon,
  LinkButton,
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
import { STAGE_LABELS } from "@/domain/levels";
import { getCurrentTerm, listYears } from "@/server/academic-years";
import { addStandardLevelsAction, moveLevelAction } from "@/server/actions/classes";
import { listClasses, listLevels, listTeachers } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { AddClassForm, AddLevelForm } from "./class-forms";
import { pickYear } from "@/domain/terms";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [{ year: requested }, years, current, levels, teachers] = await Promise.all([
    searchParams,
    listYears(ctx),
    getCurrentTerm(ctx),
    listLevels(ctx),
    listTeachers(ctx),
  ]);
  const year = pickYear(years, requested, current.today);
  const classes = year ? await listClasses(ctx, year.id) : [];
  const levelOptions = levels.map((l) => ({ id: l.id, name: l.name }));
  const teacherOptions = teachers.map((t) => ({ id: t.userId, name: t.name }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Classes"
        description={
          year
            ? `Classes in ${year.name}. Pupils, attendance and scores belong to a class.`
            : "Classes belong to an academic year."
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

      {!year && (
        <Alert tone="info" title="Add an academic year first">
          Classes belong to a year.{" "}
          <Link href="/setup/years/new" className="underline">
            Add this year and its terms
          </Link>
          .
        </Alert>
      )}

      {year && (
        <section aria-labelledby="classes-heading" className="flex flex-col gap-2">
          <h2 id="classes-heading" className="sr-only">
            Classes in {year.name}
          </h2>
          <Table caption={`Classes in ${year.name}`}>
            <THead>
              <tr>
                <Th>Class</Th>
                <Th>Level</Th>
                <Th>Class teacher</Th>
                <Th numeric>Subjects</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {classes.length === 0 && (
                <TableEmpty
                  columns={5}
                  message={
                    levels.length === 0
                      ? "Add the school's levels below, then add classes."
                      : "No classes yet. Add them below."
                  }
                />
              )}
              {classes.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.levelName}</Td>
                  <Td>
                    {c.classTeacherName ?? <span className="text-ink-secondary">Not set</span>}
                  </Td>
                  <Td numeric>{c.subjectCount}</Td>
                  <Td className="py-1 text-right">
                    <LinkButton
                      href={`/setup/classes/${c.id}`}
                      size="compact"
                      variant="ghost"
                      icon={Pencil}
                      aria-label={`Edit ${c.name}`}
                    >
                      Edit
                    </LinkButton>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {levels.length > 0 && (
            <AddClassForm yearId={year.id} levels={levelOptions} teachers={teacherOptions} />
          )}
          {teachers.length === 0 && (
            <p className="text-label text-ink-secondary">
              No teachers yet.{" "}
              <Link href="/setup/staff/new" className="underline">
                Add staff
              </Link>{" "}
              to choose class teachers.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="levels-heading" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="levels-heading" className="text-heading font-semibold">
            Levels
          </h2>
          <p className="text-label text-ink-secondary">
            Used every year, in this order on lists and reports.
          </p>
        </div>
        {levels.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-panel border border-divider bg-surface px-4 py-4">
            <p>Start with the usual Ghanaian basic school levels, then rename or add as needed.</p>
            <form action={addStandardLevelsAction}>
              <Button type="submit" variant="primary" icon={ListPlus}>
                Add KG 1–2, Basic 1–6 and JHS 1–3
              </Button>
            </form>
          </div>
        ) : (
          <Table caption="Levels in order">
            <THead>
              <tr>
                <Th>Level</Th>
                <Th>Stage</Th>
                <Th numeric>Classes</Th>
                <Th>
                  <span className="sr-only">Order and actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {levels.map((l, i) => (
                <Tr key={l.id}>
                  <Td className="font-medium">{l.name}</Td>
                  <Td>
                    <Badge>{STAGE_LABELS[l.stage]}</Badge>
                  </Td>
                  <Td numeric>{l.classCount}</Td>
                  <Td className="py-1">
                    <div className="flex justify-end gap-1">
                      <form action={moveLevelAction}>
                        <input type="hidden" name="levelId" value={l.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button
                          type="submit"
                          size="compact"
                          variant="ghost"
                          disabled={i === 0}
                          aria-label={`Move ${l.name} up`}
                          title="Move up"
                        >
                          <Icon icon={ArrowUp} />
                        </Button>
                      </form>
                      <form action={moveLevelAction}>
                        <input type="hidden" name="levelId" value={l.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button
                          type="submit"
                          size="compact"
                          variant="ghost"
                          disabled={i === levels.length - 1}
                          aria-label={`Move ${l.name} down`}
                          title="Move down"
                        >
                          <Icon icon={ArrowDown} />
                        </Button>
                      </form>
                      <LinkButton
                        href={`/setup/classes/levels/${l.id}`}
                        size="compact"
                        variant="ghost"
                        icon={Pencil}
                        aria-label={`Edit ${l.name}`}
                      >
                        Edit
                      </LinkButton>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        <div className="rounded-panel border border-divider bg-surface px-3 py-3">
          <AddLevelForm />
        </div>
      </section>
    </div>
  );
}
