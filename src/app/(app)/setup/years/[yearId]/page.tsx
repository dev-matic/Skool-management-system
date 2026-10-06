import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/domain/dates";
import { getYear } from "@/server/academic-years";
import { requireRole } from "@/server/tenant";
import { YearForm } from "../year-form";

export const metadata: Metadata = { title: "Edit academic year" };

export default async function EditYearPage({ params }: { params: Promise<{ yearId: string }> }) {
  const ctx = await requireRole("admin");
  const { yearId } = await params;
  const year = /^\d+$/.test(yearId) ? await getYear(ctx, Number(yearId)) : null;
  if (!year) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Edit ${year.name}`} description="Dates are written dd/mm/yyyy." />
      <YearForm
        initial={{
          yearId: year.id,
          name: year.name,
          startsOn: formatDate(year.startsOn),
          endsOn: formatDate(year.endsOn),
          terms: year.terms.map((t) => ({
            name: t.name,
            startsOn: formatDate(t.startsOn),
            endsOn: formatDate(t.endsOn),
          })),
        }}
      />
    </div>
  );
}
