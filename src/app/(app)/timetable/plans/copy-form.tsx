"use client";

import { Copy } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button, Select } from "@/components/ui";
import { copyTimetableAction, type FormState } from "@/server/actions/timetable";
import type { TermChoice } from "@/server/timetable";

/** Starts an empty term from another term's day plans and lessons. */
export function CopyForm({ toTerm, sources }: { toTerm: TermChoice; sources: TermChoice[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(copyTimetableAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="toTermId" value={toTerm.id} />
      {state.errors?.form && (
        <Alert tone="danger" title={state.errors.form}>
          {state.clashes && (
            <ul className="mt-1 list-disc pl-5">
              {state.clashes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <p>
        Copy the day plans and lessons of another term into {toTerm.name}, {toTerm.yearName}.
        Lessons take today&apos;s teacher for each class and subject; you can change them after.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="copy-from" className="text-label font-semibold">
            Copy from
          </label>
          <Select
            id="copy-from"
            name="fromTermId"
            defaultValue={sources.at(-1)?.id}
            className="w-56"
          >
            {sources.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}, {t.yearName}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" icon={Copy} loading={pending}>
          Copy timetable
        </Button>
      </div>
    </form>
  );
}
