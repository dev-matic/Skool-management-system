import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { classGroup, classSubject, gradeLevel, membership, subject, user } from "@/db/schema";
import type { Stage } from "@/domain/levels";
import { recordAudit } from "./audit";
import { withTenant, type TenantContext } from "./tenant";

/*
 * Who teaches each subject in each class (M2). Stored on class_subject,
 * so a class subject has at most one teacher.
 */

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export type Result = { ok: true; message: string } | { ok: false; error: string };

export interface AssignmentGrid {
  classes: {
    id: number;
    name: string;
    stage: Stage;
    classTeacherId: string | null;
    classTeacherName: string | null;
  }[];
  subjects: { id: number; name: string; shortName: string | null }[];
  /** Keyed "classId:subjectId"; only subjects the class takes. */
  cells: Record<string, { classSubjectId: number; teacherId: string | null }>;
}

export interface MyAssignment {
  className: string;
  subjectName: string;
  isClassTeacher: boolean;
}

export async function getAssignmentGrid(
  ctx: TenantContext,
  yearId: number,
): Promise<AssignmentGrid> {
  return withTenant(ctx, async (tx) => {
    const classes = await tx
      .select({
        id: classGroup.id,
        name: classGroup.name,
        stage: gradeLevel.stage,
        classTeacherId: classGroup.classTeacherId,
        classTeacherName: user.name,
      })
      .from(classGroup)
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .leftJoin(user, eq(user.id, classGroup.classTeacherId))
      .where(eq(classGroup.academicYearId, yearId))
      .orderBy(asc(gradeLevel.sortOrder), asc(classGroup.name));
    const links = classes.length
      ? await tx
          .select({
            id: classSubject.id,
            classGroupId: classSubject.classGroupId,
            subjectId: classSubject.subjectId,
            teacherId: classSubject.teacherId,
          })
          .from(classSubject)
          .where(
            inArray(
              classSubject.classGroupId,
              classes.map((c) => c.id),
            ),
          )
      : [];
    const subjectIds = [...new Set(links.map((l) => l.subjectId))];
    const subjects = subjectIds.length
      ? await tx
          .select({ id: subject.id, name: subject.name, shortName: subject.shortName })
          .from(subject)
          .where(inArray(subject.id, subjectIds))
          .orderBy(asc(subject.name))
      : [];
    const cells: AssignmentGrid["cells"] = {};
    for (const l of links) {
      cells[`${l.classGroupId}:${l.subjectId}`] = { classSubjectId: l.id, teacherId: l.teacherId };
    }
    return { classes, subjects, cells };
  });
}

/**
 * Saves teachers for the class subjects of a year. Each teacher must be an
 * active teacher in this school; only changed cells are written.
 */
export async function saveAssignments(
  ctx: TenantContext,
  yearId: number,
  entries: readonly { classSubjectId: number; teacherId: string | null }[],
  meta: RequestMeta,
): Promise<Result> {
  return withTenant(ctx, async (tx) => {
    const rows = await tx
      .select({
        id: classSubject.id,
        teacherId: classSubject.teacherId,
        className: classGroup.name,
        subjectName: subject.name,
      })
      .from(classSubject)
      .innerJoin(classGroup, eq(classGroup.id, classSubject.classGroupId))
      .innerJoin(subject, eq(subject.id, classSubject.subjectId))
      .where(eq(classGroup.academicYearId, yearId));
    const byId = new Map(rows.map((r) => [r.id, r]));

    const teacherRows = await tx
      .select({ userId: membership.userId })
      .from(membership)
      .where(
        and(
          eq(membership.schoolId, ctx.schoolId),
          eq(membership.role, "teacher"),
          eq(membership.isActive, true),
        ),
      );
    const teachers = new Set(teacherRows.map((t) => t.userId));

    const changes: string[] = [];
    for (const entry of entries) {
      const row = byId.get(entry.classSubjectId);
      if (!row) continue; // Not this year's (or this school's) class subject.
      if (entry.teacherId && !teachers.has(entry.teacherId)) {
        return {
          ok: false,
          error: `The teacher chosen for ${row.className} ${row.subjectName} is not an active teacher.`,
        };
      }
      if (row.teacherId === entry.teacherId) continue;
      await tx
        .update(classSubject)
        .set({ teacherId: entry.teacherId, updatedAt: new Date() })
        .where(eq(classSubject.id, row.id));
      changes.push(`${row.className}: ${row.subjectName}`);
    }
    if (changes.length > 0) {
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "update",
        entityType: "teaching_assignments",
        entityId: yearId,
        changes: { changed: [null, changes] },
        ...meta,
      });
    }
    return {
      ok: true,
      message: changes.length
        ? `Saved ${changes.length} change${changes.length === 1 ? "" : "s"}.`
        : "No changes to save.",
    };
  });
}

/** What the signed-in teacher teaches in a year, for their own screens. */
export async function myAssignments(ctx: TenantContext, yearId: number): Promise<MyAssignment[]> {
  return withTenant(ctx, async (tx) => {
    const rows = await tx
      .select({
        className: classGroup.name,
        subjectName: subject.name,
        classTeacherId: classGroup.classTeacherId,
        sortOrder: gradeLevel.sortOrder,
      })
      .from(classSubject)
      .innerJoin(classGroup, eq(classGroup.id, classSubject.classGroupId))
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .innerJoin(subject, eq(subject.id, classSubject.subjectId))
      .where(and(eq(classGroup.academicYearId, yearId), eq(classSubject.teacherId, ctx.userId)))
      .orderBy(asc(gradeLevel.sortOrder), asc(classGroup.name), asc(subject.name));
    return rows.map((r) => ({
      className: r.className,
      subjectName: r.subjectName,
      isClassTeacher: r.classTeacherId === ctx.userId,
    }));
  });
}
