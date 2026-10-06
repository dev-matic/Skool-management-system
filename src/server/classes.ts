import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { classGroup, classSubject, gradeLevel, membership, user } from "@/db/schema";
import { diffChanges } from "@/domain/audit-diff";
import { STANDARD_LEVELS, type Stage } from "@/domain/levels";
import { recordAudit } from "./audit";
import type { Tx } from "./db-context";
import { withTenant, type TenantContext } from "./tenant";

/*
 * Grade levels (school-wide) and classes (per academic year), M2.
 */

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export type Result = { ok: true; id?: number } | { ok: false; error: string; field?: string };

export interface LevelRow {
  id: number;
  name: string;
  stage: Stage;
  sortOrder: number;
  classCount: number;
}

export interface ClassRow {
  id: number;
  name: string;
  gradeLevelId: number;
  levelName: string;
  stage: Stage;
  classTeacherId: string | null;
  classTeacherName: string | null;
  subjectCount: number;
}

export interface TeacherOption {
  userId: string;
  name: string;
}

const PG_UNIQUE = "23505";
const PG_FOREIGN_KEY = "23503";

/** Postgres error code from a Drizzle error (the real error is the cause). */
function pgCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export async function listLevels(ctx: TenantContext): Promise<LevelRow[]> {
  return withTenant(ctx, async (tx) => {
    const rows = await tx
      .select({
        id: gradeLevel.id,
        name: gradeLevel.name,
        stage: gradeLevel.stage,
        sortOrder: gradeLevel.sortOrder,
        classCount: count(classGroup.id),
      })
      .from(gradeLevel)
      .leftJoin(classGroup, eq(classGroup.gradeLevelId, gradeLevel.id))
      .groupBy(gradeLevel.id)
      .orderBy(asc(gradeLevel.sortOrder), asc(gradeLevel.name));
    return rows.map((r) => ({ ...r, classCount: Number(r.classCount) }));
  });
}

/** Active people holding the teacher role in this school, for class teacher choices. */
export async function listTeachers(ctx: TenantContext): Promise<TeacherOption[]> {
  return withTenant(ctx, (tx) =>
    tx
      .selectDistinct({ userId: user.id, name: user.name })
      .from(membership)
      .innerJoin(user, eq(user.id, membership.userId))
      .where(
        and(
          eq(membership.schoolId, ctx.schoolId),
          eq(membership.role, "teacher"),
          eq(membership.isActive, true),
        ),
      )
      .orderBy(asc(user.name)),
  );
}

async function isActiveTeacher(tx: Tx, schoolId: number, userId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(
        eq(membership.schoolId, schoolId),
        eq(membership.userId, userId),
        eq(membership.role, "teacher"),
        eq(membership.isActive, true),
      ),
    );
  return rows.length > 0;
}

export async function saveLevel(
  ctx: TenantContext,
  id: number | null,
  input: { name: string; stage: Stage },
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      if (id === null) {
        const levels = await tx.select({ sortOrder: gradeLevel.sortOrder }).from(gradeLevel);
        const sortOrder = Math.max(0, ...levels.map((l) => l.sortOrder)) + 1;
        const [created] = await tx
          .insert(gradeLevel)
          .values({ schoolId: ctx.schoolId, ...input, sortOrder })
          .returning();
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "create",
          entityType: "grade_level",
          entityId: created!.id,
          changes: diffChanges(null, input),
          ...meta,
        });
        return { ok: true, id: created!.id };
      }
      const [before] = await tx.select().from(gradeLevel).where(eq(gradeLevel.id, id));
      if (!before) return { ok: false, error: "This level no longer exists." };
      await tx
        .update(gradeLevel)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(gradeLevel.id, id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "update",
        entityType: "grade_level",
        entityId: id,
        changes: diffChanges({ name: before.name, stage: before.stage }, input),
        ...meta,
      });
      return { ok: true, id };
    });
  } catch (error) {
    if (pgCode(error) === PG_UNIQUE) {
      return { ok: false, field: "name", error: `There is already a level called ${input.name}.` };
    }
    throw error;
  }
}

/** Adds KG 1-2, Basic 1-6 and JHS 1-3 (skipping any that already exist). */
export async function addStandardLevels(ctx: TenantContext, meta: RequestMeta): Promise<Result> {
  return withTenant(ctx, async (tx) => {
    const existing = await tx.select().from(gradeLevel);
    const names = new Set(existing.map((l) => l.name));
    let sortOrder = Math.max(0, ...existing.map((l) => l.sortOrder));
    const missing = STANDARD_LEVELS.filter((l) => !names.has(l.name));
    if (missing.length === 0) return { ok: true };
    await tx
      .insert(gradeLevel)
      .values(missing.map((l) => ({ schoolId: ctx.schoolId, ...l, sortOrder: ++sortOrder })));
    await recordAudit(tx, {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: "create",
      entityType: "grade_level",
      changes: { levels: [null, missing.map((l) => l.name).join(", ")] },
      ...meta,
    });
    return { ok: true };
  });
}

/** Moves a level one place up or down in the school's list. */
export async function moveLevel(
  ctx: TenantContext,
  id: number,
  direction: -1 | 1,
): Promise<Result> {
  return withTenant(ctx, async (tx) => {
    const levels = await tx
      .select()
      .from(gradeLevel)
      .orderBy(asc(gradeLevel.sortOrder), asc(gradeLevel.name));
    const index = levels.findIndex((l) => l.id === id);
    const target = levels[index + direction];
    if (index < 0 || !target) return { ok: true };
    const current = levels[index]!;
    // Renumber everything so equal sort orders can never get stuck.
    const reordered = [...levels];
    reordered[index] = target;
    reordered[index + direction] = current;
    for (const [i, level] of reordered.entries()) {
      if (level.sortOrder !== i + 1) {
        await tx
          .update(gradeLevel)
          .set({ sortOrder: i + 1 })
          .where(eq(gradeLevel.id, level.id));
      }
    }
    return { ok: true };
  });
}

export async function deleteLevel(
  ctx: TenantContext,
  id: number,
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      const [before] = await tx.select().from(gradeLevel).where(eq(gradeLevel.id, id));
      if (!before) return { ok: true };
      await tx.delete(gradeLevel).where(eq(gradeLevel.id, id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "delete",
        entityType: "grade_level",
        entityId: id,
        changes: diffChanges({ name: before.name, stage: before.stage }, null),
        ...meta,
      });
      return { ok: true };
    });
  } catch (error) {
    if (pgCode(error) === PG_FOREIGN_KEY) {
      return { ok: false, error: "This level has classes. Move or delete its classes first." };
    }
    throw error;
  }
}

export async function listClasses(ctx: TenantContext, yearId: number): Promise<ClassRow[]> {
  return withTenant(ctx, async (tx) => {
    const rows = await tx
      .select({
        id: classGroup.id,
        name: classGroup.name,
        gradeLevelId: classGroup.gradeLevelId,
        levelName: gradeLevel.name,
        stage: gradeLevel.stage,
        classTeacherId: classGroup.classTeacherId,
        classTeacherName: user.name,
      })
      .from(classGroup)
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .leftJoin(user, eq(user.id, classGroup.classTeacherId))
      .where(eq(classGroup.academicYearId, yearId))
      .orderBy(asc(gradeLevel.sortOrder), asc(classGroup.name));
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await tx
          .select({ classGroupId: classSubject.classGroupId, n: count() })
          .from(classSubject)
          .where(inArray(classSubject.classGroupId, ids))
          .groupBy(classSubject.classGroupId)
      : [];
    const byClass = new Map(counts.map((c) => [c.classGroupId, Number(c.n)]));
    return rows.map((r) => ({ ...r, subjectCount: byClass.get(r.id) ?? 0 }));
  });
}

export async function getClass(ctx: TenantContext, id: number) {
  return withTenant(ctx, async (tx) => {
    const [row] = await tx.select().from(classGroup).where(eq(classGroup.id, id));
    return row ?? null;
  });
}

export async function saveClass(
  ctx: TenantContext,
  id: number | null,
  input: {
    academicYearId: number;
    gradeLevelId: number;
    name: string;
    classTeacherId: string | null;
  },
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      if (
        input.classTeacherId &&
        !(await isActiveTeacher(tx, ctx.schoolId, input.classTeacherId))
      ) {
        return {
          ok: false,
          field: "classTeacherId",
          error: "Choose someone with the Teacher role in this school.",
        };
      }
      const values = {
        gradeLevelId: input.gradeLevelId,
        name: input.name,
        classTeacherId: input.classTeacherId,
      };
      if (id === null) {
        const [created] = await tx
          .insert(classGroup)
          .values({ schoolId: ctx.schoolId, academicYearId: input.academicYearId, ...values })
          .returning();
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "create",
          entityType: "class_group",
          entityId: created!.id,
          changes: diffChanges(null, values),
          ...meta,
        });
        return { ok: true, id: created!.id };
      }
      const [before] = await tx.select().from(classGroup).where(eq(classGroup.id, id));
      if (!before) return { ok: false, error: "This class no longer exists." };
      await tx
        .update(classGroup)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(classGroup.id, id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "update",
        entityType: "class_group",
        entityId: id,
        changes: diffChanges(
          {
            gradeLevelId: before.gradeLevelId,
            name: before.name,
            classTeacherId: before.classTeacherId,
          },
          values,
        ),
        ...meta,
      });
      return { ok: true, id };
    });
  } catch (error) {
    const code = pgCode(error);
    if (code === PG_UNIQUE) {
      return {
        ok: false,
        field: "name",
        error: `There is already a class called ${input.name} this year.`,
      };
    }
    if (code === PG_FOREIGN_KEY) {
      return { ok: false, field: "gradeLevelId", error: "Choose a level from the list." };
    }
    throw error;
  }
}

/**
 * Deletes a class and the list of subjects it takes. Later milestones link
 * students and scores to classes; the database will then refuse to delete
 * a class that has them, and this explains why.
 */
export async function deleteClass(
  ctx: TenantContext,
  id: number,
  meta: RequestMeta,
): Promise<Result> {
  try {
    return await withTenant(ctx, async (tx): Promise<Result> => {
      const [before] = await tx.select().from(classGroup).where(eq(classGroup.id, id));
      if (!before) return { ok: true };
      await tx.delete(classSubject).where(eq(classSubject.classGroupId, id));
      await tx.delete(classGroup).where(eq(classGroup.id, id));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "delete",
        entityType: "class_group",
        entityId: id,
        changes: diffChanges({ name: before.name, gradeLevelId: before.gradeLevelId }, null),
        ...meta,
      });
      return { ok: true };
    });
  } catch (error) {
    if (pgCode(error) === PG_FOREIGN_KEY) {
      return {
        ok: false,
        error: "This class already has records linked to it, so it cannot be deleted.",
      };
    }
    throw error;
  }
}
