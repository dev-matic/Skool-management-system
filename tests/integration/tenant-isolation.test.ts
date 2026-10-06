import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLog, membership, school } from "@/db/schema";
import { withDbContext } from "@/server/db-context";
import { addMembership, createSchool, createUser, expectDbError } from "./fixtures";
import { createAdminDb } from "./test-db";

/*
 * These tests prove that row-level security keeps schools apart even when
 * application code forgets to filter by school_id: the queries below
 * deliberately have no WHERE school_id clause.
 */

const admin = createAdminDb();
let schoolA: { id: number };
let schoolB: { id: number };
let adminA: { id: string };
let adminB: { id: string };
let multi: { id: string };
let membershipA: { id: number };

beforeAll(async () => {
  schoolA = await createSchool(admin.db, "Isolation School A");
  schoolB = await createSchool(admin.db, "Isolation School B");
  adminA = await createUser(admin.db, "Admin A");
  adminB = await createUser(admin.db, "Admin B");
  multi = await createUser(admin.db, "Works At Both");
  membershipA = await addMembership(admin.db, schoolA.id, adminA.id, "admin");
  await addMembership(admin.db, schoolB.id, adminB.id, "admin");
  await addMembership(admin.db, schoolA.id, multi.id, "teacher");
  await addMembership(admin.db, schoolB.id, multi.id, "admin");
  await admin.db.insert(auditLog).values([
    { schoolId: schoolA.id, actorId: adminA.id, action: "create", entityType: "test" },
    { schoolId: schoolB.id, actorId: adminB.id, action: "create", entityType: "test" },
  ]);
});

afterAll(() => admin.pool.end());

const asAdminA = () => ({ userId: adminA.id, schoolId: schoolA.id });

describe("reading", () => {
  it("sees nothing at all without a request context (fails closed)", async () => {
    const rows = await withDbContext({ userId: null, schoolId: null }, async (tx) => ({
      schools: await tx.select().from(school),
      memberships: await tx.select().from(membership),
      audit: await tx.select().from(auditLog),
    }));
    expect(rows).toEqual({ schools: [], memberships: [], audit: [] });
  });

  it("only sees the current school's memberships and audit entries", async () => {
    const { memberships, audit } = await withDbContext(asAdminA(), async (tx) => ({
      memberships: await tx.select().from(membership),
      audit: await tx.select().from(auditLog),
    }));
    expect(memberships.length).toBeGreaterThan(0);
    expect(memberships.every((m) => m.schoolId === schoolA.id)).toBe(true);
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.every((a) => a.schoolId === schoolA.id)).toBe(true);
  });

  it("returns nothing when asking for another school by id", async () => {
    const rows = await withDbContext(asAdminA(), (tx) =>
      tx.select().from(membership).where(eq(membership.schoolId, schoolB.id)),
    );
    expect(rows).toEqual([]);
  });

  it("only sees schools the user belongs to", async () => {
    const schools = await withDbContext({ userId: adminA.id, schoolId: null }, (tx) =>
      tx.select({ id: school.id }).from(school),
    );
    expect(schools.map((s) => s.id)).toEqual([schoolA.id]);
  });

  it("lets a user who works at two schools see both, to choose between them", async () => {
    const { schools, memberships } = await withDbContext(
      { userId: multi.id, schoolId: null },
      async (tx) => ({
        schools: await tx.select({ id: school.id }).from(school),
        memberships: await tx.select().from(membership),
      }),
    );
    expect(schools.map((s) => s.id).sort()).toEqual([schoolA.id, schoolB.id].sort());
    // Their own memberships only - not their colleagues' at the other school.
    expect(memberships.every((m) => m.userId === multi.id)).toBe(true);
    expect(memberships).toHaveLength(2);
  });

  it("does not carry the school setting over to the next transaction", async () => {
    await withDbContext(asAdminA(), (tx) => tx.select().from(membership));
    const settings = await withDbContext({ userId: null, schoolId: null }, (tx) =>
      tx.execute<{ school: string | null }>(
        sql`select current_setting('app.school_id', true) as school`,
      ),
    );
    expect(settings.rows[0]?.school ?? "").toBe("");
  });
});

describe("writing", () => {
  it("cannot add a membership to another school", async () => {
    await expectDbError(
      withDbContext(asAdminA(), (tx) =>
        tx.insert(membership).values({ schoolId: schoolB.id, userId: adminA.id, role: "admin" }),
      ),
      /row-level security/,
    );
  });

  it("cannot move a membership into another school", async () => {
    await expectDbError(
      withDbContext(asAdminA(), (tx) =>
        tx
          .update(membership)
          .set({ schoolId: schoolB.id })
          .where(eq(membership.id, membershipA.id)),
      ),
      /row-level security/,
    );
  });

  it("cannot change another school's details", async () => {
    const updated = await withDbContext(asAdminA(), (tx) =>
      tx.update(school).set({ name: "Hacked" }).where(eq(school.id, schoolB.id)).returning(),
    );
    expect(updated).toEqual([]);
    const [b] = await admin.db.select().from(school).where(eq(school.id, schoolB.id));
    expect(b?.name).toBe("Isolation School B");
  });

  it("cannot delete another school's memberships", async () => {
    const deleted = await withDbContext(asAdminA(), (tx) =>
      tx.delete(membership).where(eq(membership.schoolId, schoolB.id)).returning(),
    );
    expect(deleted).toEqual([]);
  });

  it("can change its own school's details", async () => {
    const updated = await withDbContext(asAdminA(), (tx) =>
      tx
        .update(school)
        .set({ address: "P.O. Box 1, Accra" })
        .where(eq(school.id, schoolA.id))
        .returning(),
    );
    expect(updated).toHaveLength(1);
  });

  it("cannot create schools (a platform task, not a school task)", async () => {
    await expectDbError(
      withDbContext(asAdminA(), (tx) =>
        tx.insert(school).values({ name: "New", slug: "new-school" }),
      ),
      /permission denied/,
    );
  });
});
