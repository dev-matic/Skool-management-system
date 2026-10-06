import { CalendarPlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import {
  Alert,
  Badge,
  LinkButton,
  PageHeader,
  Table,
  TBody,
  TableEmpty,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { termWeeks } from "@/domain/terms";
import { getCurrentTerm, listYears } from "@/server/academic-years";
import { requireRole } from "@/server/tenant";

export const metadata: Metadata = { title: "Years & terms" };

export default async function YearsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [years, current, { saved }] = await Promise.all([
    listYears(ctx),
    getCurrentTerm(ctx),
    searchParams,
  ]);
  const currentTermId = current.status.kind === "in-term" ? current.status.term.id : null;
  // The year containing today comes first; the rest stay newest first.
  const isCurrentYear = (y: (typeof years)[number]) =>
    y.startsOn <= current.today && current.today <= y.endsOn;
  years.sort((a, b) => Number(isCurrentYear(b)) - Number(isCurrentYear(a)));
  const savedYear = years.find((y) => String(y.id) === saved);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Years & terms"
        description="Attendance, scores and fees are recorded against these terms."
        actions={
          <LinkButton href="/setup/years/new" variant="primary" icon={CalendarPlus}>
            Add academic year
          </LinkButton>
        }
      />
      {savedYear && <Alert tone="success">{savedYear.name} saved.</Alert>}

      {years.length === 0 && (
        <Table caption="Academic years">
          <TBody>
            <TableEmpty
              columns={1}
              message="No academic year yet. Add this year and its terms to get started."
              action={
                <LinkButton href="/setup/years/new" variant="primary" icon={CalendarPlus}>
                  Add academic year
                </LinkButton>
              }
            />
          </TBody>
        </Table>
      )}

      {years.map((year) => (
        <section key={year.id} aria-labelledby={`year-${year.id}`} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={`year-${year.id}`} className="text-heading font-semibold">
              {year.name}{" "}
              <span className="text-base font-normal text-ink-secondary tabular-nums">
                {formatDate(year.startsOn)} to {formatDate(year.endsOn)}
              </span>
            </h2>
            <LinkButton
              href={`/setup/years/${year.id}`}
              size="compact"
              icon={Pencil}
              aria-label={`Edit ${year.name}`}
            >
              Edit
            </LinkButton>
          </div>
          <Table caption={`Terms in ${year.name}`}>
            <THead>
              <tr>
                <Th>Term</Th>
                <Th>Starts</Th>
                <Th>Ends</Th>
                <Th numeric>Weeks</Th>
                <Th>
                  <span className="sr-only">Current</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {year.terms.map((t) => (
                <Tr key={t.id} selected={t.id === currentTermId}>
                  <Td className="font-medium">{t.name}</Td>
                  <Td className="tabular-nums">{formatDate(t.startsOn)}</Td>
                  <Td className="tabular-nums">{formatDate(t.endsOn)}</Td>
                  <Td numeric>{termWeeks(t.startsOn, t.endsOn)}</Td>
                  <Td>{t.id === currentTermId && <Badge>Current term</Badge>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
