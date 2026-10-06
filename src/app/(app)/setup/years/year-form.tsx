"use client";

import { Minus, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, DateInput, Field, Input, LinkButton } from "@/components/ui";
import { parseDisplayDate } from "@/domain/dates";
import { suggestYearName } from "@/domain/terms";
import { saveYearAction, type YearFormState } from "@/server/actions/academic-years";

const MAX_TERMS = 6;

export interface YearFormInitial {
  yearId?: number;
  name: string;
  startsOn: string; // dd/mm/yyyy
  endsOn: string;
  terms: { name: string; startsOn: string; endsOn: string }[];
}

export function YearForm({ initial }: { initial: YearFormInitial }) {
  const [state, action, pending] = useActionState<YearFormState, FormData>(saveYearAction, {});
  const errors = state.errors ?? {};
  const echoed = state.values;
  const [termCount, setTermCount] = useState(
    echoed?.termCount ? Number(echoed.termCount) : initial.terms.length,
  );
  const [name, setName] = useState(echoed?.name ?? initial.name);

  const value = (key: string, fallback: string) => echoed?.[key] ?? fallback;
  // Re-mount inputs when the server echoes values back, so they show what was typed.
  const formKey = echoed ? JSON.stringify(echoed) : "initial";
  const termErrorCount = Object.keys(errors).filter((k) => k.startsWith("term")).length;

  return (
    <form action={action} className="flex max-w-4xl flex-col gap-5" noValidate key={formKey}>
      {initial.yearId && <input type="hidden" name="yearId" value={initial.yearId} />}
      <input type="hidden" name="termCount" value={termCount} />
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      {Object.keys(errors).length > 0 && !errors.form && (
        <Alert tone="danger" title="Please check the highlighted fields.">
          {termErrorCount > 0 && "Some term dates need attention."}
        </Alert>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-heading font-semibold">Academic year</legend>
        <Field id="startsOn" label="Starts" error={errors.startsOn}>
          <DateInput
            name="startsOn"
            defaultValue={value("startsOn", initial.startsOn)}
            autoFocus
            onBlur={(e) => {
              const iso = parseDisplayDate(e.currentTarget.value);
              if (iso && !name.trim()) setName(suggestYearName(iso));
            }}
          />
        </Field>
        <Field id="endsOn" label="Ends" error={errors.endsOn}>
          <DateInput name="endsOn" defaultValue={value("endsOn", initial.endsOn)} />
        </Field>
        <Field id="name" label="Name" hint="e.g. 2026/2027" error={errors.name}>
          <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-heading font-semibold">Terms</legend>
        {errors.terms && <p className="font-medium text-danger">{errors.terms}</p>}
        {Array.from({ length: termCount }, (_, i) => {
          const n = i + 1;
          const initialTerm = initial.terms[i] ?? { name: `Term ${n}`, startsOn: "", endsOn: "" };
          return (
            <div
              key={n}
              role="group"
              aria-label={`Term ${n}`}
              className="grid gap-3 rounded-panel border border-card-edge bg-surface shadow-card px-3 py-3 sm:grid-cols-[3rem_1fr_1fr_1fr]"
            >
              <span className="self-center text-label font-semibold text-ink-secondary">{n}</span>
              <Field
                id={`term${n}.name`}
                label="Name"
                error={errors[`term${n}.name`] ?? errors[`term${n}.number`]}
              >
                <Input
                  name={`term${n}.name`}
                  defaultValue={value(`term${n}.name`, initialTerm.name)}
                />
              </Field>
              <Field id={`term${n}.startsOn`} label="Starts" error={errors[`term${n}.startsOn`]}>
                <DateInput
                  name={`term${n}.startsOn`}
                  defaultValue={value(`term${n}.startsOn`, initialTerm.startsOn)}
                />
              </Field>
              <Field id={`term${n}.endsOn`} label="Ends" error={errors[`term${n}.endsOn`]}>
                <DateInput
                  name={`term${n}.endsOn`}
                  defaultValue={value(`term${n}.endsOn`, initialTerm.endsOn)}
                />
              </Field>
            </div>
          );
        })}
        <div className="flex gap-2">
          <Button
            size="compact"
            icon={Plus}
            disabled={termCount >= MAX_TERMS}
            onClick={() => setTermCount((c) => Math.min(c + 1, MAX_TERMS))}
          >
            Add term
          </Button>
          <Button
            size="compact"
            icon={Minus}
            disabled={termCount <= 1}
            onClick={() => setTermCount((c) => Math.max(c - 1, 1))}
          >
            Remove last term
          </Button>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Saving…" : "Save academic year"}
        </Button>
        <LinkButton href="/setup/years">Cancel</LinkButton>
      </div>
    </form>
  );
}
