"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, type ComponentProps } from "react";
import { Alert, Button, Field, Input, LinkButton, Select } from "@/components/ui";
import { STAGE_LABELS, STAGES } from "@/domain/levels";
import { saveClassAction, saveLevelAction, type FormState } from "@/server/actions/classes";

interface Option {
  id: number | string;
  name: string;
}

// The wrappers pass id and aria-* through, so Field can link the label and errors.
type SelectProps = Omit<ComponentProps<typeof Select>, "children" | "defaultValue">;

function TeacherSelect({
  teachers,
  defaultValue,
  ...props
}: SelectProps & { teachers: Option[]; defaultValue?: string }) {
  return (
    <Select {...props} name="classTeacherId" defaultValue={defaultValue ?? ""}>
      <option value="">No class teacher yet</option>
      {teachers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}

function LevelSelect({
  levels,
  defaultValue,
  ...props
}: SelectProps & { levels: Option[]; defaultValue?: string }) {
  return (
    <Select {...props} name="gradeLevelId" defaultValue={defaultValue ?? ""}>
      <option value="" disabled>
        Choose a level
      </option>
      {levels.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </Select>
  );
}

/**
 * Adds a class and stays ready for the next one: after saving, the form
 * clears and focus returns to the name, so a whole school can be entered
 * from the keyboard.
 */
export function AddClassForm({
  yearId,
  levels,
  teachers,
}: {
  yearId: number;
  levels: Option[];
  teachers: Option[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveClassAction, {});
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
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
      aria-label="Add a class"
      className="flex flex-col gap-2 rounded-panel border border-card-edge bg-surface shadow-card px-3 py-3"
    >
      <input type="hidden" name="yearId" value={yearId} />
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
        <Field id="new-class-name" label="Class name" error={errors.name}>
          <Input
            ref={nameRef}
            name="name"
            placeholder="e.g. JHS 2A"
            defaultValue={v.name}
            key={`n${v.name}`}
          />
        </Field>
        <Field id="new-class-level" label="Level" error={errors.gradeLevelId}>
          <LevelSelect levels={levels} defaultValue={v.gradeLevelId} />
        </Field>
        <Field id="new-class-teacher" label="Class teacher" optional error={errors.classTeacherId}>
          <TeacherSelect teachers={teachers} defaultValue={v.classTeacherId} />
        </Field>
        <Button
          type="submit"
          variant="primary"
          icon={Plus}
          loading={pending}
          className="sm:mt-[1.375rem]"
        >
          Add class
        </Button>
      </div>
    </form>
  );
}

export function EditClassForm({
  initial,
  levels,
  teachers,
}: {
  initial: {
    classId: number;
    yearId: number;
    name: string;
    gradeLevelId: number;
    classTeacherId: string | null;
  };
  levels: Option[];
  teachers: Option[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveClassAction, {});
  const errors = state.errors ?? {};
  const v = state.values;
  return (
    <form
      action={action}
      noValidate
      className="flex max-w-lg flex-col gap-4"
      key={JSON.stringify(v ?? {})}
    >
      <input type="hidden" name="classId" value={initial.classId} />
      <input type="hidden" name="yearId" value={initial.yearId} />
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      <Field id="class-name" label="Class name" error={errors.name}>
        <Input name="name" defaultValue={v?.name ?? initial.name} />
      </Field>
      <Field id="class-level" label="Level" error={errors.gradeLevelId}>
        <LevelSelect
          levels={levels}
          defaultValue={v?.gradeLevelId ?? String(initial.gradeLevelId)}
        />
      </Field>
      <Field id="class-teacher" label="Class teacher" optional error={errors.classTeacherId}>
        <TeacherSelect
          teachers={teachers}
          defaultValue={v?.classTeacherId ?? initial.classTeacherId ?? ""}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Saving…" : "Save class"}
        </Button>
        <LinkButton href={`/setup/classes?year=${initial.yearId}`}>Cancel</LinkButton>
      </div>
    </form>
  );
}

function StageSelect({ defaultValue, ...props }: SelectProps & { defaultValue?: string }) {
  return (
    <Select {...props} name="stage" defaultValue={defaultValue ?? ""}>
      <option value="" disabled>
        Choose a stage
      </option>
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}

export function AddLevelForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLevelAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  const errors = state.ok ? {} : (state.errors ?? {});
  const v = state.ok ? {} : (state.values ?? {});
  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      aria-label="Add a level"
      className="flex flex-col gap-2"
    >
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field id="new-level-name" label="Level name" error={errors.name}>
          <Input name="name" placeholder="e.g. SHS 1" defaultValue={v.name} key={`l${v.name}`} />
        </Field>
        <Field id="new-level-stage" label="Stage" error={errors.stage}>
          <StageSelect defaultValue={v.stage} />
        </Field>
        <Button type="submit" icon={Plus} loading={pending} className="sm:mt-[1.375rem]">
          Add level
        </Button>
      </div>
    </form>
  );
}

export function EditLevelForm({
  initial,
}: {
  initial: { levelId: number; name: string; stage: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLevelAction, {});
  const errors = state.errors ?? {};
  const v = state.values;
  return (
    <form
      action={action}
      noValidate
      className="flex max-w-lg flex-col gap-4"
      key={JSON.stringify(v ?? {})}
    >
      <input type="hidden" name="levelId" value={initial.levelId} />
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      <Field id="level-name" label="Level name" error={errors.name}>
        <Input name="name" defaultValue={v?.name ?? initial.name} />
      </Field>
      <Field id="level-stage" label="Stage" error={errors.stage}>
        <StageSelect defaultValue={v?.stage ?? initial.stage} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Saving…" : "Save level"}
        </Button>
        <LinkButton href="/setup/classes">Cancel</LinkButton>
      </div>
    </form>
  );
}
