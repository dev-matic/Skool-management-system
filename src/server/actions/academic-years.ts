"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDisplayDate } from "@/domain/dates";
import type { TermInput } from "@/domain/terms";
import { requestMeta } from "../audit";
import { saveYear } from "../academic-years";
import { requireRole } from "../tenant";

export interface YearFormState {
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

const MAX_TERMS = 6;
const BAD_DATE = "Enter a date as dd/mm/yyyy, e.g. 08/09/2026.";

/** Saves a new (no yearId) or edited academic year with its terms. Admins only. */
export async function saveYearAction(
  _previous: YearFormState,
  form: FormData,
): Promise<YearFormState> {
  const ctx = await requireRole("admin");
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) values[key] = String(value);

  const errors: Record<string, string> = {};
  const date = (field: string) => {
    const typed = (values[field] ?? "").trim();
    const iso = parseDisplayDate(typed);
    if (!iso) errors[field] = typed ? BAD_DATE : "Enter a date.";
    return iso ?? "";
  };

  const startsOn = date("startsOn");
  const endsOn = date("endsOn");
  const count = Math.min(Math.max(Number(values.termCount) || 0, 0), MAX_TERMS);
  const terms: TermInput[] = [];
  for (let n = 1; n <= count; n++) {
    terms.push({
      number: n,
      name: values[`term${n}.name`] ?? "",
      startsOn: date(`term${n}.startsOn`),
      endsOn: date(`term${n}.endsOn`),
    });
  }
  // Date format problems first; the date rules only make sense on real dates.
  if (Object.keys(errors).length > 0) return { errors, values };

  const yearId = values.yearId ? Number(values.yearId) : null;
  const result = await saveYear(
    ctx,
    yearId,
    { name: (values.name ?? "").trim(), startsOn, endsOn, terms },
    await requestMeta(),
  );
  if (!result.ok) return { errors: result.errors, values };

  revalidatePath("/setup/years");
  revalidatePath("/", "layout");
  redirect(`/setup/years?saved=${result.yearId}`);
}
