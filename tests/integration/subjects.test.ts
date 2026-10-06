import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { academicYear, classGroup, classSubject, gradeLevel } from "@/db/schema";
import {
  deleteSubject,
  getMatrix,
  listSubjects,
  pairKey,
  saveMatrix,
  saveSubject,
  setSubjectArchived,
} from "@/server/subjects";
import type { TenantContext } from "@/server/tenant";
import { addMembership, createSchool, createUser } from "./fixtures";
import { createAdminDb } from "./test-db";

// FAKE school data for tests only.
const admin = createAdminDb();
const meta = { ipAddress: null, userAgent: "vitest" };
let ctx: TenantContext;
let yearId: number;
let jhs2a: number;
let jhs2b: number;

beforeAll(async () => {
  const s = await createSchool(admin.db, "Subjects School");
  const head = await createUser(admin.db, "Subjects Head");
  await addMembership(admin.db, s.id, head.id, "admin");
  ctx = {
    userId: head.id,
    userName: "Subjects Head",
    schoolId: s.id,
    schoolName: "Subjects School",
    roles: ["admin"],
    hasOtherSchools: false,
  };
  const [year] = await admin.db
    .insert(academicYear)
    .values({ schoolId: s.id, name: "2030/2031", startsOn: "2030-09-09", endsOn: "2031-07-25" })
    .returning();
  yearId = year!.id;
  const [level] = await admin.db
    .insert(gradeLevel)
    .values({ schoolId: s.id, name: "JHS 2", stage: "jhs", sortOrder: 1 })
    .returning();
  const classes = await admin.db
    .insert(classGroup)
    .values([
      { schoolId: s.id, academicYearId: yearId, gradeLevelId: level!.id, name: "JHS 2A" },
      { schoolId: s.id, academicYearId: yearId, gradeLevelId: level!.id, name: "JHS 2B" },
    ])
    .returning();
  [jhs2a, jhs2b] = [classes[0]!.id, classes[1]!.id];
});

afterAll(() => admin.pool.end());

const add = async (name: string) => {
  const result = await saveSubject(ctx, null, { name, shortName: null }, meta);
  if (!result.ok) throw new Error(result.error);
  return result.id!;
};

describe("subjects", () => {
  it("refuses a duplicate name regardless of capitals", async () => {
    await add("Mathematics");
    expect(await saveSubject(ctx, null, { name: "MATHEMATICS", shortName: null }, meta)).toEqual({
      ok: false,
      field: "name",
      error: "There is already a subject called MATHEMATICS.",
    });
  });

  it("saves the class-subject grid: adds and removes", async () => {
    const maths = (await listSubjects(ctx, yearId)).find((s) => s.name === "Mathematics")!.id;
    const english = await add("English Language");

    const first = await saveMatrix(
      ctx,
      yearId,
      [pairKey(jhs2a, maths), pairKey(jhs2a, english), pairKey(jhs2b, maths)],
      meta,
    );
    expect(first).toEqual({ ok: true, message: "Saved: 3 added." });

    const second = await saveMatrix(
      ctx,
      yearId,
      [pairKey(jhs2a, maths), pairKey(jhs2b, maths)],
      meta,
    );
    expect(second).toEqual({ ok: true, message: "Saved: 1 removed." });

    const matrix = await getMatrix(ctx, yearId);
    expect([...matrix.taken].sort()).toEqual([pairKey(jhs2a, maths), pairKey(jhs2b, maths)].sort());
    expect((await listSubjects(ctx, yearId)).find((s) => s.id === maths)?.classCount).toBe(2);
  });

  it("ignores pairs for classes or subjects that are not part of this year", async () => {
    const result = await saveMatrix(
      ctx,
      yearId,
      [...(await getMatrix(ctx, yearId)).taken, "999999:1"],
      meta,
    );
    expect(result).toEqual({ ok: true, message: "No changes to save." });
  });

  it("keeps an archived subject's classes when the grid is saved", async () => {
    const french = await add("French");
    await saveMatrix(
      ctx,
      yearId,
      [...(await getMatrix(ctx, yearId)).taken, pairKey(jhs2a, french)],
      meta,
    );
    await setSubjectArchived(ctx, french, true, meta);

    const matrix = await getMatrix(ctx, yearId);
    expect(matrix.subjects.some((s) => s.id === french)).toBe(false);
    await saveMatrix(ctx, yearId, [...matrix.taken], meta);

    const links = await admin.db
      .select()
      .from(classSubject)
      .where(eq(classSubject.subjectId, french));
    expect(links).toHaveLength(1);
  });

  it("will not delete a subject that classes take, but deletes an unused one", async () => {
    const maths = (await listSubjects(ctx, yearId)).find((s) => s.name === "Mathematics")!.id;
    expect(await deleteSubject(ctx, maths, meta)).toMatchObject({ ok: false });
    const unused = await add("Spare Subject");
    expect(await deleteSubject(ctx, unused, meta)).toEqual({ ok: true });
  });
});
