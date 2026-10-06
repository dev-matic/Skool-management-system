"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { signIn, type SignInState } from "@/server/actions/session";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && (
        <Alert tone="danger" data-testid="form-error">
          {state.error}
        </Alert>
      )}
      <Field id="identifier" label="Phone number or email">
        <Input
          name="identifier"
          type="text"
          autoComplete="username"
          autoFocus
          required
          placeholder="024 123 4567"
          defaultValue={state.identifier ?? ""}
          key={state.identifier ?? ""}
        />
      </Field>
      <Field id="password" label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" variant="primary" loading={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-label text-ink-secondary">
        Forgot your password? Ask your school administrator to reset it.
      </p>
    </form>
  );
}
