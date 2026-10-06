"use client";

import { useActionState, useState } from "react";
import { Alert, Button, CheckboxGroup, Field, Input } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/domain/staff";
import {
  resetPasswordAction,
  setActiveAction,
  setRolesAction,
  type FormState,
} from "@/server/actions/staff";
import { ROLE_OPTIONS } from "../roles";

function Result({ state }: { state: FormState }) {
  if (state.errors?.form) return <Alert tone="danger">{state.errors.form}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function RolesForm({ userId, roles }: { userId: string; roles: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setRolesAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <Result state={state} />
      <CheckboxGroup
        name="roles"
        legend="Roles in this school"
        options={ROLE_OPTIONS}
        defaultValues={roles}
        error={state.errors?.roles}
      />
      <div>
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : "Save roles"}
        </Button>
      </div>
    </form>
  );
}

/** Deactivating asks for confirmation first; reactivating does not. */
export function AccessForm({
  userId,
  name,
  active,
}: {
  userId: string;
  name: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(setActiveAction, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Result state={state} />
      {active && !confirming && (
        <div>
          <Button onClick={() => setConfirming(true)}>Deactivate…</Button>
        </div>
      )}
      {active && confirming && (
        <div
          role="group"
          aria-label="Confirm deactivation"
          className="flex flex-col gap-3 rounded-panel border border-divider bg-subtle px-3 py-3"
        >
          <p>
            Deactivate <strong className="font-semibold">{name}</strong>? They will no longer be
            able to sign in to this school. Their past records stay.
          </p>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={pending}>
              Deactivate {name}
            </Button>
            <Button onClick={() => setConfirming(false)} autoFocus>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!active && (
        <div>
          <Button type="submit" loading={pending}>
            {pending ? "Reactivating…" : "Reactivate"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function PasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-3" key={state.ok ? "done" : "form"}>
      <input type="hidden" name="userId" value={userId} />
      <Result state={state} />
      <Field
        id="new-password"
        label="New password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. They will be signed out everywhere.`}
        error={state.errors?.password}
        className="max-w-sm"
      >
        <Input name="password" type="text" autoComplete="new-password" spellCheck={false} />
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          {pending ? "Setting…" : "Set new password"}
        </Button>
      </div>
    </form>
  );
}
