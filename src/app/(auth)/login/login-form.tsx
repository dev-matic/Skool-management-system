"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/server/actions/session";

const inputClass =
  "mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-blue-600 focus:outline-2 focus:outline-blue-600";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {state.error && (
        <p
          role="alert"
          data-testid="form-error"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium">
          Phone number or email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoFocus
          required
          placeholder="024 123 4567"
          defaultValue={state.identifier ?? ""}
          key={state.identifier ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-slate-500">
        Forgot your password? Ask your school administrator to reset it.
      </p>
    </form>
  );
}
