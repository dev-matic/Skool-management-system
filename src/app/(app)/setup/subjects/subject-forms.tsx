"use client";

import { Plus, Save } from "lucide-react";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { Alert, Button, Field, Input, LinkButton, StatusChip, cx } from "@/components/ui";
import {
  archiveSubjectAction,
  saveMatrixAction,
  saveSubjectAction,
  type FormState,
} from "@/server/actions/subjects";

export function AddSubjectForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSubjectAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      nameRef.current?.focus();
    }
  }, [state]);
  const errors = state.ok ? {} : (state.errors ?? {});
  const v = state.ok ? {} : (state.values ?? {});
  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      aria-label="Add a subject"
      className="flex flex-col gap-2 rounded-panel border border-divider bg-surface px-3 py-3"
    >
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="grid items-start gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <Field id="new-subject-name" label="Subject name" error={errors.name}>
          <Input
            ref={nameRef}
            name="name"
            placeholder="e.g. Integrated Science"
            defaultValue={v.name}
            key={`s${v.name}`}
          />
        </Field>
        <Field
          id="new-subject-short"
          label="Short name"
          optional
          hint="For narrow columns, e.g. Int. Sci."
        >
          <Input
            name="shortName"
            maxLength={12}
            defaultValue={v.shortName}
            key={`h${v.shortName}`}
          />
        </Field>
        <Button type="submit" icon={Plus} loading={pending} className="sm:mt-[1.375rem]">
          Add subject
        </Button>
      </div>
    </form>
  );
}

export function EditSubjectForm({
  initial,
}: {
  initial: { subjectId: number; name: string; shortName: string | null };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSubjectAction, {});
  const errors = state.errors ?? {};
  const v = state.values;
  return (
    <form
      action={action}
      noValidate
      className="flex max-w-lg flex-col gap-4"
      key={JSON.stringify(v ?? {})}
    >
      <input type="hidden" name="subjectId" value={initial.subjectId} />
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      <Field id="subject-name" label="Subject name" error={errors.name}>
        <Input name="name" defaultValue={v?.name ?? initial.name} />
      </Field>
      <Field
        id="subject-short"
        label="Short name"
        optional
        hint="For narrow columns, e.g. Int. Sci."
      >
        <Input
          name="shortName"
          maxLength={12}
          defaultValue={v?.shortName ?? initial.shortName ?? ""}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Saving…" : "Save subject"}
        </Button>
        <LinkButton href="/setup/subjects">Cancel</LinkButton>
      </div>
    </form>
  );
}

export function ArchiveSubjectForm({
  subjectId,
  archived,
}: {
  subjectId: number;
  archived: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(archiveSubjectAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="archived" value={archived ? "false" : "true"} />
      {state.errors?.form && <Alert tone="danger">{state.errors.form}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <p className="text-ink-secondary">
        {archived
          ? "Archived subjects are hidden from the grid and new score sheets. Their past records stay."
          : "Archive a subject the school no longer teaches. Classes already taking it keep it."}
      </p>
      <div>
        <Button type="submit" loading={pending}>
          {archived ? "Restore subject" : "Archive subject"}
        </Button>
      </div>
    </form>
  );
}

interface MatrixProps {
  yearId: number;
  classes: { id: number; name: string }[];
  subjects: { id: number; name: string; shortName: string | null }[];
  taken: string[];
}

/**
 * Which classes take which subjects, as one grid. Changes are kept in the
 * page until "Save", and leaving with unsaved changes asks first.
 */
export function SubjectMatrix({ yearId, classes, subjects, taken }: MatrixProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMatrixAction, {});
  const formId = useId();
  const initial = useMemo(() => new Set(taken), [taken]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(taken));
  // When saved data comes back from the server, show it without remounting,
  // so the "Saved" message stays visible.
  const takenKey = [...taken].sort().join();
  const [syncedKey, setSyncedKey] = useState(takenKey);
  if (syncedKey !== takenKey) {
    setSyncedKey(takenKey);
    setChecked(new Set(taken));
  }
  const key = (c: number, s: number) => `${c}:${s}`;
  const dirty = checked.size !== initial.size || [...checked].some((k) => !initial.has(k));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setMany = (keys: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  const toggleGroup = (keys: string[]) => setMany(keys, !keys.every((k) => checked.has(k)));

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
        {pending ? "Saving…" : "Save subjects by class"}
      </Button>
      {dirty && <StatusChip status="unsaved" />}
    </div>
  );

  return (
    // The checkboxes sit outside the <form>: React resets a form after a
    // successful action, which would untick them on screen. Only the hidden
    // fields are submitted; the Save buttons point at the form by id.
    <div className="flex flex-col gap-3" role="group" aria-label="Subjects by class">
      <form id={formId} action={action} className="hidden">
        <input type="hidden" name="yearId" value={yearId} />
        {[...checked].map((k) => (
          <input key={k} type="hidden" name="taken" value={k} />
        ))}
      </form>
      {state.errors?.form && <Alert tone="danger">{state.errors.form}</Alert>}
      {state.ok && state.message && !dirty && <Alert tone="success">{state.message}</Alert>}
      {saveBar}
      <div className="overflow-x-auto rounded-panel border border-divider bg-surface">
        <table className="border-collapse text-base">
          <caption className="sr-only">Tick the subjects each class takes</caption>
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
                  className="border-b border-l border-divider px-1.5 py-1.5 align-bottom text-label font-semibold text-ink-secondary"
                >
                  <button
                    type="button"
                    title={`${s.name}: tick or untick every class`}
                    onClick={() => toggleGroup(classes.map((c) => key(c.id, s.id)))}
                    className="block w-20 rounded-control px-1 py-0.5 text-center leading-tight hover:bg-surface hover:text-ink"
                  >
                    {s.shortName ?? s.name}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const rowKeys = subjects.map((s) => key(c.id, s.id));
              return (
                <tr key={c.id} className="hover:bg-row-hover">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-divider bg-surface px-3 py-1 text-left font-medium whitespace-nowrap"
                  >
                    <button
                      type="button"
                      title={`${c.name}: tick or untick every subject`}
                      onClick={() => toggleGroup(rowKeys)}
                      className="rounded-control px-1 hover:bg-subtle"
                    >
                      {c.name}
                    </button>
                  </th>
                  {subjects.map((s) => {
                    const k = key(c.id, s.id);
                    const on = checked.has(k);
                    return (
                      <td
                        key={s.id}
                        className={cx(
                          "border-b border-l border-divider p-0 text-center",
                          on && "bg-brand-tint",
                        )}
                      >
                        <label className="flex h-9 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setMany([k], !on)}
                            aria-label={`${c.name}: ${s.name}`}
                            className="size-4 pointer-coarse:size-5"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-label text-ink-secondary">
        Click a class or subject name to tick or untick its whole row or column. Unticking a subject
        also removes its teacher for that class.
      </p>
      {saveBar}
    </div>
  );
}
