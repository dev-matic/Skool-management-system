import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  academicYear,
  auditLog,
  bellSchedule,
  classGroup,
  classSubject,
  gradeLevel,
  subject,
  term,
  timetableEntry,
} from "@/db/schema";
import type { Role } from "@/domain/roles";
import type { TenantContext } from "@/server/tenant";
import {
  copyTimetable,
  getClassTimetable,
  getDayPlans,
  getTeacherTimetable,
  lessonsForDay,
  saveClassTimetable,
  saveDayPlan,
  saveRoom,
  type PlanSave,
} from "@/server/timetable";
import { addMembership, createSchool, createUser } from "./fixtures";
import { createAdminDb } from "./test-db";

// FAKE school data for tests only.
const admin = createAdminDb();
const meta = { ipAddress: null, userAgent: "vitest" };

let schoolId: number;
let t1: number;
let t2: number;
const cls: Record<string, number> = {};
const subj: Record<string, number> = {};
const people: Record<string, { id: string }> = {};
let lab: number;
let p: Record<string, number>; // JHS periods by name
let kgP1: number;

const ctxFor = (who: string, roles: Role[]): TenantContext => ({
  userId: people[who]!.id,
  userName: who,
  schoolId,
  schoolName: "Timetable School",
  roles,
  hasOtherSchools: false,
});
const asAdmin = () => ctxFor("Head", ["admin"]);

const lesson = (name: string, startsAt: string, endsAt: string) => ({
  kind: "lesson" as const,
  name,
  startsAt,
  endsAt,
});
const jhsPlan: PlanSave = {
  name: "Main day",
  days: [1, 2, 3, 4, 5],
  stages: ["jhs"],
  periods: [
    lesson("Period 1", "08:00", "08:40"),
    lesson("Period 2", "08:40", "09:20"),
    { kind: "break", name: "Break", startsAt: "09:20", endsAt: "09:50" },
  ],
};

beforeAll(async () => {
  const s = await createSchool(admin.db, "Timetable School");
  schoolId = s.id;
  for (const name of ["Head", "Kwabena Frimpong", "Nana Ama Osei", "Kojo Bursar"]) {
    people[name] = await createUser(admin.db, name);
  }
  await addMembership(admin.db, schoolId, people.Head!.id, "admin");
  await addMembership(admin.db, schoolId, people["Kwabena Frimpong"]!.id, "teacher");
  await addMembership(admin.db, schoolId, people["Nana Ama Osei"]!.id, "teacher");
  await addMembership(admin.db, schoolId, people["Kojo Bursar"]!.id, "bursar");

  const [year] = await admin.db
    .insert(academicYear)
    .values({ schoolId, name: "2040/2041", startsOn: "2040-09-03", endsOn: "2041-07-26" })
    .returning();
  const terms = await admin.db
    .insert(term)
    .values([
      {
        schoolId,
        academicYearId: year!.id,
        number: 1,
        name: "Term 1",
        startsOn: "2040-09-03",
        endsOn: "2040-12-14",
      },
      {
        schoolId,
        academicYearId: year!.id,
        number: 2,
        name: "Term 2",
        startsOn: "2041-01-07",
        endsOn: "2041-04-05",
      },
    ])
    .returning();
  [t1, t2] = [terms[0]!.id, terms[1]!.id];

  const levels = await admin.db
    .insert(gradeLevel)
    .values([
      { schoolId, name: "KG 1", stage: "kg", sortOrder: 1 },
      { schoolId, name: "JHS 1", stage: "jhs", sortOrder: 9 },
    ])
    .returning();
  const classes = await admin.db
    .insert(classGroup)
    .values([
      { schoolId, academicYearId: year!.id, gradeLevelId: levels[0]!.id, name: "KG 1" },
      { schoolId, academicYearId: year!.id, gradeLevelId: levels[1]!.id, name: "JHS 1A" },
      { schoolId, academicYearId: year!.id, gradeLevelId: levels[1]!.id, name: "JHS 1B" },
    ])
    .returning();
  for (const c of classes) cls[c.name] = c.id;
  const subjects = await admin.db
    .insert(subject)
    .values([
      { schoolId, name: "Mathematics" },
      { schoolId, name: "English Language" },
    ])
    .returning();
  for (const x of subjects) subj[x.name] = x.id;
  const kwabena = people["Kwabena Frimpong"]!.id;
  const nana = people["Nana Ama Osei"]!.id;
  await admin.db.insert(classSubject).values([
    { schoolId, classGroupId: cls["JHS 1A"]!, subjectId: subj.Mathematics!, teacherId: kwabena },
    {
      schoolId,
      classGroupId: cls["JHS 1A"]!,
      subjectId: subj["English Language"]!,
      teacherId: nana,
    },
    { schoolId, classGroupId: cls["JHS 1B"]!, subjectId: subj.Mathematics!, teacherId: kwabena },
    {
      schoolId,
      classGroupId: cls["KG 1"]!,
      subjectId: subj["English Language"]!,
      teacherId: kwabena,
    },
  ]);
});

afterAll(() => admin.pool.end());

describe("day plans", () => {
  it("only admins change them, and bad plans name what to fix", async () => {
    expect(await saveDayPlan(ctxFor("Kojo Bursar", ["bursar"]), t1, jhsPlan, meta)).toMatchObject({
      ok: false,
      error: /Only administrators/,
    });
    const bad = await saveDayPlan(asAdmin(), t1, { ...jhsPlan, days: [], periods: [] }, meta);
    expect(bad).toMatchObject({
      ok: false,
      errors: { days: expect.any(String), periods: expect.any(String) },
    });
  });

  it("saves a JHS plan and a KG plan with different times", async () => {
    expect(await saveDayPlan(asAdmin(), t1, jhsPlan, meta)).toMatchObject({ ok: true });
    expect(
      await saveDayPlan(
        asAdmin(),
        t1,
        {
          name: "KG day",
          days: [1, 2, 3, 4, 5],
          stages: ["kg"],
          periods: [lesson("KG 1st", "08:20", "09:00")],
        },
        meta,
      ),
    ).toMatchObject({ ok: true });
    const plans = await getDayPlans(asAdmin(), t1);
    expect(plans.map((x) => [x.name, x.stages])).toEqual([
      ["KG day", ["kg"]],
      ["Main day", ["jhs"]],
    ]);
    const main = plans.find((x) => x.name === "Main day")!;
    expect(main.periods.map((x) => [x.name, x.startsAt, x.endsAt])).toEqual([
      ["Period 1", "08:00", "08:40"],
      ["Period 2", "08:40", "09:20"],
      ["Break", "09:20", "09:50"],
    ]);
    p = Object.fromEntries(main.periods.map((x) => [x.name, x.id]));
    kgP1 = plans.find((x) => x.name === "KG day")!.periods[0]!.id;
  });

  it("refuses a second plan with the same name in a term", async () => {
    const result = await saveDayPlan(
      asAdmin(),
      t1,
      { ...jhsPlan, name: "main DAY", stages: [] },
      meta,
    );
    expect(result).toMatchObject({ ok: false, errors: { name: /already has a day plan/ } });
  });
});

describe("class timetables", () => {
  it("saves a lesson and takes the teacher from the subject assignment", async () => {
    lab = ((await saveRoom(asAdmin(), { name: "Science lab" }, meta)) as { id: number }).id;
    const result = await saveClassTimetable(
      asAdmin(),
      cls["JHS 1A"]!,
      t1,
      [{ periodId: p["Period 1"]!, day: 1, subjectId: subj.Mathematics!, roomId: null }],
      meta,
    );
    expect(result).toEqual({ ok: true, message: "Saved 1 lesson." });
    const tt = await getClassTimetable(asAdmin(), cls["JHS 1A"]!, t1);
    expect(tt!.lessons).toEqual([
      expect.objectContaining({
        day: 1,
        subjectName: "Mathematics",
        teacherName: "Kwabena Frimpong",
      }),
    ]);
    const [audit] = await admin.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.schoolId, schoolId), eq(auditLog.entityType, "class_timetable")));
    expect(audit).toBeTruthy();
  });

  it("refuses a teacher in two classes at once and saves nothing", async () => {
    const result = await saveClassTimetable(
      asAdmin(),
      cls["JHS 1B"]!,
      t1,
      [
        { periodId: p["Period 2"]!, day: 1, subjectId: subj.Mathematics!, roomId: null },
        { periodId: p["Period 1"]!, day: 1, subjectId: subj.Mathematics!, roomId: null },
      ],
      meta,
    );
    expect(result).toMatchObject({
      ok: false,
      clashes: [
        "Kwabena Frimpong is already teaching JHS 1A (Mathematics) on Monday 08:00–08:40, so cannot teach JHS 1B Mathematics then.",
      ],
    });
    expect((await getClassTimetable(asAdmin(), cls["JHS 1B"]!, t1))!.lessons).toEqual([]);
  });

  it("finds a clash with a KG lesson in a different day plan", async () => {
    const result = await saveClassTimetable(
      asAdmin(),
      cls["KG 1"]!,
      t1,
      [{ periodId: kgP1, day: 1, subjectId: subj["English Language"]!, roomId: null }],
      meta,
    );
    expect(result).toMatchObject({
      ok: false,
      clashes: [expect.stringMatching(/Kwabena Frimpong is already teaching JHS 1A/)],
    });
  });

  it("refuses a double-booked room", async () => {
    expect(
      await saveClassTimetable(
        asAdmin(),
        cls["JHS 1A"]!,
        t1,
        [{ periodId: p["Period 2"]!, day: 2, subjectId: subj["English Language"]!, roomId: lab }],
        meta,
      ),
    ).toMatchObject({ ok: true });
    const result = await saveClassTimetable(
      asAdmin(),
      cls["JHS 1B"]!,
      t1,
      [{ periodId: p["Period 2"]!, day: 2, subjectId: subj.Mathematics!, roomId: lab }],
      meta,
    );
    expect(result).toMatchObject({
      ok: false,
      clashes: [
        "Science lab is already booked for JHS 1A (English Language) on Tuesday 08:40–09:20.",
      ],
    });
  });

  it("refuses breaks, days outside the plan and subjects the class does not take", async () => {
    const save = (periodId: number, day: number, subjectId: number) =>
      saveClassTimetable(
        asAdmin(),
        cls["JHS 1B"]!,
        t1,
        [{ periodId, day, subjectId, roomId: null }],
        meta,
      );
    expect(await save(p.Break!, 1, subj.Mathematics!)).toMatchObject({ ok: false });
    expect(await save(p["Period 1"]!, 6, subj.Mathematics!)).toMatchObject({ ok: false });
    expect(await save(p["Period 1"]!, 3, subj["English Language"]!)).toMatchObject({
      ok: false,
      error: /does not take that subject/,
    });
  });

  it("clears a cell", async () => {
    await saveClassTimetable(
      asAdmin(),
      cls["JHS 1A"]!,
      t1,
      [{ periodId: p["Period 2"]!, day: 2, subjectId: null, roomId: null }],
      meta,
    );
    const tt = await getClassTimetable(asAdmin(), cls["JHS 1A"]!, t1);
    expect(tt!.lessons.map((l) => l.day)).toEqual([1]);
  });
});

describe("who can see what", () => {
  it("a teacher sees the classes they teach, not others", async () => {
    const nana = ctxFor("Nana Ama Osei", ["teacher"]);
    expect(await getClassTimetable(nana, cls["JHS 1A"]!, t1)).not.toBeNull();
    expect(await getClassTimetable(nana, cls["JHS 1B"]!, t1)).toBeNull();
    expect(await getClassTimetable(nana, cls["KG 1"]!, t1)).toBeNull();
  });

  it("a teacher reads only their own timetable; admins read anyone's", async () => {
    const kwabena = ctxFor("Kwabena Frimpong", ["teacher"]);
    const nana = ctxFor("Nana Ama Osei", ["teacher"]);
    expect(await getTeacherTimetable(nana, people["Kwabena Frimpong"]!.id, t1)).toBeNull();
    const own = await getTeacherTimetable(kwabena, people["Kwabena Frimpong"]!.id, t1);
    expect(own!.map((l) => [l.className, l.day, l.startsAt])).toEqual([["JHS 1A", 1, "08:00"]]);
    expect(await getTeacherTimetable(asAdmin(), people["Kwabena Frimpong"]!.id, t1)).toHaveLength(
      1,
    );
    expect(await lessonsForDay(kwabena, t1, 1)).toHaveLength(1);
    expect(await lessonsForDay(kwabena, t1, 2)).toHaveLength(0);
  });

  it("teachers cannot change a timetable", async () => {
    const result = await saveClassTimetable(
      ctxFor("Kwabena Frimpong", ["teacher"]),
      cls["JHS 1A"]!,
      t1,
      [{ periodId: p["Period 2"]!, day: 3, subjectId: subj.Mathematics!, roomId: null }],
      meta,
    );
    expect(result).toMatchObject({ ok: false, error: /Only administrators/ });
  });
});

describe("changing a day plan with lessons", () => {
  it("cannot remove a period that has lessons, and undoes the whole save", async () => {
    const main = (await getDayPlans(asAdmin(), t1)).find((x) => x.name === "Main day")!;
    const result = await saveDayPlan(
      asAdmin(),
      t1,
      {
        id: main.id,
        name: "Renamed day",
        days: main.days,
        stages: ["jhs"],
        periods: main.periods.slice(1),
      },
      meta,
    );
    expect(result).toMatchObject({ ok: false, error: /Period 1 already has lessons/ });
    const [row] = await admin.db.select().from(bellSchedule).where(eq(bellSchedule.id, main.id));
    expect(row!.name).toBe("Main day");
  });

  it("refuses new times that would make lessons in another day plan clash", async () => {
    const kg = (await getDayPlans(asAdmin(), t1)).find((x) => x.name === "KG day")!;
    const kgAt = (startsAt: string, endsAt: string) =>
      saveDayPlan(
        asAdmin(),
        t1,
        { ...kg, periods: [{ ...kg.periods[0]!, startsAt, endsAt }] },
        meta,
      );
    // Kwabena teaches KG 1 at 10:00 and JHS 1B at 08:00 on Tuesday: no clash.
    expect(await kgAt("10:00", "10:40")).toMatchObject({ ok: true });
    for (const [classId, periodId, subjectId] of [
      [cls["KG 1"]!, kgP1, subj["English Language"]!],
      [cls["JHS 1B"]!, p["Period 1"]!, subj.Mathematics!],
    ] as const) {
      expect(
        await saveClassTimetable(
          asAdmin(),
          classId,
          t1,
          [{ periodId, day: 2, subjectId, roomId: null }],
          meta,
        ),
      ).toMatchObject({ ok: true });
    }
    // Moving the KG lesson to 08:20 would put him in two places.
    const result = await kgAt("08:20", "09:00");
    expect(result).toMatchObject({
      ok: false,
      clashes: [expect.stringMatching(/Kwabena Frimpong is already teaching/)],
    });
    const after = (await getDayPlans(asAdmin(), t1)).find((x) => x.name === "KG day")!;
    expect(after.periods[0]).toMatchObject({ startsAt: "10:00", endsAt: "10:40" });
  });

  it("will not move a stage whose classes already have lessons", async () => {
    const main = (await getDayPlans(asAdmin(), t1)).find((x) => x.name === "Main day")!;
    const result = await saveDayPlan(asAdmin(), t1, { ...main, stages: [] }, meta);
    expect(result).toMatchObject({ ok: false, error: /JHS classes already have lessons/ });
  });
});

describe("copying a term", () => {
  it("copies day plans and lessons into an empty term, only once", async () => {
    const result = await copyTimetable(asAdmin(), t1, t2, meta);
    expect(result).toMatchObject({
      ok: true,
      message: expect.stringMatching(/Copied 2 day plans and 3 lessons/),
    });
    const copied = await admin.db
      .select()
      .from(timetableEntry)
      .where(eq(timetableEntry.termId, t2));
    expect(copied).toHaveLength(3);
    expect(await copyTimetable(asAdmin(), t1, t2, meta)).toMatchObject({
      ok: false,
      error: /already has a day plan/,
    });
    // The source term is untouched.
    expect(
      await admin.db.select().from(timetableEntry).where(eq(timetableEntry.termId, t1)),
    ).toHaveLength(3);
  });
});
