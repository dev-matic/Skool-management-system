import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { academicYear, classSubject, gradeLevel, subject } from "@/db/schema";
import {
  addStandardLevels,
  deleteClass,
  deleteLevel,
  listClasses,
  listLevels,
  listTeachers,
  moveLevel,
  saveClass,
} from "@/server/classes";
import type { TenantContext } from "@/server/tenant";
import { addMembership, createSchool, createUser } from "./fixtures";
import { createAdminDb } from "./test-db";

// FAKE school data for tests only.
const admin = createAdminDb();
const meta = { ipAddress: null, userAgent: "vitest" };
let ctx: TenantContext;
let yearId: number;
let teacher: { id: string };
let bursar: { id: string };

beforeAll(async () => {
  const s = await createSchool(admin.db, "Classes School");
  const head = await createUser(admin.db, "Classes Head");
  teacher = await createUser(admin.db, "Class Teacher");
  bursar = await createUser(admin.db, "Only A Bursar");
  await addMembership(admin.db, s.id, head.id, "admin");
  await addMembership(admin.db, s.id, teacher.id, "teacher");
  await addMembership(admin.db, s.id, bursar.id, "bursar");
  ctx = {
    userId: head.id,
    userName: "Classes Head",
    schoolId: s.id,
    schoolName: "Classes School",
    roles: ["admin"],
    hasOtherSchools: false,
  };
  const [year] = await admin.db
    .insert(academicYear)
    .values({ schoolId: s.id, name: "2030/2031", startsOn: "2030-09-09", endsOn: "2031-07-25" })
    .returning();
  yearId = year!.id;
});

afterAll(() => admin.pool.end());

describe("grade levels", () => {
  it("adds the standard levels once, in order", async () => {
    await addStandardLevels(ctx, meta);
    await addStandardLevels(ctx, meta);
    const levels = await listLevels(ctx);
    expect(levels.map((l) => l.name)).toEqual([
      "KG 1",
      "KG 2",
      "Basic 1",
      "Basic 2",
      "Basic 3",
      "Basic 4",
      "Basic 5",
      "Basic 6",
      "JHS 1",
      "JHS 2",
      "JHS 3",
    ]);
  });

  it("moves a level up", async () => {
    const levels = await listLevels(ctx);
    await moveLevel(ctx, levels[1]!.id, -1);
    expect((await listLevels(ctx)).slice(0, 2).map((l) => l.name)).toEqual(["KG 2", "KG 1"]);
    await moveLevel(ctx, levels[1]!.id, 1);
  });
});

describe("classes", () => {
  const level = async (name: string) => (await listLevels(ctx)).find((l) => l.name === name)!.id;

  it("lists only active teachers as class teacher choices", async () => {
    const teachers = await listTeachers(ctx);
    expect(teachers.map((t) => t.userId)).toEqual([teacher.id]);
  });

  it("creates a class with a class teacher", async () => {
    const result = await saveClass(
      ctx,
      null,
      {
        academicYearId: yearId,
        gradeLevelId: await level("JHS 2"),
        name: "JHS 2A",
        classTeacherId: teacher.id,
      },
      meta,
    );
    expect(result.ok).toBe(true);
    const [row] = await listClasses(ctx, yearId);
    expect(row).toMatchObject({
      name: "JHS 2A",
      levelName: "JHS 2",
      classTeacherName: "Class Teacher",
    });
  });

  it("refuses a class teacher who is not a teacher", async () => {
    const result = await saveClass(
      ctx,
      null,
      {
        academicYearId: yearId,
        gradeLevelId: await level("JHS 2"),
        name: "JHS 2B",
        classTeacherId: bursar.id,
      },
      meta,
    );
    expect(result).toMatchObject({ ok: false, field: "classTeacherId" });
  });

  it("refuses a second class with the same name in a year", async () => {
    const result = await saveClass(
      ctx,
      null,
      {
        academicYearId: yearId,
        gradeLevelId: await level("JHS 2"),
        name: "JHS 2A",
        classTeacherId: null,
      },
      meta,
    );
    expect(result).toEqual({
      ok: false,
      field: "name",
      error: "There is already a class called JHS 2A this year.",
    });
  });

  it("will not delete a level that still has classes", async () => {
    expect(await deleteLevel(ctx, await level("JHS 2"), meta)).toEqual({
      ok: false,
      error: "This level has classes. Move or delete its classes first.",
    });
  });

  it("deletes a class together with its subject list", async () => {
    const [cls] = await listClasses(ctx, yearId);
    const [maths] = await admin.db
      .insert(subject)
      .values({ schoolId: ctx.schoolId, name: "Mathematics" })
      .returning();
    await admin.db
      .insert(classSubject)
      .values({ schoolId: ctx.schoolId, classGroupId: cls!.id, subjectId: maths!.id });
    expect(await deleteClass(ctx, cls!.id, meta)).toEqual({ ok: true });
    expect(await listClasses(ctx, yearId)).toEqual([]);
    const left = await admin.db
      .select()
      .from(classSubject)
      .where(eq(classSubject.classGroupId, cls!.id));
    expect(left).toEqual([]);
    expect(await deleteLevel(ctx, await level("JHS 2"), meta)).toEqual({ ok: true });
    const levels = await admin.db
      .select()
      .from(gradeLevel)
      .where(eq(gradeLevel.schoolId, ctx.schoolId));
    expect(levels.some((l) => l.name === "JHS 2")).toBe(false);
  });
});
