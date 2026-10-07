import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  academicYear,
  bellSchedule,
  bellScheduleStage,
  classGroup,
  gradeLevel,
  period,
  room,
  subject,
  term,
  timetableEntry,
} from "@/db/schema";
import { withDbContext } from "@/server/db-context";
import { addMembership, createSchool, createUser, expectDbError } from "./fixtures";
import { createAdminDb } from "./test-db";

/*
 * Timetable tables (M3): row-level security keeps schools apart, links can
 * never point at another school's rows, and a class has one lesson per slot.
 */

const admin = createAdminDb();

async function setupSchool(name: string) {
  const s = await createSchool(admin.db, name);
  const [year] = await admin.db
    .insert(academicYear)
    .values({ schoolId: s.id, name: "2025/2026", startsOn: "2025-09-08", endsOn: "2026-07-24" })
    .returning();
  const terms = await admin.db
    .insert(term)
    .values(
      [1, 2].map((n) => ({
        schoolId: s.id,
        academicYearId: year!.id,
        number: n,
        name: `Term ${n}`,
        startsOn: n === 1 ? "2025-09-08" : "2026-01-12",
        endsOn: n === 1 ? "2025-12-12" : "2026-04-09",
      })),
    )
    .returning();
  const [level] = await admin.db
    .insert(gradeLevel)
    .values({ schoolId: s.id, name: "JHS 1", stage: "jhs", sortOrder: 9 })
    .returning();
  const [cls] = await admin.db
    .insert(classGroup)
    .values({ schoolId: s.id, academicYearId: year!.id, gradeLevelId: level!.id, name: "JHS 1" })
    .returning();
  const [subj] = await admin.db
    .insert(subject)
    .values({ schoolId: s.id, name: "Mathematics" })
    .returning();
  const [plan] = await admin.db
    .insert(bellSchedule)
    .values({ schoolId: s.id, termId: terms[0]!.id, name: "Main day", days: [1, 2, 3, 4, 5] })
    .returning();
  const [p1] = await admin.db
    .insert(period)
    .values({
      schoolId: s.id,
      bellScheduleId: plan!.id,
      sortOrder: 1,
      kind: "lesson",
      name: "Period 1",
      startsAt: "08:00",
      endsAt: "08:40",
    })
    .returning();
  const [rm] = await admin.db
    .insert(room)
    .values({ schoolId: s.id, name: "Science lab" })
    .returning();
  return { school: s, terms, cls: cls!, subj: subj!, plan: plan!, p1: p1!, room: rm! };
}

let a: Awaited<ReturnType<typeof setupSchool>>;
let b: Awaited<ReturnType<typeof setupSchool>>;
let adminA: { id: string };
const asA = () => ({ userId: adminA.id, schoolId: a.school.id });

beforeAll(async () => {
  a = await setupSchool("Timetable School A");
  b = await setupSchool("Timetable School B");
  adminA = await createUser(admin.db, "Timetable Admin A");
  await addMembership(admin.db, a.school.id, adminA.id, "admin");
  await admin.db.insert(timetableEntry).values({
    schoolId: b.school.id,
    termId: b.terms[0]!.id,
    classGroupId: b.cls.id,
    periodId: b.p1.id,
    day: 1,
    subjectId: b.subj.id,
  });
});

afterAll(() => admin.pool.end());

const entryA = (over: Partial<typeof timetableEntry.$inferInsert> = {}) => ({
  schoolId: a.school.id,
  termId: a.terms[0]!.id,
  classGroupId: a.cls.id,
  periodId: a.p1.id,
  day: 1,
  subjectId: a.subj.id,
  ...over,
});

describe("timetable tables", () => {
  it("each school sees only its own day plans, periods, rooms and lessons", async () => {
    await withDbContext(asA(), (tx) => tx.insert(timetableEntry).values(entryA({ day: 2 })));
    const seen = await withDbContext(asA(), async (tx) => ({
      plans: await tx.select().from(bellSchedule),
      periods: await tx.select().from(period),
      rooms: await tx.select().from(room),
      lessons: await tx.select().from(timetableEntry),
    }));
    for (const rows of Object.values(seen)) {
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.schoolId === a.school.id)).toBe(true);
    }
  });

  it("refuses a lesson that points at another school's period, room or class", async () => {
    await expectDbError(
      withDbContext(asA(), (tx) => tx.insert(timetableEntry).values(entryA({ periodId: b.p1.id }))),
      /timetable_entry_period_fk/,
    );
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(timetableEntry).values(entryA({ day: 3, roomId: b.room.id })),
      ),
      /timetable_entry_room_fk/,
    );
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(timetableEntry).values(entryA({ day: 3, classGroupId: b.cls.id })),
      ),
      /timetable_entry_class_group_fk/,
    );
  });

  it("cannot write rows for another school", async () => {
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(room).values({ schoolId: b.school.id, name: "Sneaky room" }),
      ),
      /row-level security/,
    );
  });

  it("gives a class at most one lesson per period and day", async () => {
    await withDbContext(asA(), (tx) => tx.insert(timetableEntry).values(entryA({ day: 4 })));
    await expectDbError(
      withDbContext(asA(), (tx) => tx.insert(timetableEntry).values(entryA({ day: 4 }))),
      /timetable_entry_class_slot_key/,
    );
  });

  it("only lets a stage follow a day plan of the same term", async () => {
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(bellScheduleStage).values({
          schoolId: a.school.id,
          termId: a.terms[1]!.id,
          stage: "jhs",
          bellScheduleId: a.plan.id,
        }),
      ),
      /bell_schedule_stage_schedule_fk/,
    );
  });

  it("checks days and period times", async () => {
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(bellSchedule).values({
          schoolId: a.school.id,
          termId: a.terms[0]!.id,
          name: "Bad days",
          days: [0, 8],
        }),
      ),
      /bell_schedule_days_valid/,
    );
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(period).values({
          schoolId: a.school.id,
          bellScheduleId: a.plan.id,
          sortOrder: 2,
          kind: "lesson",
          name: "Backwards",
          startsAt: "09:00",
          endsAt: "08:00",
        }),
      ),
      /period_times/,
    );
  });
});
