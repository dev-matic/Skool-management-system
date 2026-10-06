import "server-only";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import {
  academicYear,
  bellSchedule,
  bellScheduleStage,
  classGroup,
  classSubject,
  gradeLevel,
  membership,
  period,
  room,
  subject,
  term,
  timetableEntry,
  user,
} from "@/db/schema";
import { hasAnyRole } from "@/domain/roles";
import { STAGES, type Stage } from "@/domain/levels";
import {
  findClashes,
  parseTime,
  validatePlan,
  type FieldErrors,
  type LessonSlot,
  type PeriodInput,
} from "@/domain/timetable";
import { recordAudit } from "./audit";
import { PG_FOREIGN_KEY, PG_UNIQUE, pgCode } from "./db-errors";
import type { Tx } from "./db-context";
import { withTenant, type TenantContext } from "./tenant";

/*
 * Timetable (M3): day plans per term, rooms, and lessons per class. Only
 * admins change anything. Teachers read their own timetable and the
 * timetables of the classes they teach. Every save that could clash locks
 * the term first, so two admins saving at once are checked one after the
 * other.
 */

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export type Result =
  | { ok: true; message: string; id?: number }
  | { ok: false; error: string; errors?: FieldErrors; clashes?: string[] };

const NOT_ALLOWED: Result = { ok: false, error: "Only administrators can change timetables." };

const isAdmin = (ctx: TenantContext) => hasAnyRole(ctx.roles, ["admin"]);

/** Thrown inside a transaction to undo everything and report `result`. */
class AbortSave extends Error {
  constructor(readonly result: Result) {
    super("Save aborted");
  }
}

function abort(result: Result): never {
  throw new AbortSave(result);
}

async function caught(save: () => Promise<Result>): Promise<Result> {
  try {
    return await save();
  } catch (error) {
    if (error instanceof AbortSave) return error.result;
    throw error;
  }
}

/** Holds other timetable saves for this term until this transaction ends. */
async function lockTerm(tx: Tx, termId: number): Promise<boolean> {
  const rows = await tx.execute(sql`SELECT id FROM term WHERE id = ${termId} FOR UPDATE`);
  return rows.rows.length > 0;
}

// ---------------------------------------------------------------------------
// Terms

export interface TermChoice {
  id: number;
  name: string;
  yearId: number;
  yearName: string;
  startsOn: string;
  endsOn: string;
}

/** Every term, oldest first, for term pickers. */
export async function listTerms(ctx: TenantContext): Promise<TermChoice[]> {
  return withTenant(ctx, (tx) =>
    tx
      .select({
        id: term.id,
        name: term.name,
        yearId: academicYear.id,
        yearName: academicYear.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
      })
      .from(term)
      .innerJoin(academicYear, eq(academicYear.id, term.academicYearId))
      .orderBy(asc(term.startsOn)),
  );
}

/** Ids of terms that already have a day plan (sources to copy from). */
export async function termsWithPlans(ctx: TenantContext): Promise<number[]> {
  return withTenant(ctx, async (tx) =>
    (await tx.selectDistinct({ termId: bellSchedule.termId }).from(bellSchedule)).map(
      (r) => r.termId,
    ),
  );
}

// ---------------------------------------------------------------------------
// Day plans

export interface PeriodRow {
  id: number;
  kind: "lesson" | "break";
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface DayPlan {
  id: number;
  name: string;
  days: number[];
  stages: Stage[];
  periods: PeriodRow[];
  lessonCount: number;
}

const toPeriod = (p: PeriodRow): PeriodRow => ({
  id: p.id,
  kind: p.kind,
  name: p.name,
  startsAt: parseTime(p.startsAt)!,
  endsAt: parseTime(p.endsAt)!,
});

async function loadPlans(tx: Tx, termId: number): Promise<DayPlan[]> {
  const plans = await tx
    .select({ id: bellSchedule.id, name: bellSchedule.name, days: bellSchedule.days })
    .from(bellSchedule)
    .where(eq(bellSchedule.termId, termId))
    .orderBy(asc(bellSchedule.name));
  if (plans.length === 0) return [];
  const ids = plans.map((p) => p.id);
  const [periods, stages, lessons] = await Promise.all([
    tx
      .select({
        id: period.id,
        planId: period.bellScheduleId,
        kind: period.kind,
        name: period.name,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
      })
      .from(period)
      .where(inArray(period.bellScheduleId, ids))
      .orderBy(asc(period.sortOrder), asc(period.startsAt)),
    tx
      .select({ planId: bellScheduleStage.bellScheduleId, stage: bellScheduleStage.stage })
      .from(bellScheduleStage)
      .where(eq(bellScheduleStage.termId, termId)),
    tx
      .select({ planId: period.bellScheduleId, n: sql<number>`count(*)::int` })
      .from(timetableEntry)
      .innerJoin(period, eq(period.id, timetableEntry.periodId))
      .where(eq(timetableEntry.termId, termId))
      .groupBy(period.bellScheduleId),
  ]);
  return plans.map((p) => ({
    ...p,
    days: [...p.days].sort((a, b) => a - b),
    stages: STAGES.filter((s) => stages.some((x) => x.planId === p.id && x.stage === s)),
    periods: periods.filter((x) => x.planId === p.id).map(toPeriod),
    lessonCount: lessons.find((l) => l.planId === p.id)?.n ?? 0,
  }));
}

export async function getDayPlans(ctx: TenantContext, termId: number): Promise<DayPlan[]> {
  return withTenant(ctx, (tx) => loadPlans(tx, termId));
}

export interface PlanSave {
  id?: number;
  name: string;
  days: number[];
  stages: Stage[];
  periods: (PeriodInput & { id?: number })[];
}

/** Every lesson in a term with the names and times the clash check needs. */
async function termSlots(tx: Tx, termId: number): Promise<(LessonSlot & { periodId: number })[]> {
  const rows = await tx
    .select({
      id: timetableEntry.id,
      classId: classGroup.id,
      className: classGroup.name,
      subjectName: subject.name,
      teacherId: timetableEntry.teacherId,
      teacherName: user.name,
      roomId: timetableEntry.roomId,
      roomName: room.name,
      day: timetableEntry.day,
      periodId: timetableEntry.periodId,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
    })
    .from(timetableEntry)
    .innerJoin(classGroup, eq(classGroup.id, timetableEntry.classGroupId))
    .innerJoin(subject, eq(subject.id, timetableEntry.subjectId))
    .innerJoin(period, eq(period.id, timetableEntry.periodId))
    .leftJoin(user, eq(user.id, timetableEntry.teacherId))
    .leftJoin(room, eq(room.id, timetableEntry.roomId))
    .where(eq(timetableEntry.termId, termId));
  return rows;
}

/**
 * Creates or updates a day plan with its periods and the stages that follow
 * it. Periods that already have lessons cannot be removed, and new times
 * must not make any lessons in the term clash.
 */
export async function saveDayPlan(
  ctx: TenantContext,
  termId: number,
  input: PlanSave,
  meta: RequestMeta,
): Promise<Result> {
  if (!isAdmin(ctx)) return NOT_ALLOWED;
  const errors = validatePlan(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: "Check the highlighted fields.", errors };
  }
  try {
    return await caught(() =>
      withTenant(ctx, async (tx): Promise<Result> => {
        if (!(await lockTerm(tx, termId)))
          return { ok: false, error: "That term no longer exists." };

        let planId = input.id;
        if (planId) {
          const [existing] = await tx
            .select({ id: bellSchedule.id })
            .from(bellSchedule)
            .where(and(eq(bellSchedule.id, planId), eq(bellSchedule.termId, termId)));
          if (!existing) return { ok: false, error: "That day plan no longer exists." };
          await tx
            .update(bellSchedule)
            .set({ name: input.name.trim(), days: input.days, updatedAt: new Date() })
            .where(eq(bellSchedule.id, planId));
        } else {
          const [created] = await tx
            .insert(bellSchedule)
            .values({ schoolId: ctx.schoolId, termId, name: input.name.trim(), days: input.days })
            .returning({ id: bellSchedule.id });
          planId = created!.id;
        }

        // Periods: update the kept ones, add new ones, remove the rest.
        const current = await tx
          .select({ id: period.id, name: period.name })
          .from(period)
          .where(eq(period.bellScheduleId, planId));
        const keptIds = new Set(input.periods.flatMap((p) => (p.id ? [p.id] : [])));
        const removed = current.filter((p) => !keptIds.has(p.id));
        if (removed.length > 0) {
          const used = await tx
            .selectDistinct({ periodId: timetableEntry.periodId })
            .from(timetableEntry)
            .where(
              inArray(
                timetableEntry.periodId,
                removed.map((p) => p.id),
              ),
            );
          if (used.length > 0) {
            const names = removed.filter((p) => used.some((u) => u.periodId === p.id));
            abort({
              ok: false,
              error: `${names.map((p) => p.name).join(", ")} already ${names.length === 1 ? "has" : "have"} lessons. Clear those lessons from the class timetables first.`,
            });
          }
          await tx.delete(period).where(
            inArray(
              period.id,
              removed.map((p) => p.id),
            ),
          );
        }
        for (const [index, p] of input.periods.entries()) {
          const values = {
            kind: p.kind,
            name: p.name.trim(),
            startsAt: parseTime(p.startsAt)!,
            endsAt: parseTime(p.endsAt)!,
            sortOrder: index,
          };
          if (p.id && current.some((c) => c.id === p.id)) {
            await tx
              .update(period)
              .set({ ...values, updatedAt: new Date() })
              .where(eq(period.id, p.id));
          } else {
            await tx
              .insert(period)
              .values({ ...values, schoolId: ctx.schoolId, bellScheduleId: planId });
          }
        }

        // A lesson period that has lessons cannot turn into a break.
        const breakWithLessons = await tx
          .select({ name: period.name })
          .from(timetableEntry)
          .innerJoin(period, eq(period.id, timetableEntry.periodId))
          .where(and(eq(period.bellScheduleId, planId), eq(period.kind, "break")))
          .limit(1);
        if (breakWithLessons.length > 0) {
          abort({
            ok: false,
            error: `${breakWithLessons[0]!.name} has lessons, so it cannot become a break. Clear those lessons first.`,
          });
        }

        // Stages: each stage follows one plan per term.
        await setStages(tx, ctx.schoolId, termId, planId, input.stages);

        const clashes = findClashes(await termSlots(tx, termId), []);
        if (clashes.length > 0) {
          abort({
            ok: false,
            error: "Nothing was saved: these times would make lessons clash.",
            clashes,
          });
        }

        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: input.id ? "update" : "create",
          entityType: "day_plan",
          entityId: planId,
          changes: {
            plan: [
              null,
              {
                name: input.name.trim(),
                days: input.days,
                stages: input.stages,
                periods: input.periods.map((p) => `${p.name.trim()} ${p.startsAt}-${p.endsAt}`),
              },
            ],
          },
          ...meta,
        });
        return { ok: true, message: `${input.name.trim()} saved.`, id: planId };
      }),
    );
  } catch (error) {
    if (pgCode(error) === PG_UNIQUE) {
      return {
        ok: false,
        error: "Check the highlighted fields.",
        errors: { name: "This term already has a day plan with that name." },
      };
    }
    throw error;
  }
}

/**
 * Points the given stages at a plan. A stage whose classes already have
 * lessons on another plan cannot move.
 */
async function setStages(
  tx: Tx,
  schoolId: number,
  termId: number,
  planId: number,
  stages: Stage[],
): Promise<void> {
  const links = await tx
    .select({ stage: bellScheduleStage.stage, planId: bellScheduleStage.bellScheduleId })
    .from(bellScheduleStage)
    .where(eq(bellScheduleStage.termId, termId));
  const leaving = links.filter((l) => l.planId === planId && !stages.includes(l.stage));
  const joining = stages.filter((s) => !links.some((l) => l.stage === s && l.planId === planId));
  const moving = [...leaving.map((l) => l.stage), ...joining];
  if (moving.length > 0) {
    const busy = await tx
      .selectDistinct({ stage: gradeLevel.stage })
      .from(timetableEntry)
      .innerJoin(classGroup, eq(classGroup.id, timetableEntry.classGroupId))
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .where(and(eq(timetableEntry.termId, termId), inArray(gradeLevel.stage, moving)));
    if (busy.length > 0) {
      abort({
        ok: false,
        error: `${busy.map((b) => STAGE_NAMES[b.stage]).join(", ")} classes already have lessons this term, so their day plan cannot change. Clear those lessons first.`,
      });
    }
  }
  for (const l of leaving) {
    await tx
      .delete(bellScheduleStage)
      .where(and(eq(bellScheduleStage.termId, termId), eq(bellScheduleStage.stage, l.stage)));
  }
  for (const stage of joining) {
    await tx
      .insert(bellScheduleStage)
      .values({ schoolId, termId, stage, bellScheduleId: planId })
      .onConflictDoUpdate({
        target: [bellScheduleStage.termId, bellScheduleStage.stage],
        set: { bellScheduleId: planId },
      });
  }
}

const STAGE_NAMES: Record<Stage, string> = { kg: "KG", primary: "Primary", jhs: "JHS", shs: "SHS" };

export async function deleteDayPlan(
  ctx: TenantContext,
  planId: number,
  meta: RequestMeta,
): Promise<Result> {
  if (!isAdmin(ctx)) return NOT_ALLOWED;
  try {
    return await withTenant(ctx, async (tx) => {
      const [plan] = await tx
        .select({ id: bellSchedule.id, name: bellSchedule.name, termId: bellSchedule.termId })
        .from(bellSchedule)
        .where(eq(bellSchedule.id, planId));
      if (!plan) return { ok: false, error: "That day plan no longer exists." };
      await lockTerm(tx, plan.termId);
      await tx.delete(bellSchedule).where(eq(bellSchedule.id, planId));
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "delete",
        entityType: "day_plan",
        entityId: planId,
        changes: { name: [plan.name, null] },
        ...meta,
      });
      return { ok: true, message: `${plan.name} deleted.` };
    });
  } catch (error) {
    if (pgCode(error) === PG_FOREIGN_KEY) {
      return {
        ok: false,
        error: "This day plan has lessons. Clear them from the class timetables first.",
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Rooms

export interface RoomRow {
  id: number;
  name: string;
  isArchived: boolean;
}

export async function listRooms(ctx: TenantContext): Promise<RoomRow[]> {
  return withTenant(ctx, (tx) =>
    tx
      .select({ id: room.id, name: room.name, isArchived: room.isArchived })
      .from(room)
      .orderBy(asc(room.isArchived), asc(room.name)),
  );
}

export async function saveRoom(
  ctx: TenantContext,
  input: { id?: number; name: string; isArchived?: boolean },
  meta: RequestMeta,
): Promise<Result> {
  if (!isAdmin(ctx)) return NOT_ALLOWED;
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) {
    return { ok: false, error: "Check the room name.", errors: { name: "Enter the room name." } };
  }
  if (name.length > 60) {
    return {
      ok: false,
      error: "Check the room name.",
      errors: { name: "Keep the room name under 60 characters." },
    };
  }
  try {
    return await withTenant(ctx, async (tx) => {
      if (input.id) {
        const [before] = await tx
          .select({ name: room.name, isArchived: room.isArchived })
          .from(room)
          .where(eq(room.id, input.id));
        if (!before) return { ok: false, error: "That room no longer exists." };
        const isArchived = input.isArchived ?? before.isArchived;
        await tx
          .update(room)
          .set({ name, isArchived, updatedAt: new Date() })
          .where(eq(room.id, input.id));
        await recordAudit(tx, {
          schoolId: ctx.schoolId,
          actorId: ctx.userId,
          action: "update",
          entityType: "room",
          entityId: input.id,
          changes: {
            ...(before.name !== name ? { name: [before.name, name] } : {}),
            ...(before.isArchived !== isArchived
              ? { isArchived: [before.isArchived, isArchived] }
              : {}),
          },
          ...meta,
        });
        return { ok: true, message: `${name} saved.`, id: input.id };
      }
      const [created] = await tx
        .insert(room)
        .values({ schoolId: ctx.schoolId, name })
        .returning({ id: room.id });
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "create",
        entityType: "room",
        entityId: created!.id,
        changes: { name: [null, name] },
        ...meta,
      });
      return { ok: true, message: `${name} added.`, id: created!.id };
    });
  } catch (error) {
    if (pgCode(error) === PG_UNIQUE) {
      return {
        ok: false,
        error: "Check the room name.",
        errors: { name: "There is already a room with that name." },
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Class timetables

export interface Lesson {
  periodId: number;
  day: number;
  subjectId: number;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  roomId: number | null;
  roomName: string | null;
}

export interface ClassTimetable {
  term: TermChoice;
  classId: number;
  className: string;
  stage: Stage;
  classTeacherName: string | null;
  plan: DayPlan | null;
  lessons: Lesson[];
  /** Subjects the class takes, with who teaches each (for the editor). */
  subjects: {
    subjectId: number;
    name: string;
    teacherId: string | null;
    teacherName: string | null;
  }[];
}

/**
 * Classes the signed-in teacher may see: classes they are class teacher of,
 * teach a subject in, or have a lesson with this term. Admins see all.
 */
async function teacherClassIds(tx: Tx, ctx: TenantContext, termId: number): Promise<Set<number>> {
  const [taught, timetabled] = await Promise.all([
    tx
      .selectDistinct({ id: classGroup.id })
      .from(classGroup)
      .leftJoin(classSubject, eq(classSubject.classGroupId, classGroup.id))
      .where(or(eq(classGroup.classTeacherId, ctx.userId), eq(classSubject.teacherId, ctx.userId))),
    tx
      .selectDistinct({ id: timetableEntry.classGroupId })
      .from(timetableEntry)
      .where(and(eq(timetableEntry.termId, termId), eq(timetableEntry.teacherId, ctx.userId))),
  ]);
  return new Set([...taught, ...timetabled].map((r) => r.id));
}

async function loadTerm(tx: Tx, termId: number): Promise<TermChoice | null> {
  const [row] = await tx
    .select({
      id: term.id,
      name: term.name,
      yearId: academicYear.id,
      yearName: academicYear.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
    })
    .from(term)
    .innerJoin(academicYear, eq(academicYear.id, term.academicYearId))
    .where(eq(term.id, termId));
  return row ?? null;
}

/**
 * A class's timetable for a term, or null when it does not exist, is not in
 * that term's year, or the signed-in teacher does not teach the class.
 */
export async function getClassTimetable(
  ctx: TenantContext,
  classId: number,
  termId: number,
): Promise<ClassTimetable | null> {
  return withTenant(ctx, async (tx) => {
    const t = await loadTerm(tx, termId);
    if (!t) return null;
    const [cls] = await tx
      .select({
        id: classGroup.id,
        name: classGroup.name,
        yearId: classGroup.academicYearId,
        stage: gradeLevel.stage,
        classTeacherName: user.name,
      })
      .from(classGroup)
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .leftJoin(user, eq(user.id, classGroup.classTeacherId))
      .where(eq(classGroup.id, classId));
    if (!cls || cls.yearId !== t.yearId) return null;
    if (!isAdmin(ctx) && !(await teacherClassIds(tx, ctx, termId)).has(classId)) return null;

    const plans = await loadPlans(tx, termId);
    const plan = plans.find((p) => p.stages.includes(cls.stage)) ?? null;
    const [lessons, subjects] = await Promise.all([
      tx
        .select({
          periodId: timetableEntry.periodId,
          day: timetableEntry.day,
          subjectId: timetableEntry.subjectId,
          subjectName: subject.name,
          teacherId: timetableEntry.teacherId,
          teacherName: user.name,
          roomId: timetableEntry.roomId,
          roomName: room.name,
        })
        .from(timetableEntry)
        .innerJoin(subject, eq(subject.id, timetableEntry.subjectId))
        .leftJoin(user, eq(user.id, timetableEntry.teacherId))
        .leftJoin(room, eq(room.id, timetableEntry.roomId))
        .where(and(eq(timetableEntry.termId, termId), eq(timetableEntry.classGroupId, classId))),
      tx
        .select({
          subjectId: subject.id,
          name: subject.name,
          teacherId: classSubject.teacherId,
          teacherName: user.name,
        })
        .from(classSubject)
        .innerJoin(subject, eq(subject.id, classSubject.subjectId))
        .leftJoin(user, eq(user.id, classSubject.teacherId))
        .where(eq(classSubject.classGroupId, classId))
        .orderBy(asc(subject.name)),
    ]);
    return {
      term: t,
      classId: cls.id,
      className: cls.name,
      stage: cls.stage,
      classTeacherName: cls.classTeacherName,
      plan,
      lessons,
      subjects,
    };
  });
}

export interface CellSave {
  periodId: number;
  day: number;
  /** null clears the cell. */
  subjectId: number | null;
  roomId: number | null;
}

/**
 * Saves changed cells of a class timetable. The teacher of each lesson comes
 * from the class's subject assignments. Nothing is saved when any lesson
 * would clash; the clashes are returned, each naming the conflict.
 */
export async function saveClassTimetable(
  ctx: TenantContext,
  classId: number,
  termId: number,
  cells: readonly CellSave[],
  meta: RequestMeta,
): Promise<Result> {
  if (!isAdmin(ctx)) return NOT_ALLOWED;
  return withTenant(ctx, async (tx) => {
    if (!(await lockTerm(tx, termId))) return { ok: false, error: "That term no longer exists." };
    const t = await loadTerm(tx, termId);
    const [cls] = await tx
      .select({
        name: classGroup.name,
        yearId: classGroup.academicYearId,
        stage: gradeLevel.stage,
      })
      .from(classGroup)
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .where(eq(classGroup.id, classId));
    if (!t || !cls || cls.yearId !== t.yearId) {
      return { ok: false, error: "That class is not in this term's academic year." };
    }
    const plan = (await loadPlans(tx, termId)).find((p) => p.stages.includes(cls.stage));
    if (!plan) {
      return { ok: false, error: `Set up a day plan for ${STAGE_NAMES[cls.stage]} first.` };
    }

    const subjects = await tx
      .select({
        subjectId: classSubject.subjectId,
        name: subject.name,
        teacherId: classSubject.teacherId,
        teacherName: user.name,
      })
      .from(classSubject)
      .innerJoin(subject, eq(subject.id, classSubject.subjectId))
      .leftJoin(user, eq(user.id, classSubject.teacherId))
      .where(eq(classSubject.classGroupId, classId));
    const rooms = await tx
      .select({ id: room.id, name: room.name, isArchived: room.isArchived })
      .from(room);
    const activeTeachers = new Set(
      (
        await tx
          .select({ userId: membership.userId })
          .from(membership)
          .where(
            and(
              eq(membership.schoolId, ctx.schoolId),
              eq(membership.role, "teacher"),
              eq(membership.isActive, true),
            ),
          )
      ).map((m) => m.userId),
    );

    const slotKey = (periodId: number, day: number) => `${periodId}:${day}`;
    const all = await termSlots(tx, termId);
    const mine = new Map(
      all.filter((s) => s.classId === classId).map((s) => [slotKey(s.periodId, s.day), s]),
    );
    const changing = new Set(cells.map((c) => slotKey(c.periodId, c.day)));
    const saving: (LessonSlot & { cell: CellSave; teacherId: string | null })[] = [];

    for (const cell of cells) {
      const p = plan.periods.find((x) => x.id === cell.periodId);
      if (!p || p.kind !== "lesson" || !plan.days.includes(cell.day)) {
        return {
          ok: false,
          error: "A lesson is outside this class's day plan. Reload and try again.",
        };
      }
      if (cell.subjectId === null) continue;
      const s = subjects.find((x) => x.subjectId === cell.subjectId);
      if (!s) {
        return {
          ok: false,
          error: `${cls.name} does not take that subject. Add it on the Subjects page first.`,
        };
      }
      const r = cell.roomId === null ? null : rooms.find((x) => x.id === cell.roomId);
      if (
        r === undefined ||
        (r && r.isArchived && mine.get(slotKey(cell.periodId, cell.day))?.roomId !== r.id)
      ) {
        return { ok: false, error: "That room is no longer available." };
      }
      const teacherId = s.teacherId && activeTeachers.has(s.teacherId) ? s.teacherId : null;
      saving.push({
        cell,
        classId,
        className: cls.name,
        subjectName: s.name,
        teacherId,
        teacherName: teacherId ? s.teacherName : null,
        roomId: r?.id ?? null,
        roomName: r?.name ?? null,
        day: cell.day,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
      });
    }

    const others = all.filter(
      (s) => !(s.classId === classId && changing.has(slotKey(s.periodId, s.day))),
    );
    const clashes = findClashes(saving, others);
    if (clashes.length > 0) {
      return {
        ok: false,
        error: `Nothing was saved: ${clashes.length === 1 ? "1 clash" : `${clashes.length} clashes`} to fix.`,
        clashes,
      };
    }

    const changes: string[] = [];
    for (const cell of cells) {
      const key = slotKey(cell.periodId, cell.day);
      const before = mine.get(key);
      const after = saving.find((s) => slotKey(s.cell.periodId, s.cell.day) === key);
      if (!after) {
        if (before) {
          await tx
            .delete(timetableEntry)
            .where(
              and(
                eq(timetableEntry.classGroupId, classId),
                eq(timetableEntry.periodId, cell.periodId),
                eq(timetableEntry.day, cell.day),
              ),
            );
          changes.push(`${key} ${before.subjectName} -> (empty)`);
        }
        continue;
      }
      await tx
        .insert(timetableEntry)
        .values({
          schoolId: ctx.schoolId,
          termId,
          classGroupId: classId,
          periodId: cell.periodId,
          day: cell.day,
          subjectId: after.cell.subjectId!,
          teacherId: after.teacherId,
          roomId: after.roomId,
        })
        .onConflictDoUpdate({
          target: [timetableEntry.classGroupId, timetableEntry.periodId, timetableEntry.day],
          set: {
            subjectId: after.cell.subjectId!,
            teacherId: after.teacherId,
            roomId: after.roomId,
            updatedAt: new Date(),
          },
        });
      changes.push(`${key} ${before?.subjectName ?? "(empty)"} -> ${after.subjectName}`);
    }
    if (changes.length > 0) {
      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "update",
        entityType: "class_timetable",
        entityId: `${classId}:${termId}`,
        changes: { lessons: [null, changes] },
        ...meta,
      });
    }
    return {
      ok: true,
      message: changes.length
        ? `Saved ${changes.length} lesson${changes.length === 1 ? "" : "s"}.`
        : "No changes to save.",
    };
  });
}

// ---------------------------------------------------------------------------
// Teacher and school views

export interface TimetableLesson extends Lesson {
  classId: number;
  className: string;
  periodName: string;
  startsAt: string;
  endsAt: string;
}

async function lessonsWhere(tx: Tx, termId: number, extra?: ReturnType<typeof eq>) {
  const rows = await tx
    .select({
      classId: classGroup.id,
      className: classGroup.name,
      periodId: timetableEntry.periodId,
      periodName: period.name,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      day: timetableEntry.day,
      subjectId: timetableEntry.subjectId,
      subjectName: subject.name,
      teacherId: timetableEntry.teacherId,
      teacherName: user.name,
      roomId: timetableEntry.roomId,
      roomName: room.name,
    })
    .from(timetableEntry)
    .innerJoin(classGroup, eq(classGroup.id, timetableEntry.classGroupId))
    .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
    .innerJoin(period, eq(period.id, timetableEntry.periodId))
    .innerJoin(subject, eq(subject.id, timetableEntry.subjectId))
    .leftJoin(user, eq(user.id, timetableEntry.teacherId))
    .leftJoin(room, eq(room.id, timetableEntry.roomId))
    .where(
      extra ? and(eq(timetableEntry.termId, termId), extra) : eq(timetableEntry.termId, termId),
    )
    .orderBy(
      asc(timetableEntry.day),
      asc(period.startsAt),
      asc(gradeLevel.sortOrder),
      asc(classGroup.name),
    );
  return rows.map((r) => ({
    ...r,
    startsAt: parseTime(r.startsAt)!,
    endsAt: parseTime(r.endsAt)!,
  }));
}

/**
 * A teacher's lessons for a term. Teachers may only read their own; admins
 * may read anyone's. Returns null when not allowed.
 */
export async function getTeacherTimetable(
  ctx: TenantContext,
  teacherId: string,
  termId: number,
): Promise<TimetableLesson[] | null> {
  if (!isAdmin(ctx) && teacherId !== ctx.userId) return null;
  return withTenant(ctx, (tx) => lessonsWhere(tx, termId, eq(timetableEntry.teacherId, teacherId)));
}

/** Every lesson in the school for a term (admins only), for the overview. */
export async function getSchoolTimetable(
  ctx: TenantContext,
  termId: number,
): Promise<TimetableLesson[] | null> {
  if (!isAdmin(ctx)) return null;
  return withTenant(ctx, (tx) => lessonsWhere(tx, termId));
}

/** Classes a viewer can open a timetable for: all for admins, their own for teachers. */
export async function listTimetableClasses(
  ctx: TenantContext,
  termId: number,
): Promise<{ id: number; name: string; stage: Stage }[]> {
  return withTenant(ctx, async (tx) => {
    const t = await loadTerm(tx, termId);
    if (!t) return [];
    const rows = await tx
      .select({ id: classGroup.id, name: classGroup.name, stage: gradeLevel.stage })
      .from(classGroup)
      .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
      .where(eq(classGroup.academicYearId, t.yearId))
      .orderBy(asc(gradeLevel.sortOrder), asc(classGroup.name));
    if (isAdmin(ctx)) return rows;
    const mine = await teacherClassIds(tx, ctx, termId);
    return rows.filter((r) => mine.has(r.id));
  });
}

// ---------------------------------------------------------------------------
// Copy from another term

/**
 * Copies day plans, rooms used and lessons from one term into an empty term.
 * Lessons follow classes by name (classes belong to a year) and take today's
 * teacher assignments; lessons for subjects a class no longer takes are
 * skipped and counted.
 */
export async function copyTimetable(
  ctx: TenantContext,
  fromTermId: number,
  toTermId: number,
  meta: RequestMeta,
): Promise<Result> {
  if (!isAdmin(ctx)) return NOT_ALLOWED;
  if (fromTermId === toTermId) return { ok: false, error: "Choose a different term to copy from." };
  return caught(() =>
    withTenant(ctx, async (tx): Promise<Result> => {
      if (!(await lockTerm(tx, toTermId)))
        return { ok: false, error: "That term no longer exists." };
      const [from, to] = [await loadTerm(tx, fromTermId), await loadTerm(tx, toTermId)];
      if (!from || !to) return { ok: false, error: "That term no longer exists." };
      const existing = await tx
        .select({ id: bellSchedule.id })
        .from(bellSchedule)
        .where(eq(bellSchedule.termId, toTermId))
        .limit(1);
      if (existing.length > 0) {
        return {
          ok: false,
          error: `${to.name}, ${to.yearName} already has a day plan. Copying only works into an empty term.`,
        };
      }

      const plans = await loadPlans(tx, fromTermId);
      if (plans.length === 0) {
        return { ok: false, error: `${from.name}, ${from.yearName} has no timetable to copy.` };
      }
      const periodMap = new Map<number, number>();
      for (const p of plans) {
        const [created] = await tx
          .insert(bellSchedule)
          .values({ schoolId: ctx.schoolId, termId: toTermId, name: p.name, days: p.days })
          .returning({ id: bellSchedule.id });
        for (const [index, x] of p.periods.entries()) {
          const [np] = await tx
            .insert(period)
            .values({
              schoolId: ctx.schoolId,
              bellScheduleId: created!.id,
              sortOrder: index,
              kind: x.kind,
              name: x.name,
              startsAt: x.startsAt,
              endsAt: x.endsAt,
            })
            .returning({ id: period.id });
          periodMap.set(x.id, np!.id);
        }
        for (const stage of p.stages) {
          await tx.insert(bellScheduleStage).values({
            schoolId: ctx.schoolId,
            termId: toTermId,
            stage,
            bellScheduleId: created!.id,
          });
        }
      }

      const source = await tx
        .select({
          className: classGroup.name,
          periodId: timetableEntry.periodId,
          day: timetableEntry.day,
          subjectId: timetableEntry.subjectId,
          roomId: timetableEntry.roomId,
        })
        .from(timetableEntry)
        .innerJoin(classGroup, eq(classGroup.id, timetableEntry.classGroupId))
        .where(eq(timetableEntry.termId, fromTermId));
      const targets = await tx
        .select({
          classId: classGroup.id,
          className: classGroup.name,
          subjectId: classSubject.subjectId,
          teacherId: classSubject.teacherId,
        })
        .from(classGroup)
        .innerJoin(classSubject, eq(classSubject.classGroupId, classGroup.id))
        .where(eq(classGroup.academicYearId, to.yearId));
      const archivedRooms = new Set(
        (await tx.select({ id: room.id }).from(room).where(eq(room.isArchived, true))).map(
          (r) => r.id,
        ),
      );

      let copied = 0;
      let skipped = 0;
      for (const s of source) {
        const target = targets.find(
          (x) => x.className === s.className && x.subjectId === s.subjectId,
        );
        const periodId = periodMap.get(s.periodId);
        if (!target || !periodId) {
          skipped += 1;
          continue;
        }
        await tx.insert(timetableEntry).values({
          schoolId: ctx.schoolId,
          termId: toTermId,
          classGroupId: target.classId,
          periodId,
          day: s.day,
          subjectId: s.subjectId,
          teacherId: target.teacherId,
          roomId: s.roomId && !archivedRooms.has(s.roomId) ? s.roomId : null,
        });
        copied += 1;
      }

      // Today's assignments may put one teacher in two places; refuse rather
      // than copy a timetable with clashes.
      const clashes = findClashes(await termSlots(tx, toTermId), []);
      if (clashes.length > 0) {
        abort({
          ok: false,
          error: "Nothing was copied: with today's teacher assignments these lessons would clash.",
          clashes,
        });
      }

      await recordAudit(tx, {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action: "create",
        entityType: "timetable_copy",
        entityId: toTermId,
        changes: { copied: [null, { fromTermId, plans: plans.length, lessons: copied, skipped }] },
        ...meta,
      });
      return {
        ok: true,
        message: `Copied ${plans.length} day plan${plans.length === 1 ? "" : "s"} and ${copied} lesson${copied === 1 ? "" : "s"} from ${from.name}, ${from.yearName}.${skipped ? ` ${skipped} lesson${skipped === 1 ? " was" : "s were"} skipped because the class or subject is not in ${to.yearName}.` : ""}`,
      };
    }),
  );
}

/** The teacher's lessons on one day of a term, in time order, for their home screen. */
export async function lessonsForDay(
  ctx: TenantContext,
  termId: number,
  day: number,
): Promise<TimetableLesson[]> {
  return withTenant(ctx, async (tx) =>
    (await lessonsWhere(tx, termId, eq(timetableEntry.teacherId, ctx.userId))).filter(
      (l) => l.day === day,
    ),
  );
}
