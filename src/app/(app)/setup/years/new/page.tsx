import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/server/tenant";
import { YearForm } from "../year-form";

export const metadata: Metadata = { title: "Add academic year" };

export default async function NewYearPage() {
  await requireRole("admin");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Add academic year"
        description="Most schools have three terms. Dates are written dd/mm/yyyy."
      />
      <YearForm
        initial={{
          name: "",
          startsOn: "",
          endsOn: "",
          terms: [1, 2, 3].map((n) => ({ name: `Term ${n}`, startsOn: "", endsOn: "" })),
        }}
      />
    </div>
  );
}
