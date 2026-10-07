/**
 * FAKE demo timetable for the demo school's current term: a main day for
 * Primary and JHS, a shorter KG day, two rooms, and a full week of lessons
 * built so no teacher or room is booked twice. Used by `pnpm db:seed` only;
 * times and lessons are made up for demonstration.
 *
 * Runs only when the term has no day plan yet, so changes made in the app
 * are never overwritten.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Stage } from "../domain/levels";
import { pickTerm, toMinutes } from "../domain/timetable";
import * as schema from "./schema";

const {
  bellSchedule,
  bellScheduleStage,
  classGroup,
  classSubject,
  gradeLevel,
  period,
  room,
  subject,
  term,
  timetableEntry,
} = schema;

type Tx = Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0];

type Row = [kind: "lesson" | "break", name: string, startsAt: string, endsAt: string];

const PLANS: { name: string; stages: Stage[]; periods: Row[] }[] = [
  {
    name: "Main day",
    stages: ["primary", "jhs"],
    periods: [
      ["lesson", "Period 1", "08:00", "08:40"],
      ["lesson", "Period 2", "08:40", "09:20"],
      ["lesson", "Period 3", "09:20", "10:00"],
      ["break", "Break", "10:00", "10:30"],
      ["lesson", "Period 4", "10:30", "11:10"],
      ["lesson", "Period 5", "11:10", "11:50"],
      ["break", "Lunch", "11:50", "12:30"],
      ["lesson", "Period 6", "12:30", "13:10"],
      ["lesson", "Period 7", "13:10", "13:50"],
    ],
  },
  {
    name: "KG day",
    stages: ["kg"],
    periods: [
      ["lesson", "Session 1", "08:00", "08:30"],
      ["lesson", "Session 2", "08:30", "09:00"],
      ["break", "Break", "09:00", "09:30"],
      ["lesson", "Session 3", "09:30", "10:00"],
      ["lesson", "Session 4", "10:00", "10:30"],
      ["break", "Play and lunch", "10:30", "11:30"],
      ["lesson", "Session 5", "11:30", "12:00"],
    ],
  },
];

const ROOMS: Record<string, string> = {
  "Integrated Science": "Science lab",
  Computing: "ICT lab",
};

const DAYS = [1, 2, 3, 4, 5];

export async function seedDemoTimetable(tx: Tx, schoolId: number, today: string) {
  const terms = await tx.select().from(term).where(eq(term.schoolId, schoolId));
  const current = pickTerm(terms, undefined, today);
  if (!current) return;
  const existing = await tx
    .select({ id: bellSchedule.id })
    .from(bellSchedule)
    .where(and(eq(bellSchedule.schoolId, schoolId), eq(bellSchedule.termId, current.id)))
    .limit(1);
  if (existing.length > 0) return;

  await tx
    .insert(room)
    .values([...new Set(Object.values(ROOMS))].map((name) => ({ schoolId, name })))
    .onConflictDoNothing();
  const rooms = await tx.select().from(room).where(eq(room.schoolId, schoolId));

  const periodsByStage = new Map<
    Stage,
    { id: number; day: number; startsAt: string; endsAt: string }[]
  >();
  for (const plan of PLANS) {
    const [created] = await tx
      .insert(bellSchedule)
      .values({ schoolId, termId: current.id, name: plan.name, days: DAYS })
      .returning({ id: bellSchedule.id });
    const inserted = await tx
      .insert(period)
      .values(
        plan.periods.map(([kind, name, startsAt, endsAt], i) => ({
          schoolId,
          bellScheduleId: created!.id,
          sortOrder: i,
          kind,
          name,
          startsAt,
          endsAt,
        })),
      )
      .returning();
    for (const stage of plan.stages) {
      await tx
        .insert(bellScheduleStage)
        .values({ schoolId, termId: current.id, stage, bellScheduleId: created!.id });
      periodsByStage.set(
        stage,
        inserted
          .filter((p) => p.kind === "lesson")
          .flatMap((p) =>
            DAYS.map((day) => ({ id: p.id, day, startsAt: p.startsAt, endsAt: p.endsAt })),
          ),
      );
    }
  }

  const classes = await tx
    .select({ id: classGroup.id, name: classGroup.name, stage: gradeLevel.stage })
    .from(classGroup)
    .innerJoin(gradeLevel, eq(gradeLevel.id, classGroup.gradeLevelId))
    .where(
      and(eq(classGroup.schoolId, schoolId), eq(classGroup.academicYearId, current.academicYearId)),
    )
    .orderBy(gradeLevel.sortOrder, classGroup.name);
  const taught = await tx
    .select({
      classId: classSubject.classGroupId,
      subjectId: classSubject.subjectId,
      name: subject.name,
      teacherId: classSubject.teacherId,
    })
    .from(classSubject)
    .innerJoin(subject, eq(subject.id, classSubject.subjectId))
    .where(
      inArray(
        classSubject.classGroupId,
        classes.map((c) => c.id),
      ),
    )
    .orderBy(subject.name);

  // Busy minutes per teacher and room on each day, so nothing is double-booked
  // even across the KG and main day plans.
  const busy: { who: string; day: number; from: number; to: number }[] = [];
  const isFree = (who: string, day: number, from: number, to: number) =>
    !busy.some((b) => b.who === who && b.day === day && b.from < to && from < b.to);

  const entries: (typeof timetableEntry.$inferInsert)[] = [];
  classes.forEach((cls, classIndex) => {
    const subjects = taught.filter((t) => t.classId === cls.id);
    const slots = periodsByStage.get(cls.stage) ?? [];
    if (subjects.length === 0) return;
    slots.forEach((slot, slotIndex) => {
      const from = toMinutes(slot.startsAt);
      const to = toMinutes(slot.endsAt);
      for (let k = 0; k < subjects.length; k++) {
        const s = subjects[(slotIndex + classIndex * 3 + k) % subjects.length]!;
        if (s.teacherId && !isFree(s.teacherId, slot.day, from, to)) continue;
        const roomName = ROOMS[s.name];
        const r = roomName ? rooms.find((x) => x.name === roomName) : undefined;
        const roomId = r && isFree(`room:${r.id}`, slot.day, from, to) ? r.id : null;
        if (s.teacherId) busy.push({ who: s.teacherId, day: slot.day, from, to });
        if (roomId) busy.push({ who: `room:${roomId}`, day: slot.day, from, to });
        entries.push({
          schoolId,
          termId: current.id,
          classGroupId: cls.id,
          periodId: slot.id,
          day: slot.day,
          subjectId: s.subjectId,
          teacherId: s.teacherId,
          roomId,
        });
        break;
      }
    });
  });
  if (entries.length > 0) await tx.insert(timetableEntry).values(entries);
}
