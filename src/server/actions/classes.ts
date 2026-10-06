"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkName, isStage } from "@/domain/levels";
import { requestMeta } from "../audit";
import {
  addStandardLevels,
  deleteClass,
  deleteLevel,
  moveLevel,
  saveClass,
  saveLevel,
} from "../classes";
import { requireRole } from "../tenant";

/* Classes and grade levels (admins only; each action checks). */

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const id = (form: FormData, key: string) => {
  const v = text(form, key);
  return /^\d+$/.test(v) ? Number(v) : null;
};
const valuesOf = (form: FormData) =>
  Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));

export async function saveClassAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const values = valuesOf(form);
  const classId = id(form, "classId");
  const yearId = id(form, "yearId");
  const gradeLevelId = id(form, "gradeLevelId");
  const { name, error } = checkName(text(form, "name"), "class");
  const errors: Record<string, string> = {};
  if (error) errors.name = error;
  if (!gradeLevelId) errors.gradeLevelId = "Choose a level.";
  if (!yearId) errors.form = "Choose an academic year first.";
  if (Object.keys(errors).length > 0) return { errors, values };

  const result = await saveClass(
    ctx,
    classId,
    {
      academicYearId: yearId!,
      gradeLevelId: gradeLevelId!,
      name,
      classTeacherId: text(form, "classTeacherId") || null,
    },
    await requestMeta(),
  );
  if (!result.ok) return { errors: { [result.field ?? "form"]: result.error }, values };
  revalidatePath("/setup/classes");
  if (classId) redirect(`/setup/classes?year=${yearId}`);
  // Adding stays on the page with an empty row, ready for the next class.
  return { ok: true, message: `${name} added.` };
}

export async function deleteClassAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const result = await deleteClass(ctx, id(form, "classId") ?? 0, await requestMeta());
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/classes");
  redirect(`/setup/classes?year=${text(form, "yearId")}`);
}

export async function saveLevelAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const values = valuesOf(form);
  const levelId = id(form, "levelId");
  const { name, error } = checkName(text(form, "name"), "level");
  const stage = text(form, "stage");
  const errors: Record<string, string> = {};
  if (error) errors.name = error;
  if (!isStage(stage)) errors.stage = "Choose a stage.";
  if (Object.keys(errors).length > 0 || !isStage(stage)) return { errors, values };

  const result = await saveLevel(ctx, levelId, { name, stage }, await requestMeta());
  if (!result.ok) return { errors: { [result.field ?? "form"]: result.error }, values };
  revalidatePath("/setup/classes");
  if (levelId) redirect("/setup/classes");
  return { ok: true, message: `${name} added.` };
}

export async function deleteLevelAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const result = await deleteLevel(ctx, id(form, "levelId") ?? 0, await requestMeta());
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/setup/classes");
  redirect("/setup/classes");
}

export async function moveLevelAction(form: FormData): Promise<void> {
  const ctx = await requireRole("admin");
  const levelId = id(form, "levelId");
  if (levelId) await moveLevel(ctx, levelId, text(form, "direction") === "up" ? -1 : 1);
  revalidatePath("/setup/classes");
}

export async function addStandardLevelsAction(): Promise<void> {
  const ctx = await requireRole("admin");
  await addStandardLevels(ctx, await requestMeta());
  revalidatePath("/setup/classes");
}
