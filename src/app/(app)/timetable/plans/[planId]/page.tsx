import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmAction, PageHeader, Panel } from "@/components/ui";
import { STAGES } from "@/domain/levels";
import { deleteDayPlanAction } from "@/server/actions/timetable";
import { listLevels } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { getDayPlans } from "@/server/timetable";
import { loadTerm } from "../../load-term";
import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "Edit day plan" };

export default async function EditPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const ctx = await requireRole("admin");
  const [{ planId }, { term: requested }] = await Promise.all([params, searchParams]);
  const [{ term }, levels] = await Promise.all([loadTerm(ctx, requested), listLevels(ctx)]);
  if (!term) notFound();
  const plans = await getDayPlans(ctx, term.id);
  const plan = plans.find((p) => String(p.id) === planId);
  if (!plan) notFound();
  const stages = STAGES.filter(
    (s) => levels.some((l) => l.stage === s) || plan.stages.includes(s),
  ).map((stage) => ({
    stage,
    usedBy: plans.find((p) => p.id !== plan.id && p.stages.includes(stage))?.name ?? null,
  }));
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader title={`Edit ${plan.name}`} description={`${term.name}, ${term.yearName}`} />
      <PlanForm termId={term.id} plan={plan} stages={stages} />
      <Panel title="Delete day plan">
        {plan.lessonCount > 0 ? (
          <p className="text-ink-secondary">
            This day plan has {plan.lessonCount} lesson{plan.lessonCount === 1 ? "" : "s"}. Clear
            them from the class timetables before deleting it.
          </p>
        ) : (
          <ConfirmAction
            action={deleteDayPlanAction}
            label="Delete day plan"
            question={`Delete ${plan.name}? Its periods and breaks are removed for ${term.name}.`}
            confirmLabel="Delete day plan"
            hidden={{ planId: plan.id, termId: term.id }}
          />
        )}
      </Panel>
    </div>
  );
}
