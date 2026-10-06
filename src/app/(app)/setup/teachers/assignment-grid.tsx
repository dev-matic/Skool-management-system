"use client";

import { Save, UserCheck } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { Alert, Button, Icon, StatusChip, cx } from "@/components/ui";
import { saveAssignmentsAction, type FormState } from "@/server/actions/assignments";
import { STAGE_LABELS, STAGES } from "@/domain/levels";
import type { AssignmentGrid } from "@/server/assignments";

interface Props {
  yearId: number;
  grid: AssignmentGrid;
  teachers: { userId: string; name: string }[];
}

type Assigned = Record<string, string>; // cell key -> teacher id ("" = none)

const fromGrid = (grid: AssignmentGrid): Assigned =>
  Object.fromEntries(Object.entries(grid.cells).map(([k, c]) => [k, c.teacherId ?? ""]));

/**
 * Teachers for every class subject of a year, as one grid of dropdowns.
 * Tab moves along a row. The dropdowns sit outside the <form> because React
 * resets a form after a successful action; hidden fields carry the values.
 */
export function AssignmentGridForm({ yearId, grid, teachers }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAssignmentsAction, {});
  const formId = useId();
  const saved = fromGrid(grid);
  const savedKey = JSON.stringify(saved);
  const [assigned, setAssigned] = useState<Assigned>(saved);
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setAssigned(saved);
  }
  const dirty = Object.keys(saved).some((k) => saved[k] !== assigned[k]);
  const unassigned = Object.values(assigned).filter((t) => !t).length;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const saveBar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="submit"
        form={formId}
        variant="primary"
        icon={Save}
        loading={pending}
        disabled={!dirty && !pending}
      >
        {pending ? "Saving…" : "Save teachers"}
      </Button>
      {dirty && <StatusChip status="unsaved" />}
      <span className="text-label text-ink-secondary" aria-live="polite">
        {unassigned === 0
          ? "Every subject has a teacher."
          : `${unassigned} subject${unassigned === 1 ? "" : "s"} still without a teacher.`}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Teachers by class and subject">
      <form id={formId} action={action} className="hidden">
        <input type="hidden" name="yearId" value={yearId} />
        {/* Only cells changed on this page are sent, so saving never undoes
            another person's changes to other cells. */}
        {Object.entries(assigned)
          .filter(([k, teacherId]) => saved[k] !== teacherId)
          .map(([k, teacherId]) => (
            <input
              key={k}
              type="hidden"
              name={`cs-${grid.cells[k]!.classSubjectId}`}
              value={teacherId}
            />
          ))}
      </form>
      {state.errors?.form && <Alert tone="danger">{state.errors.form}</Alert>}
      {state.ok && state.message && !dirty && <Alert tone="success">{state.message}</Alert>}
      {saveBar}
      {STAGES.filter((stage) => grid.classes.some((c) => c.stage === stage)).map((stage) => {
        const classes = grid.classes.filter((c) => c.stage === stage);
        // Only subjects this stage's classes take, so the table has few dashes.
        const subjects = grid.subjects.filter((s) =>
          classes.some((c) => `${c.id}:${s.id}` in grid.cells),
        );
        const stageKeys = classes.flatMap((c) =>
          subjects.map((s) => `${c.id}:${s.id}`).filter((k) => k in grid.cells),
        );
        const stageUnassigned = stageKeys.filter((k) => !assigned[k]).length;
        const withClassTeacher = classes.filter((c) => c.classTeacherId);
        const takeAll = (list: typeof classes) =>
          setAssigned((prev) => {
            const next = { ...prev };
            for (const c of list) {
              for (const s of subjects) {
                const k = `${c.id}:${s.id}`;
                if (k in grid.cells && c.classTeacherId) next[k] = c.classTeacherId;
              }
            }
            return next;
          });
        return (
          <section key={stage} aria-labelledby={`stage-${stage}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`stage-${stage}`} className="text-heading font-semibold">
                {STAGE_LABELS[stage]}{" "}
                <span className="text-label font-normal text-ink-secondary">
                  {stageUnassigned === 0 ? "all assigned" : `${stageUnassigned} without a teacher`}
                </span>
              </h2>
              {subjects.length > 0 && withClassTeacher.length > 0 && (
                <Button size="compact" icon={UserCheck} onClick={() => takeAll(withClassTeacher)}>
                  Class teachers take all {STAGE_LABELS[stage]} subjects
                </Button>
              )}
            </div>
            {subjects.length === 0 ? (
              <p className="text-ink-secondary">
                These classes do not take any subjects yet. Tick them on the Subjects page.
              </p>
            ) : (
              <div className="relative overflow-x-auto rounded-panel border border-divider bg-surface">
                <table className="border-collapse text-base">
                  <caption className="sr-only">
                    {STAGE_LABELS[stage]}: choose a teacher for each subject a class takes
                  </caption>
                  <thead className="bg-subtle">
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-10 border-b border-divider bg-subtle px-3 text-left text-label font-semibold text-ink-secondary"
                      >
                        Class
                      </th>
                      {subjects.map((s) => (
                        <th
                          key={s.id}
                          scope="col"
                          title={s.name}
                          className="w-40 border-b border-l border-divider px-2 py-1.5 text-left align-bottom text-label leading-tight font-semibold text-ink-secondary"
                        >
                          {s.shortName ?? s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-b border-divider bg-surface px-3 py-1 text-left font-medium whitespace-nowrap"
                        >
                          <span className="flex items-center justify-between gap-2">
                            {c.name}
                            {c.classTeacherId && (
                              <button
                                type="button"
                                onClick={() => takeAll([c])}
                                title={`${c.classTeacherName} takes all ${c.name} subjects`}
                                aria-label={`${c.classTeacherName} takes all ${c.name} subjects`}
                                className="inline-flex size-7 items-center justify-center rounded-control text-brand-strong hover:bg-subtle pointer-coarse:size-10"
                              >
                                <Icon icon={UserCheck} />
                              </button>
                            )}
                          </span>
                        </th>
                        {subjects.map((s) => {
                          const k = `${c.id}:${s.id}`;
                          if (!(k in grid.cells)) {
                            return (
                              <td
                                key={s.id}
                                className="border-b border-l border-divider bg-page px-2 text-center text-ink-secondary"
                              >
                                <span aria-hidden="true">—</span>
                                <span className="sr-only">
                                  {c.name} does not take {s.name}
                                </span>
                              </td>
                            );
                          }
                          const value = assigned[k] ?? "";
                          return (
                            <td
                              key={s.id}
                              className={cx(
                                "border-b border-l border-divider px-1 py-1",
                                !value && "bg-warning-bg",
                              )}
                            >
                              <select
                                value={value}
                                onChange={(e) => {
                                  const teacherId = e.target.value;
                                  setAssigned((prev) => ({ ...prev, [k]: teacherId }));
                                }}
                                aria-label={`${c.name} ${s.name} teacher`}
                                className="h-7 w-40 rounded-control border border-input bg-surface px-2 text-label text-ink pointer-coarse:h-10"
                              >
                                <option value="">No teacher</option>
                                {teachers.map((t) => (
                                  <option key={t.userId} value={t.userId}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-label text-ink-secondary">
        Shaded cells have no teacher yet. The person icon gives every subject in that class to its
        class teacher. A dash means the class does not take that subject (change this on the
        Subjects page).
      </p>
      {saveBar}
    </div>
  );
}
