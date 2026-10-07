"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStage } from "@/domain/levels";
import { requestMeta } from "../audit";
import { requireRole } from "../tenant";
import {
  copyTimetable,
  deleteDayPlan,
  saveClassTimetable,
  saveDayPlan,
  saveRoom,
  type CellSave,
  type PlanSave,
} from "../timetable";

/* Timetable changes (admins only; each action and service checks). */

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  clashes?: string[];
  clashCells?: Record<string, string[]>;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const idOf = (form: FormData, key: string) => {
  const v = text(form, key);
  return /^\d+$/.test(v) ? Number(v) : null;
};

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Saves a day plan sent as JSON in the "plan" field. */
export async function saveDayPlanAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const termId = idOf(form, "termId");
  const raw = parseJson(text(form, "plan")) as Partial<PlanSave> | null;
  if (!termId || !raw || !Array.isArray(raw.periods)) {
    return { errors: { form: "Something went wrong reading the form. Reload and try again." } };
  }
  const plan: PlanSave = {
    id: typeof raw.id === "number" ? raw.id : undefined,
    name: String(raw.name ?? ""),
    days: (Array.isArray(raw.days) ? raw.days : []).map(Number).filter(Number.isInteger),
    stages: (Array.isArray(raw.stages) ? raw.stages : []).map(String).filter(isStage),
    periods: raw.periods.map((p) => ({
      id: typeof p?.id === "number" ? p.id : undefined,
      kind: p?.kind === "break" ? "break" : "lesson",
      name: String(p?.name ?? ""),
      startsAt: String(p?.startsAt ?? ""),
      endsAt: String(p?.endsAt ?? ""),
    })),
  };
  const result = await saveDayPlan(ctx, termId, plan, await requestMeta());
  if (!result.ok) {
    return {
      errors: { form: result.error, ...result.errors },
      clashes: result.clashes,
    };
  }
  revalidatePath("/timetable", "layout");
  redirect(`/timetable/plans?term=${termId}&saved=${encodeURIComponent(result.message)}`);
}

export async function deleteDayPlanAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const planId = idOf(form, "planId");
  const termId = idOf(form, "termId");
  if (!planId) return { errors: { form: "That day plan no longer exists." } };
  const result = await deleteDayPlan(ctx, planId, await requestMeta());
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/timetable", "layout");
  redirect(`/timetable/plans?term=${termId ?? ""}&saved=${encodeURIComponent(result.message)}`);
}

export async function addRoomAction(_previous: FormState, form: FormData): Promise<FormState> {
  const ctx = await requireRole("admin");
  const result = await saveRoom(ctx, { name: text(form, "name") }, await requestMeta());
  if (!result.ok) return { errors: { form: result.error, ...result.errors } };
  revalidatePath("/timetable", "layout");
  return { ok: true, message: result.message };
}

export async function setRoomArchivedAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const roomId = idOf(form, "roomId");
  if (!roomId) return { errors: { form: "That room no longer exists." } };
  const result = await saveRoom(
    ctx,
    { id: roomId, name: text(form, "name"), isArchived: text(form, "archive") === "1" },
    await requestMeta(),
  );
  if (!result.ok) return { errors: { form: result.error } };
  revalidatePath("/timetable", "layout");
  return { ok: true, message: result.message };
}

export async function copyTimetableAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const fromTermId = idOf(form, "fromTermId");
  const toTermId = idOf(form, "toTermId");
  if (!fromTermId || !toTermId) return { errors: { form: "Choose a term to copy from." } };
  const result = await copyTimetable(ctx, fromTermId, toTermId, await requestMeta());
  if (!result.ok) return { errors: { form: result.error }, clashes: result.clashes };
  revalidatePath("/timetable", "layout");
  redirect(`/timetable/plans?term=${toTermId}&saved=${encodeURIComponent(result.message)}`);
}

/**
 * Saves changed cells of a class timetable. Fields are
 * "cell-<periodId>-<day>" = "<subjectId>:<roomId>" ("" clears the cell).
 */
export async function saveClassTimetableAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const ctx = await requireRole("admin");
  const classId = idOf(form, "classId");
  const termId = idOf(form, "termId");
  if (!classId || !termId) return { errors: { form: "Reload the page and try again." } };
  const cells: CellSave[] = [];
  for (const [key, value] of form.entries()) {
    const m = /^cell-(\d+)-([1-7])$/.exec(key);
    if (!m) continue;
    const [subjectPart = "", roomPart = ""] = String(value).split(":");
    cells.push({
      periodId: Number(m[1]),
      day: Number(m[2]),
      subjectId: /^\d+$/.test(subjectPart) ? Number(subjectPart) : null,
      roomId: /^\d+$/.test(roomPart) ? Number(roomPart) : null,
    });
  }
  const result = await saveClassTimetable(ctx, classId, termId, cells, await requestMeta());
  if (!result.ok) {
    return {
      errors: { form: result.error },
      clashes: result.clashes,
      clashCells: result.clashCells,
    };
  }
  revalidatePath("/timetable", "layout");
  revalidatePath("/dashboard");
  return { ok: true, message: result.message };
}
