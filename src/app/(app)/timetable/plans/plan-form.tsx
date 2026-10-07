"use client";

import { ArrowDown, ArrowUp, Coffee, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Alert, Button, Icon, Input, Select, StatusChip, buttonClass, cx } from "@/components/ui";
import { STAGE_LABELS, type Stage } from "@/domain/levels";
import { DAY_NAMES, parseTime, toMinutes } from "@/domain/timetable";
import { saveDayPlanAction, type FormState } from "@/server/actions/timetable";
import type { DayPlan } from "@/server/timetable";

interface Row {
  key: number;
  id?: number;
  kind: "lesson" | "break";
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface StageChoice {
  stage: Stage;
  /** Name of another day plan this stage follows now, if any. */
  usedBy: string | null;
}

let nextKey = 1;
const keyed = (r: Omit<Row, "key">): Row => ({ ...r, key: nextKey++ });

function addMinutes(time: string, minutes: number): string {
  const total = toMinutes(time) + minutes;
  if (total >= 24 * 60) return "";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Edits a day plan: its name, school days, the stages that follow it, and its
 * periods and breaks in time order. A new row starts when the last one ends
 * and lasts as long as the last lesson. The fields sit outside the <form>
 * (React resets a form after saving); one hidden field carries the plan.
 */
export function PlanForm({
  termId,
  plan,
  stages,
}: {
  termId: number;
  plan: DayPlan | null;
  stages: StageChoice[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDayPlanAction, {});
  const formId = useId();
  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState<number[]>(plan?.days ?? [1, 2, 3, 4, 5]);
  const [chosenStages, setChosenStages] = useState<Stage[]>(
    plan?.stages ?? stages.filter((s) => !s.usedBy).map((s) => s.stage),
  );
  const [rows, setRows] = useState<Row[]>(() =>
    plan
      ? plan.periods.map((p) => keyed({ ...p }))
      : [keyed({ kind: "lesson", name: "Period 1", startsAt: "", endsAt: "" })],
  );
  const lastAdded = useRef<number | null>(null);

  const payload = JSON.stringify({
    id: plan?.id,
    name,
    days,
    stages: chosenStages,
    periods: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
    })),
  });
  const [initial] = useState(payload);
  const dirty = payload !== initial;

  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  useEffect(() => {
    if (lastAdded.current === null) return;
    document.getElementById(`row-${lastAdded.current}-name`)?.focus();
    lastAdded.current = null;
  }, [rows]);

  const update = (key: number, change: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const addRow = (kind: Row["kind"]) => {
    setRows((prev) => {
      const last = prev.at(-1);
      const lastLesson = [...prev].reverse().find((r) => r.kind === "lesson");
      const start = last && parseTime(last.endsAt) ? parseTime(last.endsAt)! : "";
      const lessonLength =
        lastLesson && parseTime(lastLesson.startsAt) && parseTime(lastLesson.endsAt)
          ? toMinutes(lastLesson.endsAt) - toMinutes(lastLesson.startsAt)
          : 0;
      const length = kind === "lesson" ? lessonLength : 30;
      const lessons = prev.filter((r) => r.kind === "lesson").length;
      const row = keyed({
        kind,
        name: kind === "lesson" ? `Period ${lessons + 1}` : "Break",
        startsAt: start,
        endsAt: start && length > 0 ? addMinutes(start, length) : "",
      });
      lastAdded.current = row.key;
      return [...prev, row];
    });
  };

  const move = (index: number, by: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row!);
      return next;
    });

  const errors = state.errors ?? {};
  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="flex flex-col gap-5">
      <form id={formId} action={action} className="hidden">
        <input type="hidden" name="termId" value={termId} />
        <input type="hidden" name="plan" value={payload} />
      </form>

      {errors.form && (
        <Alert tone="danger" title={errors.form}>
          {state.clashes && state.clashes.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {state.clashes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="flex flex-col gap-1">
          <label htmlFor="plan-name" className="text-label font-semibold">
            Name
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main day"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "plan-name-error" : undefined}
          />
          {errors.name && (
            <p id="plan-name-error" className="text-label font-medium text-danger">
              {errors.name}
            </p>
          )}
        </div>
        <fieldset
          className="flex flex-col gap-1"
          aria-describedby={errors.days ? "plan-days-error" : undefined}
        >
          <legend className="mb-1 text-label font-semibold">School days</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <label key={d} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 pointer-coarse:size-5"
                  checked={days.includes(d)}
                  onChange={() => setDays((prev) => toggle(prev, d).sort((a, b) => a - b))}
                />
                {DAY_NAMES[d]}
              </label>
            ))}
          </div>
          {errors.days && (
            <p id="plan-days-error" className="text-label font-medium text-danger">
              {errors.days}
            </p>
          )}
        </fieldset>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-label font-semibold">Used by</legend>
        {stages.length === 0 ? (
          <p className="text-ink-secondary">
            No grade levels yet. Add them on the{" "}
            <Link href="/setup/classes" className="text-brand-strong underline">
              Classes
            </Link>{" "}
            page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {stages.map((s) => (
              <label key={s.stage} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 pointer-coarse:size-5"
                  checked={chosenStages.includes(s.stage)}
                  onChange={() => setChosenStages((prev) => toggle(prev, s.stage))}
                />
                {STAGE_LABELS[s.stage]}
                {s.usedBy && (
                  <span className="text-label text-ink-secondary">
                    (follows {s.usedBy} now; ticking moves it here)
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <h2 className="text-heading font-semibold">Periods and breaks</h2>
        <p className="text-label text-ink-secondary">
          In time order, 24-hour clock (08:00). Added rows start when the last one ends.
        </p>
        {errors.periods && <p className="text-label font-medium text-danger">{errors.periods}</p>}
        <div className="relative overflow-x-auto rounded-panel border border-card-edge bg-surface shadow-card">
          <table className="w-full border-collapse">
            <caption className="sr-only">Periods and breaks of this day plan</caption>
            <thead className="bg-subtle">
              <tr>
                {["Type", "Name", "Starts", "Ends", ""].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="h-9 border-b border-divider px-3 text-left text-label font-semibold text-ink-secondary"
                  >
                    {h || <span className="sr-only">Row actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => {
                const error = errors[`period-${index}`];
                const label = r.name.trim() || `Row ${index + 1}`;
                return (
                  <tr
                    key={r.key}
                    className={cx(r.kind === "break" && "bg-subtle", error && "bg-danger-bg/40")}
                  >
                    <td className="border-b border-divider px-3 py-1.5 align-top">
                      <Select
                        aria-label={`${label} type`}
                        value={r.kind}
                        onChange={(e) => update(r.key, { kind: e.target.value as Row["kind"] })}
                        className="w-28"
                      >
                        <option value="lesson">Lesson</option>
                        <option value="break">Break</option>
                      </Select>
                    </td>
                    <td className="border-b border-divider px-3 py-1.5 align-top">
                      <Input
                        id={`row-${r.key}-name`}
                        aria-label={`Row ${index + 1} name`}
                        value={r.name}
                        onChange={(e) => update(r.key, { name: e.target.value })}
                        className="min-w-36"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `row-${r.key}-error` : undefined}
                      />
                      {error && (
                        <p
                          id={`row-${r.key}-error`}
                          className="mt-1 text-label font-medium text-danger"
                        >
                          {error}
                        </p>
                      )}
                    </td>
                    {(["startsAt", "endsAt"] as const).map((field) => (
                      <td key={field} className="border-b border-divider px-3 py-1.5 align-top">
                        <Input
                          aria-label={`${label} ${field === "startsAt" ? "starts" : "ends"}`}
                          inputMode="numeric"
                          placeholder="08:00"
                          value={r[field]}
                          onChange={(e) => update(r.key, { [field]: e.target.value })}
                          onBlur={(e) => {
                            const t = parseTime(e.target.value);
                            if (t) update(r.key, { [field]: t });
                          }}
                          className="w-24 tabular-nums"
                        />
                      </td>
                    ))}
                    <td className="border-b border-divider px-3 py-1.5 align-top whitespace-nowrap">
                      <div className="flex gap-1">
                        <Button
                          size="compact"
                          variant="ghost"
                          aria-label={`Move ${label} up`}
                          title={`Move ${label} up`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <Icon icon={ArrowUp} />
                        </Button>
                        <Button
                          size="compact"
                          variant="ghost"
                          aria-label={`Move ${label} down`}
                          title={`Move ${label} down`}
                          disabled={index === rows.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <Icon icon={ArrowDown} />
                        </Button>
                        <Button
                          size="compact"
                          variant="ghost"
                          aria-label={`Remove ${label}`}
                          title={`Remove ${label}`}
                          disabled={rows.length === 1}
                          onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                        >
                          <Icon icon={Trash2} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={Plus} onClick={() => addRow("lesson")}>
            Add lesson period
          </Button>
          <Button icon={Coffee} onClick={() => addRow("break")}>
            Add break
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-4">
        <Button type="submit" form={formId} variant="primary" icon={Save} loading={pending}>
          {pending ? "Saving…" : "Save day plan"}
        </Button>
        <Link href={`/timetable/plans?term=${termId}`} className={buttonClass("secondary")}>
          Cancel
        </Link>
        {dirty && !pending && <StatusChip status="unsaved" />}
      </div>
    </div>
  );
}
