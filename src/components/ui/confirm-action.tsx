"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
import { Alert } from "./alert";
import { Button } from "./button";

interface ActionState {
  errors?: Record<string, string>;
}

/**
 * A destructive action that asks first (docs/design-system.md, Dialog and
 * confirmation): the first button only reveals the question; the danger
 * button inside it does the work. Cancel is focused, so Enter is safe.
 */
export function ConfirmAction({
  action,
  label,
  question,
  confirmLabel,
  hidden,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  label: string;
  question: ReactNode;
  confirmLabel: string;
  /** Hidden form fields, e.g. the id of the thing being deleted. */
  hidden: Record<string, string | number>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.errors?.form && <Alert tone="danger">{state.errors.form}</Alert>}
      {confirming ? (
        <div
          role="group"
          aria-label={label}
          className="flex flex-col gap-3 rounded-panel border border-divider bg-subtle px-3 py-3"
        >
          <p>{question}</p>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={pending}>
              {confirmLabel}
            </Button>
            <Button onClick={() => setConfirming(false)} autoFocus>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button icon={Trash2} onClick={() => setConfirming(true)}>
            {label}…
          </Button>
        </div>
      )}
    </form>
  );
}
