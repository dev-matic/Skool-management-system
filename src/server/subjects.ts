import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { classGroup, classSubject, gradeLevel, subject } from "@/db/schema";
import { diffChanges } from "@/domain/audit-diff";
import { recordAudit } from "./audit";
import { PG_FOREIGN_KEY, PG_UNIQUE, pgCode } from "./db-errors";
import { withTenant, type TenantContext } from "./tenant";

/*
 * Subjects and which classes take them (M2). Subjects in use are archived
 * rather than deleted, so past reports keep their subject names.
 */

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export type Result =
  { ok: true; id?: number; message?: string } | { ok: false; error: string; field?: string };

export interface SubjectRow {
  id: number;
  name: string;
  shortName: string | null;
  isArchived: boolean;
  /** Classes taking it in the chosen year. */
  classCount: number;
}

export interface Matrix {
  classes: { id: number; name: string; levelName: string }[];
  subjects: { id: number; name: string; shortName: string | null }[];
  /** "classId:subjectId" for each subject a class takes. */
  taken: Set<string>;
}

export const pairKey = (classId: number, subjectId: number) => `${classId}:${subjectId}`;

export async function listSubjects(
  ctx: TenantContext,
  yearId: number | null,
): Promise<SubjectRow[]> {
  return withTenant(ctx, async (tx) => {
    const subjects = await tx
      .select()
      .from(subject)
      .orderBy(asc(subject.isArchived), asc(subject.name));
    const counts = yearId
      ? await tx
          .select({ subjectId: classSubject.subjectId, n: count() })
          .from(classSubject)
          .innerJoin(classGroup, eq(classGroup.id, classSubject.classGroupId))
          .where(eq(classGroup.academicYearId, yearId))
          .groupBy(classSubject.subjectId)
      : [];
    const bySubject = new Map(counts.map((c) => [c.subjectId, Number(c.n)]));
    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      isArchived: s.isArchived,
      classCount: bySubject.get(s.id) ?? 0,
    }));
  });
}

export async function getSubject(ctx: TenantContext, id: number) {
  return withTenant(ctx, async (tx) => {
    const [row] = await tx.select().from(subject).where(eq(subject.id, id));
    return row ?? null;
  });
}

export async function saveSubject(
  ctx: TenantContext,
  id: number | null,
  input: { name: string; shortName: string | null },
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      if (id === null) {
        const [created] = await tx
          .insert(subject)
          .values({ schoolId: ctx.schoolId, ...input })
          .returning();
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "create",
          entityType: "subject",
          entityId: created!.id,
          changes: diffChanges(null, input),
          ...meta,
        });
        return { ok: true, id: created!.id };
      }
      const [before] = await tx.select().from(subject).where(eq(subject.id, id));
      if (!before) return { ok: false, error: "This subject no longer exists." };
      await tx
        .update(subject)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(subject.id, id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "update",
        entityType: "subject",
        entityId: id,
        changes: diffChanges({ name: before.name, shortName: before.shortName }, input),
        ...meta,
      });
      return { ok: true, id };
    });
  } catch (error) {
    if (pgCode(error) === PG_UNIQUE) {
      return {
        ok: false,
        field: "name",
        error: `There is already a subject called ${input.name}.`,
      };
    }
    throw error;
  }
}

export async function setSubjectArchived(
  ctx: TenantContext,
  id: number,
  archived: boolean,
  meta: RequestMeta,
): Promise<Result> {
  return withTenant(ctx, async (tx) => {
    const [before] = await tx.select().from(subject).where(eq(subject.id, id));
    if (!before) return { ok: false, error: "This subject no longer exists." };
    await tx
      .update(subject)
      .set({ isArchived: archived, updatedAt: new Date() })
      .where(eq(subject.id, id));
    await recordAudit(tx, {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: "update",
      entityType: "subject",
      entityId: id,
      changes: { isArchived: [before.isArchived, archived] },
      ...meta,
    });
    return {
      ok: true,
      message: archived ? `${before.name} archived.` : `${before.name} restored.`,
    };
  });
}

/** Deletes a subject no class takes. Otherwise the database refuses and we explain. */
export async function deleteSubject(
  ctx: TenantContext,
  id: number,
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      const [before] = await tx.select().from(subject).where(eq(subject.id, id));
      if (!before) return { ok: true };
      await tx.delete(subject).where(eq(subject.id, id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "delete",
        entityType: "subject",
        entityId: id,
        changes: diffChanges({ name: before.name, shortName: before.shortName }, null),
        ...meta,
      });
      return { ok: true };
    });
  } catch (error) {
    if (pgCode(error) === PG_FOREIGN_KEY) {
      return {
        ok: false,
        error:
          "Some classes take this subject. Archive it instead, or untick it for every class first.",
      };
    }
    throw error;
  }
}

/** Classes of a year (in level order) against active subjects. */
export async function getMatrix(ctx: TenantContext, yearId: number): Promise<Matrix> {
  return withTenant(ctx, async (tx) => {
    const classes = await tx
      .select({ id: classGroup.id, name: classGroup.name, levelName: gradeLevel.name })
      .from(classGroup)
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .where(eq(classGroup.academicYearId, yearId))
      .orderBy(asc(gradeLevel.sortOrder), asc(classGroup.name));
    const subjects = await tx
      .select({ id: subject.id, name: subject.name, shortName: subject.shortName })
      .from(subject)
      .where(eq(subject.isArchived, false))
      .orderBy(asc(subject.name));
    const links = classes.length
      ? await tx
          .select({ classGroupId: classSubject.classGroupId, subjectId: classSubject.subjectId })
          .from(classSubject)
          .where(
            inArray(
              classSubject.classGroupId,
              classes.map((c) => c.id),
            ),
          )
      : [];
    return {
      classes,
      subjects,
      taken: new Set(links.map((l) => pairKey(l.classGroupId, l.subjectId))),
    };
  });
}

/**
 * Applies the ticks added and removed on the class-subject grid for a year.
 * Only the changes are sent, so two people editing at once never undo each
 * other's work. Only active subjects of this year's classes can change;
 * links to archived subjects are kept. Removing a subject also removes its
 * teacher for that class.
 */
export async function saveMatrix(
  ctx: TenantContext,
  yearId: number,
  change: { add: readonly string[]; remove: readonly string[] },
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      const classes = await tx
        .select({ id: classGroup.id, name: classGroup.name })
        .from(classGroup)
        .where(eq(classGroup.academicYearId, yearId));
      const subjects = await tx
        .select({ id: subject.id, name: subject.name })
        .from(subject)
        .where(eq(subject.isArchived, false));
      if (classes.length === 0 || subjects.length === 0)
        return { ok: true, message: "Nothing to save." };
      const classIds = new Set(classes.map((c) => c.id));
      const subjectIds = new Set(subjects.map((s) => s.id));

      const valid = (key: string) => {
        const [c, s] = key.split(":").map(Number);
        return classIds.has(c!) && subjectIds.has(s!);
      };
      const adds = new Set(change.add.filter(valid));
      const removes = new Set(change.remove.filter(valid).filter((k) => !adds.has(k)));
      const current = await tx
        .select({
          id: classSubject.id,
          classGroupId: classSubject.classGroupId,
          subjectId: classSubject.subjectId,
        })
        .from(classSubject)
        .where(
          and(
            inArray(classSubject.classGroupId, [...classIds]),
            inArray(classSubject.subjectId, [...subjectIds]),
          ),
        );
      const currentKeys = new Set(current.map((r) => pairKey(r.classGroupId, r.subjectId)));
      const toRemove = current.filter((r) => removes.has(pairKey(r.classGroupId, r.subjectId)));
      const toAdd = [...adds].filter((k) => !currentKeys.has(k));

      if (toRemove.length > 0) {
        await tx.delete(classSubject).where(
          inArray(
            classSubject.id,
            toRemove.map((r) => r.id),
          ),
        );
      }
      if (toAdd.length > 0) {
        await tx.insert(classSubject).values(
          toAdd.map((k) => {
            const [classGroupId, subjectId] = k.split(":").map(Number);
            return { schoolId: ctx.schoolId, classGroupId: classGroupId!, subjectId: subjectId! };
          }),
        );
      }
      if (toAdd.length + toRemove.length > 0) {
        const label = (k: string) => {
          const [c, s] = k.split(":").map(Number);
          return `${classes.find((x) => x.id === c)?.name}: ${subjects.find((x) => x.id === s)?.name}`;
        };
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "update",
          entityType: "class_subjects",
          entityId: yearId,
          changes: {
            added: [null, toAdd.map(label)],
            removed: [toRemove.map((r) => label(pairKey(r.classGroupId, r.subjectId))), null],
          },
          ...meta,
        });
      }
      const parts = [];
      if (toAdd.length) parts.push(`${toAdd.length} added`);
      if (toRemove.length) parts.push(`${toRemove.length} removed`);
      return {
        ok: true,
        message: parts.length ? `Saved: ${parts.join(", ")}.` : "No changes to save.",
      };
    });
  } catch (error) {
    if (pgCode(error) === PG_FOREIGN_KEY) {
      return {
        ok: false,
        error:
          "Some of the subjects you unticked already have records (such as scores), so they were not removed.",
      };
    }
    throw error;
  }
}
