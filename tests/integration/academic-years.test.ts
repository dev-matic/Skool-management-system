import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLog, term } from "@/db/schema";
import { demoCalendar } from "@/db/seed-setup";
import { getCurrentTerm, listYears, saveYear } from "@/server/academic-years";
import type { TenantContext } from "@/server/tenant";
import { addMembership, createSchool, createUser } from "./fixtures";
import { createAdminDb } from "./test-db";

// FAKE calendars for tests only.
const admin = createAdminDb();
const meta = { ipAddress: null, userAgent: "vitest" };
let ctx: TenantContext;

const YEAR = {
  name: "2030/2031",
  startsOn: "2030-09-09",
  endsOn: "2031-07-25",
  terms: [
    { number: 1, name: "Term 1", startsOn: "2030-09-09", endsOn: "2030-12-13" },
    { number: 2, name: "Term 2", startsOn: "2031-01-07", endsOn: "2031-04-04" },
    { number: 3, name: "Term 3", startsOn: "2031-04-28", endsOn: "2031-07-25" },
  ],
};

beforeAll(async () => {
  const s = await createSchool(admin.db, "Calendar School");
  const head = await createUser(admin.db, "Calendar Head");
  await addMembership(admin.db, s.id, head.id, "admin");
  ctx = {
    userId: head.id,
    userName: "Calendar Head",
    schoolId: s.id,
    schoolName: "Calendar School",
    roles: ["admin"],
    hasOtherSchools: false,
  };
});

afterAll(() => admin.pool.end());

describe("saving academic years", () => {
  let yearId = 0;

  it("creates a year with its terms and audits it", async () => {
    const result = await saveYear(ctx, null, YEAR, meta);
    expect(result.ok).toBe(true);
    yearId = result.ok ? result.yearId : 0;
    const [year] = await listYears(ctx);
    expect(year).toMatchObject({
      name: "2030/2031",
      terms: [{ number: 1 }, { number: 2 }, { number: 3 }],
    });
    const audit = await admin.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.schoolId, ctx.schoolId), eq(auditLog.entityType, "term")));
    expect(audit).toHaveLength(3);
  });

  it("refuses a year that overlaps another", async () => {
    const result = await saveYear(
      ctx,
      null,
      {
        ...YEAR,
        name: "2031/2032",
        startsOn: "2031-07-01",
        endsOn: "2032-07-23",
        terms: [{ number: 1, name: "Term 1", startsOn: "2031-09-08", endsOn: "2031-12-12" }],
      },
      meta,
    );
    expect(result).toEqual({
      ok: false,
      errors: { startsOn: "These dates overlap the 2030/2031 academic year." },
    });
  });

  it("returns the term rule errors without saving", async () => {
    const bad = {
      ...YEAR,
      name: "2032/2033",
      startsOn: "2032-09-06",
      endsOn: "2033-07-22",
      terms: [],
    };
    expect(await saveYear(ctx, null, bad, meta)).toEqual({
      ok: false,
      errors: { terms: "Add at least one term." },
    });
  });

  it("edits dates and removes a term", async () => {
    const edited = {
      ...YEAR,
      terms: [
        { ...YEAR.terms[0]!, endsOn: "2030-12-20" },
        { ...YEAR.terms[1]!, endsOn: "2031-07-25" },
      ],
    };
    expect(await saveYear(ctx, yearId, edited, meta)).toMatchObject({ ok: true });
    const terms = await admin.db.select().from(term).where(eq(term.academicYearId, yearId));
    expect(terms.map((t) => [t.number, t.endsOn]).sort()).toEqual([
      [1, "2030-12-20"],
      [2, "2031-07-25"],
    ]);
  });
});

describe("current term", () => {
  it("finds today's term in the school's time zone", async () => {
    const s = await createSchool(admin.db, "Today School");
    const head = await createUser(admin.db, "Today Head");
    await addMembership(admin.db, s.id, head.id, "admin");
    const todayCtx = { ...ctx, userId: head.id, schoolId: s.id };
    const { year, terms } = demoCalendar();
    expect(await saveYear(todayCtx, null, { ...year, terms }, meta)).toMatchObject({ ok: true });

    const current = await getCurrentTerm(todayCtx);
    expect(["in-term", "break"]).toContain(current.status.kind);
    if (current.status.kind === "in-term") {
      expect(current.status.term.startsOn <= current.today).toBe(true);
      expect(current.status.term.yearName).toBe(year.name);
    }
  });

  it("is 'none' for a school with no terms", async () => {
    const s = await createSchool(admin.db, "Empty Calendar School");
    const current = await getCurrentTerm({ ...ctx, schoolId: s.id });
    expect(current.status).toEqual({ kind: "none" });
  });
});
