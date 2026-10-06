import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { cache } from "react";
import { academicYear, school, term } from "@/db/schema";
import { diffChanges } from "@/domain/audit-diff";
import { todayIn, type IsoDate } from "@/domain/dates";
import {
  overlappingYear,
  termStatus,
  validateTerms,
  validateYear,
  type FieldErrors,
  type TermInput,
  type TermStatus,
  type YearInput,
} from "@/domain/terms";
import { recordAudit } from "./audit";
import { withTenant, type TenantContext } from "./tenant";

/*
 * Academic years and their terms (M2). A year and its terms are saved
 * together so the date rules are always checked as a whole.
 */

export interface TermRow {
  id: number;
  number: number;
  name: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
}

export interface YearWithTerms {
  id: number;
  name: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
  terms: TermRow[];
}

export type SaveYearResult = { ok: true; yearId: number } | { ok: false; errors: FieldErrors };

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

/** All years, newest first, each with its terms in order. */
export async function listYears(ctx: TenantContext): Promise<YearWithTerms[]> {
  return withTenant(ctx, async (tx) => {
    const years = await tx.select().from(academicYear).orderBy(desc(academicYear.startsOn));
    const terms = years.length
      ? await tx
          .select()
          .from(term)
          .where(
            inArray(
              term.academicYearId,
              years.map((y) => y.id),
            ),
          )
          .orderBy(asc(term.number))
      : [];
    return years.map((y) => ({
      id: y.id,
      name: y.name,
      startsOn: y.startsOn,
      endsOn: y.endsOn,
      terms: terms
        .filter((t) => t.academicYearId === y.id)
        .map((t) => ({
          id: t.id,
          number: t.number,
          name: t.name,
          startsOn: t.startsOn,
          endsOn: t.endsOn,
        })),
    }));
  });
}

export async function getYear(ctx: TenantContext, yearId: number) {
  return (await listYears(ctx)).find((y) => y.id === yearId) ?? null;
}

/**
 * Creates (yearId null) or updates a year and its terms. Terms are matched
 * by number: new numbers are added, missing numbers removed.
 */
export async function saveYear(
  ctx: TenantContext,
  yearId: number | null,
  input: YearInput & { terms: TermInput[] },
  meta: RequestMeta,
): Promise<SaveYearResult> {
  const errors: FieldErrors = { ...validateYear(input), ...validateTerms(input, input.terms) };
  if (input.terms.length === 0) errors.terms = "Add at least one term.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return withTenant(ctx, async (tx): Promise<SaveYearResult> => {
    const others = await tx
      .select()
      .from(academicYear)
      .where(yearId === null ? undefined : ne(academicYear.id, yearId));
    const clash = overlappingYear(input, others);
    if (clash) {
      return {
        ok: false,
        errors: { startsOn: `These dates overlap the ${clash.name} academic year.` },
      };
    }
    if (others.some((o) => o.name === input.name)) {
      return { ok: false, errors: { name: `There is already a ${input.name} academic year.` } };
    }

    const values = { name: input.name, startsOn: input.startsOn, endsOn: input.endsOn };
    let id: number;
    if (yearId === null) {
      const [created] = await tx
        .insert(academicYear)
        .values({ schoolId: ctx.schoolId, ...values })
        .returning();
      id = created!.id;
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "create",
        entityType: "academic_year",
        entityId: id,
        changes: diffChanges(null, values),
        ...meta,
      });
    } else {
      const [before] = await tx.select().from(academicYear).where(eq(academicYear.id, yearId));
      if (!before) return { ok: false, errors: { form: "This academic year no longer exists." } };
      await tx
        .update(academicYear)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(academicYear.id, yearId));
      id = yearId;
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "update",
        entityType: "academic_year",
        entityId: id,
        changes: diffChanges(
          { name: before.name, startsOn: before.startsOn, endsOn: before.endsOn },
          values,
        ),
        ...meta,
      });
    }

    const existing = await tx.select().from(term).where(eq(term.academicYearId, id));
    const wanted = new Map(input.terms.map((t) => [t.number, t]));
    // Removed terms go first, then dates are rewritten, so a shortened term
    // list never collides with the numbers being kept.
    for (const old of existing.filter((t) => !wanted.has(t.number))) {
      await tx.delete(term).where(eq(term.id, old.id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "delete",
        entityType: "term",
        entityId: old.id,
        changes: diffChanges({ name: old.name, startsOn: old.startsOn, endsOn: old.endsOn }, null),
        ...meta,
      });
    }
    for (const t of input.terms) {
      const old = existing.find((e) => e.number === t.number);
      const termValues = { name: t.name.trim(), startsOn: t.startsOn, endsOn: t.endsOn };
      if (old) {
        const changes = diffChanges(
          { name: old.name, startsOn: old.startsOn, endsOn: old.endsOn },
          termValues,
        );
        if (Object.keys(changes).length === 0) continue;
        await tx
          .update(term)
          .set({ ...termValues, updatedAt: new Date() })
          .where(eq(term.id, old.id));
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "update",
          entityType: "term",
          entityId: old.id,
          changes,
          ...meta,
        });
      } else {
        const [created] = await tx
          .insert(term)
          .values({ schoolId: ctx.schoolId, academicYearId: id, number: t.number, ...termValues })
          .returning();
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "create",
          entityType: "term",
          entityId: created!.id,
          changes: diffChanges(null, termValues),
          ...meta,
        });
      }
    }
    return { ok: true, yearId: id };
  });
}

export interface CurrentTerm {
  status: TermStatus<TermRow & { yearName: string }>;
  today: IsoDate;
}

/** The current term in the school's own time zone, for the top bar. */
export const getCurrentTerm = cache(async (ctx: TenantContext): Promise<CurrentTerm> => {
  return withTenant(ctx, async (tx) => {
    const [s] = await tx
      .select({ timezone: school.timezone })
      .from(school)
      .where(eq(school.id, ctx.schoolId));
    const today = todayIn(s?.timezone ?? "Africa/Accra");
    const rows = await tx
      .select({
        id: term.id,
        number: term.number,
        name: term.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        yearName: academicYear.name,
      })
      .from(term)
      .innerJoin(
        academicYear,
        and(eq(academicYear.id, term.academicYearId), eq(academicYear.schoolId, term.schoolId)),
      );
    return { status: termStatus(rows, today), today };
  });
});
