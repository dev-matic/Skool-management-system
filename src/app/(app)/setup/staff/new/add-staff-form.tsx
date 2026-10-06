"use client";

import { useActionState } from "react";
import { Alert, Button, CheckboxGroup, Field, Input, LinkButton } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/domain/staff";
import { addStaffAction, type FormState } from "@/server/actions/staff";
import { ROLE_OPTIONS } from "../roles";

export function AddStaffForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addStaffAction, {});
  const errors = state.errors ?? {};
  const value = (key: string) => {
    const v = state.values?.[key];
    return typeof v === "string" ? v : "";
  };
  const roles = Array.isArray(state.values?.roles) ? state.values.roles : ["teacher"];

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5" noValidate>
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name} className="sm:col-span-2">
          <Input
            name="name"
            autoComplete="off"
            defaultValue={value("name")}
            key={`n${value("name")}`}
            autoFocus
          />
        </Field>
        <Field
          id="phone"
          label="Phone number"
          hint="They sign in with this number, e.g. 024 123 4567."
          error={errors.phone}
        >
          <Input
            name="phone"
            inputMode="tel"
            autoComplete="off"
            defaultValue={value("phone")}
            key={`p${value("phone")}`}
          />
        </Field>
        <Field id="email" label="Email" optional error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={value("email")}
            key={`e${value("email")}`}
          />
        </Field>
      </div>
      <CheckboxGroup
        name="roles"
        legend="Roles"
        options={ROLE_OPTIONS}
        defaultValues={roles}
        error={errors.roles}
        key={roles.join()}
      />
      <Field
        id="password"
        label="First password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Give it to them in person; they can keep using it.`}
        error={errors.password}
        className="max-w-sm"
      >
        <Input name="password" type="text" autoComplete="new-password" spellCheck={false} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Adding…" : "Add staff member"}
        </Button>
        <LinkButton href="/setup/staff">Cancel</LinkButton>
      </div>
    </form>
  );
}
