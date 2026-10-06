"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestMeta } from "../audit";
import { deleteSubject, saveMatrix, saveSubject, setSubjectArchived } from "../subjects";
import { requireRole } from "../tenant";

/* Subjects and the class-subject grid (admins only; each action checks). */

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const idOf = (form: FormData, key: string) => {
  const v = text(form, key);
  return /^\d+$/.test(v) ? Number(v) : null;
};

function checkSubjectName(raw: string): { name: string; error?: string } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) return { name, error: "Enter the subject name, e.g. Integrated Science." };
  if (name.length > 60) return { name, error: "Use at most 60 characters." };
  return { name };
}

export async function saveSubjectAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const values = { name: text(form, "name"), shortName: text(form, "shortName") };
  const subjectId = idOf(form, "subjectId");
  const { name, error } = checkSubjectName(values.name);
  const shortName = values.shortName.slice(0, 12) || null;
  if (error) return { errors: { name: error }, values };

  const result = await saveSubject(ctx, subjectId, { name, shortName }, await requestMeta());
  if (!result.ok) return { errors: { [result.field ?? "form"]: result.error }, values };
  revalidatePath("/setup/subjects");
  if (subjectId) redirect("/setup/subjects");
  return { ok: true, message: `${name} added.` };
}

export async function archiveSubjectAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const result = await setSubjectArchived(
    ctx,
    idOf(form, "subjectId") ?? 0,
    text(form, "archived") === "true",
    await requestMeta(),
  );
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/subjects");
  return { ok: true, message: result.message };
}

export async function deleteSubjectAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const result = await deleteSubject(ctx, idOf(form, "subjectId") ?? 0, await requestMeta());
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/subjects");
  redirect("/setup/subjects");
}

export async function saveMatrixAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const yearId = idOf(form, "yearId");
  if (!yearId) return { errors: { form: "Choose an academic year first." } };
  const result = await saveMatrix(
    ctx,
    yearId,
    { add: form.getAll("add").map(String), remove: form.getAll("remove").map(String) },
    await requestMeta(),
  );
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/subjects");
  revalidatePath("/setup/classes");
  return { ok: true, message: result.message };
}
