"use server";

import { revalidatePath } from "next/cache";
import { requestMeta } from "../audit";
import { saveAssignments } from "../assignments";
import { requireRole } from "../tenant";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/** Saves the teacher grid. Fields are "cs-<classSubjectId>" = teacher id or "". Admins only. */
export async function saveAssignmentsAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const yearId = Number(form.get("yearId"));
  if (!Number.isInteger(yearId) || yearId <= 0) {
    return { errors: { form: "Choose an academic year first." } };
  }
  const entries = [...form.entries()]
    .filter(([key]) => /^cs-\d+$/.test(key))
    .map(([key, value]) => ({
      classSubjectId: Number(key.slice(3)),
      teacherId: String(value) || null,
    }));
  const result = await saveAssignments(ctx, yearId, entries, await requestMeta());
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/teachers");
  revalidatePath("/dashboard");
  return { ok: true, message: result.message };
}
