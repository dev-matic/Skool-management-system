"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, parseNewStaff, parseRoles } from "@/domain/staff";
import { requestMeta } from "../audit";
import { addStaff, resetStaffPassword, setStaffActive, setStaffRoles } from "../staff";
import { requireRole } from "../tenant";

/*
 * Staff screen actions. Server actions can be called directly, not only from
 * our forms, so each one checks the admin role itself.
 */

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** What the user typed, echoed back so nothing has to be retyped. */
  values?: Record<string, string | string[]>;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function addStaffAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const values = {
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    roles: form.getAll("roles").map(String),
  };
  const parsed = parseNewStaff({ ...values, password: text(form, "password") });
  if (!parsed.ok) return { errors: parsed.errors, values };

  const result = await addStaff(ctx, parsed.value, await requestMeta());
  if (!result.ok) {
    return { errors: { [result.field ?? "form"]: result.error }, values };
  }
  revalidatePath("/setup/staff");
  redirect(`/setup/staff/${result.userId}?notice=${encodeURIComponent(result.message)}`);
}

export async function setRolesAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const userId = text(form, "userId");
  const roles = parseRoles(form.getAll("roles").map(String));
  const result = await setStaffRoles(ctx, userId, roles, await requestMeta());
  if (!result.ok) return { errors: { [result.field ?? "form"]: result.error } };
  revalidatePath("/setup/staff");
  return { ok: true, message: result.message };
}

export async function setActiveAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const result = await setStaffActive(
    ctx,
    text(form, "userId"),
    text(form, "active") === "true",
    await requestMeta(),
  );
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/staff");
  return { ok: true, message: result.message };
}

export async function resetPasswordAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const password = text(form, "password");
  const problem = checkPassword(password);
  if (problem) return { errors: { password: problem } };
  const result = await resetStaffPassword(ctx, text(form, "userId"), password, await requestMeta());
  if (!result.ok) return { errors: { form: result.error } };
  return { ok: true, message: result.message };
}
