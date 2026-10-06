import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { academicYear, classGroup, classSubject, gradeLevel, subject, term } from "@/db/schema";
import { withDbContext } from "@/server/db-context";
import { addMembership, createSchool, createUser, expectDbError } from "./fixtures";
import { createAdminDb } from "./test-db";

/*
 * School setup tables (M2): row-level security keeps schools apart, and the
 * database refuses rows that point at another school's data.
 */

const admin = createAdminDb();
let schoolA: { id: number };
let schoolB: { id: number };
let adminA: { id: string };
let yearA: { id: number } | undefined;
let yearB: { id: number } | undefined;
let levelA: { id: number } | undefined;
let classA: { id: number } | undefined;
let subjectA: { id: number } | undefined;
let subjectB: { id: number } | undefined;

const asA = () => ({ userId: adminA.id, schoolId: schoolA.id });

beforeAll(async () => {
  schoolA = await createSchool(admin.db, "Setup School A");
  schoolB = await createSchool(admin.db, "Setup School B");
  adminA = await createUser(admin.db, "Setup Admin A");
  await addMembership(admin.db, schoolA.id, adminA.id, "admin");

  [yearA] = await admin.db
    .insert(academicYear)
    .values({
      schoolId: schoolA.id,
      name: "2025/2026",
      startsOn: "2025-09-08",
      endsOn: "2026-07-24",
    })
    .returning();
  [yearB] = await admin.db
    .insert(academicYear)
    .values({
      schoolId: schoolB.id,
      name: "2025/2026",
      startsOn: "2025-09-08",
      endsOn: "2026-07-24",
    })
    .returning();
  await admin.db.insert(term).values([
    {
      schoolId: schoolA.id,
      academicYearId: yearA!.id,
      number: 1,
      name: "Term 1",
      startsOn: "2025-09-08",
      endsOn: "2025-12-12",
    },
    {
      schoolId: schoolB.id,
      academicYearId: yearB!.id,
      number: 1,
      name: "Term 1",
      startsOn: "2025-09-08",
      endsOn: "2025-12-12",
    },
  ]);
  [levelA] = await admin.db
    .insert(gradeLevel)
    .values({ schoolId: schoolA.id, name: "JHS 2", stage: "jhs", sortOrder: 11 })
    .returning();
  await admin.db
    .insert(gradeLevel)
    .values({ schoolId: schoolB.id, name: "JHS 2", stage: "jhs", sortOrder: 11 });
  [classA] = await admin.db
    .insert(classGroup)
    .values({
      schoolId: schoolA.id,
      academicYearId: yearA!.id,
      gradeLevelId: levelA!.id,
      name: "JHS 2A",
    })
    .returning();
  [subjectA] = await admin.db
    .insert(subject)
    .values({ schoolId: schoolA.id, name: "Mathematics" })
    .returning();
  [subjectB] = await admin.db
    .insert(subject)
    .values({ schoolId: schoolB.id, name: "Mathematics" })
    .returning();
});

afterAll(() => admin.pool.end());

describe("school setup isolation", () => {
  it("each table shows only the current school's rows", async () => {
    const rows = await withDbContext(asA(), async (tx) => ({
      years: await tx.select().from(academicYear),
      terms: await tx.select().from(term),
      levels: await tx.select().from(gradeLevel),
      classes: await tx.select().from(classGroup),
      subjects: await tx.select().from(subject),
    }));
    for (const list of Object.values(rows)) {
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((r) => r.schoolId === schoolA.id)).toBe(true);
    }
  });

  it("shows nothing without a school in the request context", async () => {
    const years = await withDbContext({ userId: adminA.id, schoolId: null }, (tx) =>
      tx.select().from(academicYear),
    );
    expect(years).toEqual([]);
  });

  it("cannot create rows for another school", async () => {
    await expectDbError(
      withDbContext(asA(), (tx) =>
        tx.insert(subject).values({ schoolId: schoolB.id, name: "Science" }),
      ),
      /row-level security/,
    );
  });

  it("cannot rename another school's subject", async () => {
    const updated = await withDbContext(asA(), (tx) =>
      tx.update(subject).set({ name: "Hacked" }).where(eq(subject.id, subjectB!.id)).returning(),
    );
    expect(updated).toEqual([]);
  });

  it("can create its own rows", async () => {
    const [row] = await withDbContext(asA(), (tx) =>
      tx.insert(subject).values({ schoolId: schoolA.id, name: "Integrated Science" }).returning(),
    );
    expect(row?.schoolId).toBe(schoolA.id);
  });
});

describe("school setup database rules", () => {
  it("refuses a class subject pointing at another school's subject", async () => {
    await expectDbError(
      admin.db
        .insert(classSubject)
        .values({ schoolId: schoolA.id, classGroupId: classA!.id, subjectId: subjectB!.id }),
      /class_subject_subject_fk/,
    );
  });

  it("refuses a term in another school's academic year", async () => {
    await expectDbError(
      admin.db.insert(term).values({
        schoolId: schoolA.id,
        academicYearId: yearB!.id,
        number: 2,
        name: "Term 2",
        startsOn: "2026-01-05",
        endsOn: "2026-04-02",
      }),
      /term_academic_year_fk/,
    );
  });

  it("allows one teacher per class subject", async () => {
    await admin.db
      .insert(classSubject)
      .values({ schoolId: schoolA.id, classGroupId: classA!.id, subjectId: subjectA!.id });
    await expectDbError(
      admin.db
        .insert(classSubject)
        .values({ schoolId: schoolA.id, classGroupId: classA!.id, subjectId: subjectA!.id }),
      /class_subject_class_subject_key/,
    );
  });

  it("refuses badly named academic years and backwards dates", async () => {
    await expectDbError(
      admin.db.insert(academicYear).values({
        schoolId: schoolA.id,
        name: "2025-26",
        startsOn: "2026-09-07",
        endsOn: "2027-07-23",
      }),
      /academic_year_name_format/,
    );
    await expectDbError(
      admin.db.insert(academicYear).values({
        schoolId: schoolA.id,
        name: "2026/2027",
        startsOn: "2027-07-23",
        endsOn: "2026-09-07",
      }),
      /academic_year_dates/,
    );
  });

  it("treats subject names as the same regardless of capitals", async () => {
    await expectDbError(
      admin.db.insert(subject).values({ schoolId: schoolA.id, name: "MATHEMATICS" }),
      /subject_school_name_key/,
    );
  });
});
