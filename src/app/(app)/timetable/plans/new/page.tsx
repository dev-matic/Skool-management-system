import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { STAGES } from "@/domain/levels";
import { listLevels } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { getDayPlans } from "@/server/timetable";
import { loadTerm } from "../../load-term";
import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "Add day plan" };

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [{ term }, levels] = await Promise.all([
    loadTerm(ctx, (await searchParams).term),
    listLevels(ctx),
  ]);
  if (!term) notFound();
  const plans = await getDayPlans(ctx, term.id);
  const stages = STAGES.filter((s) => levels.some((l) => l.stage === s)).map((stage) => ({
    stage,
    usedBy: plans.find((p) => p.stages.includes(stage))?.name ?? null,
  }));
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader title="Add day plan" description={`${term.name}, ${term.yearName}`} />
      <PlanForm termId={term.id} plan={null} stages={stages} />
    </div>
  );
}
