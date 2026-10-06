import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { academicYear, classGroup, classSubject, gradeLevel, subject } from "@/db/schema";
import { getAssignmentGrid, myAssignments, saveAssignments } from "@/server/assignments";
import type { TenantContext } from "@/server/tenant";
import { addMembership, createSchool, createUser } from "./fixtures";
import { createAdminDb } from "./test-db";

// FAKE school data for tests only.
const admin = createAdminDb();
const meta = { ipAddress: null, userAgent: "vitest" };
let ctx: TenantContext;
let yearId: number;
let otherYearCs: number;
let teacherA: { id: string };
let teacherB: { id: string };
let bursar: { id: string };
let mathsCs: number;
let englishCs: number;

beforeAll(async () => {
  const s = await createSchool(admin.db, "Assignments School");
  const head = await createUser(admin.db, "Assignments Head");
  teacherA = await createUser(admin.db, "Teacher A");
  teacherB = await createUser(admin.db, "Teacher B");
  bursar = await createUser(admin.db, "Bursar Only");
  await addMembership(admin.db, s.id, head.id, "admin");
  await addMembership(admin.db, s.id, teacherA.id, "teacher");
  await addMembership(admin.db, s.id, teacherB.id, "teacher");
  await addMembership(admin.db, s.id, bursar.id, "bursar");
  ctx = {
    userId: head.id,
    userName: "Assignments Head",
    schoolId: s.id,
    schoolName: "Assignments School",
    roles: ["admin"],
    hasOtherSchools: false,
  };
  const years = await admin.db
    .insert(academicYear)
    .values([
      { schoolId: s.id, name: "2030/2031", startsOn: "2030-09-09", endsOn: "2031-07-25" },
      { schoolId: s.id, name: "2031/2032", startsOn: "2031-09-08", endsOn: "2032-07-23" },
    ])
    .returning();
  yearId = years[0]!.id;
  const [level] = await admin.db
    .insert(gradeLevel)
    .values({ schoolId: s.id, name: "Basic 4", stage: "primary", sortOrder: 1 })
    .returning();
  const [cls, nextYearCls] = await admin.db
    .insert(classGroup)
    .values([
      {
        schoolId: s.id,
        academicYearId: yearId,
        gradeLevelId: level!.id,
        name: "Basic 4",
        classTeacherId: teacherA.id,
      },
      { schoolId: s.id, academicYearId: years[1]!.id, gradeLevelId: level!.id, name: "Basic 4" },
    ])
    .returning();
  const [maths, english] = await admin.db
    .insert(subject)
    .values([
      { schoolId: s.id, name: "Mathematics" },
      { schoolId: s.id, name: "English Language" },
    ])
    .returning();
  const links = await admin.db
    .insert(classSubject)
    .values([
      { schoolId: s.id, classGroupId: cls!.id, subjectId: maths!.id },
      { schoolId: s.id, classGroupId: cls!.id, subjectId: english!.id },
      { schoolId: s.id, classGroupId: nextYearCls!.id, subjectId: maths!.id },
    ])
    .returning();
  [mathsCs, englishCs, otherYearCs] = [links[0]!.id, links[1]!.id, links[2]!.id];
});

afterAll(() => admin.pool.end());

describe("teacher assignments", () => {
  it("shows only subjects the class takes", async () => {
    const grid = await getAssignmentGrid(ctx, yearId);
    expect(grid.classes.map((c) => c.name)).toEqual(["Basic 4"]);
    expect(grid.subjects.map((s) => s.name)).toEqual(["English Language", "Mathematics"]);
    expect(Object.keys(grid.cells)).toHaveLength(2);
  });

  it("saves teachers and reports how many changed", async () => {
    expect(
      await saveAssignments(
        ctx,
        yearId,
        [
          { classSubjectId: mathsCs, teacherId: teacherA.id },
          { classSubjectId: englishCs, teacherId: teacherB.id },
        ],
        meta,
      ),
    ).toEqual({ ok: true, message: "Saved 2 changes." });
    expect(
      await saveAssignments(
        ctx,
        yearId,
        [{ classSubjectId: mathsCs, teacherId: teacherA.id }],
        meta,
      ),
    ).toEqual({ ok: true, message: "No changes to save." });
  });

  it("refuses someone who is not an active teacher", async () => {
    const result = await saveAssignments(
      ctx,
      yearId,
      [{ classSubjectId: mathsCs, teacherId: bursar.id }],
      meta,
    );
    expect(result).toEqual({
      ok: false,
      error: "The teacher chosen for Basic 4 Mathematics is not an active teacher.",
    });
  });

  it("ignores class subjects from another year", async () => {
    const result = await saveAssignments(
      ctx,
      yearId,
      [{ classSubjectId: otherYearCs, teacherId: teacherA.id }],
      meta,
    );
    expect(result).toEqual({ ok: true, message: "No changes to save." });
  });

  it("saving one cell leaves other cells as they are", async () => {
    // Another admin changed English to Teacher A; this save only sends Maths.
    await saveAssignments(
      ctx,
      yearId,
      [{ classSubjectId: englishCs, teacherId: teacherA.id }],
      meta,
    );
    await saveAssignments(ctx, yearId, [{ classSubjectId: mathsCs, teacherId: teacherB.id }], meta);
    const grid = await getAssignmentGrid(ctx, yearId);
    const teachers = Object.values(grid.cells)
      .map((c) => c.teacherId)
      .sort();
    expect(teachers).toEqual([teacherA.id, teacherB.id].sort());
    await saveAssignments(
      ctx,
      yearId,
      [
        { classSubjectId: mathsCs, teacherId: teacherA.id },
        { classSubjectId: englishCs, teacherId: teacherB.id },
      ],
      meta,
    );
  });

  it("lets a teacher see only what they teach", async () => {
    const asTeacherA = { ...ctx, userId: teacherA.id, roles: ["teacher" as const] };
    expect(await myAssignments(asTeacherA, yearId)).toEqual([
      { className: "Basic 4", subjectName: "Mathematics", isClassTeacher: true },
    ]);
  });
});
