import { CalendarPlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Alert,
  LinkButton,
  PageHeader,
  Panel,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { STAGE_LABELS, STAGES } from "@/domain/levels";
import { formatDays } from "@/domain/timetable";
import { listLevels } from "@/server/classes";
import { requireRole } from "@/server/tenant";
import { getDayPlans, listRooms, termsWithPlans } from "@/server/timetable";
import { loadTerm } from "../load-term";
import { TermPicker } from "../term-picker";
import { CopyForm } from "./copy-form";
import { RoomsPanel } from "./rooms-panel";

export const metadata: Metadata = { title: "Day plans & rooms" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; saved?: string }>;
}) {
  const ctx = await requireRole("admin");
  const params = await searchParams;
  const [{ terms, term }, rooms, levels, withPlans] = await Promise.all([
    loadTerm(ctx, params.term),
    listRooms(ctx),
    listLevels(ctx),
    termsWithPlans(ctx),
  ]);

  if (!term) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Day plans & rooms" />
        <Alert tone="info" title="Add this year's terms first">
          Timetables belong to a term.{" "}
          <Link href="/setup/years" className="underline">
            Set up years and terms
          </Link>
          .
        </Alert>
      </div>
    );
  }

  const plans = await getDayPlans(ctx, term.id);
  const stagesInUse = STAGES.filter((s) => levels.some((l) => l.stage === s));
  const withoutPlan = stagesInUse.filter((s) => !plans.some((p) => p.stages.includes(s)));
  const sources = terms.filter((t) => t.id !== term.id && withPlans.includes(t.id));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Day plans & rooms"
        description={`School days, periods and breaks for ${term.name}, ${term.yearName}. Each stage follows one day plan.`}
        actions={
          <>
            <TermPicker terms={terms} termId={term.id} />
            <LinkButton
              href={`/timetable/plans/new?term=${term.id}`}
              variant="primary"
              icon={CalendarPlus}
            >
              Add day plan
            </LinkButton>
          </>
        }
      />
      {params.saved && <Alert tone="success">{params.saved}</Alert>}
      {withoutPlan.length > 0 && plans.length > 0 && (
        <Alert tone="warning">
          {withoutPlan.map((s) => STAGE_LABELS[s]).join(", ")}{" "}
          {withoutPlan.length === 1 ? "has" : "have"} no day plan this term, so{" "}
          {withoutPlan.length === 1 ? "its" : "their"} classes cannot get a timetable yet.
        </Alert>
      )}

      {plans.length === 0 && (
        <Panel title="No day plan for this term yet">
          {sources.length > 0 ? (
            <div className="flex flex-col gap-4">
              <CopyForm toTerm={term} sources={sources} />
              <p className="text-ink-secondary">
                Or{" "}
                <Link
                  href={`/timetable/plans/new?term=${term.id}`}
                  className="text-brand-strong underline"
                >
                  start a new day plan
                </Link>
                .
              </p>
            </div>
          ) : (
            <p>
              Start with your main school day: its days, periods and breaks.{" "}
              <Link
                href={`/timetable/plans/new?term=${term.id}`}
                className="text-brand-strong underline"
              >
                Add day plan
              </Link>
            </p>
          )}
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => (
          <Panel
            key={plan.id}
            title={plan.name}
            subtitle={`${formatDays(plan.days)} · ${
              plan.stages.length
                ? plan.stages.map((s) => STAGE_LABELS[s]).join(", ")
                : "No stage yet"
            } · ${plan.lessonCount} lesson${plan.lessonCount === 1 ? "" : "s"} timetabled`}
            aside={
              <LinkButton
                href={`/timetable/plans/${plan.id}?term=${term.id}`}
                size="compact"
                icon={Pencil}
                aria-label={`Edit ${plan.name}`}
              >
                Edit
              </LinkButton>
            }
          >
            <Table caption={`Periods and breaks in ${plan.name}`}>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Starts</Th>
                  <Th>Ends</Th>
                </tr>
              </THead>
              <TBody>
                {plan.periods.map((p) => (
                  <Tr key={p.id} className={p.kind === "break" ? "bg-subtle" : undefined}>
                    <Td className={p.kind === "break" ? "text-ink-secondary" : "font-medium"}>
                      {p.name}
                    </Td>
                    <Td className="tabular-nums">{p.startsAt}</Td>
                    <Td className="tabular-nums">{p.endsAt}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Panel>
        ))}
      </div>

      <Panel
        title="Rooms"
        subtitle="Optional. Used to stop two classes booking the same room."
        className="max-w-2xl"
      >
        <RoomsPanel rooms={rooms} />
      </Panel>
    </div>
  );
}
