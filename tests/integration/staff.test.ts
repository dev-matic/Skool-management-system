import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { account, auditLog, membership, session, user } from "@/db/schema";
import { withDbContext } from "@/server/db-context";
import {
  addStaff,
  listStaff,
  resetStaffPassword,
  setStaffActive,
  setStaffRoles,
} from "@/server/staff";
import type { TenantContext } from "@/server/tenant";
import { addMembership, createSchool, createUser, uniq } from "./fixtures";
import { createAdminDb } from "./test-db";

/*
 * Staff management rules (M2). All names and numbers are FAKE test data.
 */

const admin = createAdminDb();
const meta = { ipAddress: null, userAgent: "vitest" };
let schoolA: { id: number };
let schoolB: { id: number };
let headA: { id: string };
let ctxA: TenantContext;
let phoneSeq = 0;

/** A unique fake Ghanaian mobile number for each test. */
function fakePhone(): string {
  phoneSeq += 1;
  const tail = String(Date.now() % 100000).padStart(5, "0") + String(phoneSeq).padStart(2, "0");
  return `+23324${tail}`;
}

beforeAll(async () => {
  schoolA = await createSchool(admin.db, "Staff School A");
  schoolB = await createSchool(admin.db, "Staff School B");
  headA = await createUser(admin.db, "Head A");
  await addMembership(admin.db, schoolA.id, headA.id, "admin");
  ctxA = {
    userId: headA.id,
    userName: "Head A",
    schoolId: schoolA.id,
    schoolName: "Staff School A",
    roles: ["admin"],
    hasOtherSchools: false,
  };
});

afterAll(() => admin.pool.end());

const newStaff = (overrides: Partial<Parameters<typeof addStaff>[1]> = {}) => ({
  name: `Teacher ${uniq()}`,
  phone: fakePhone(),
  email: null,
  roles: ["teacher" as const],
  password: "first-pass-1",
  ...overrides,
});

async function passwordHashOf(userId: string) {
  const [row] = await admin.db.select().from(account).where(eq(account.userId, userId));
  return row?.password;
}

describe("adding staff", () => {
  it("creates an account, a membership and an audit entry", async () => {
    const input = newStaff();
    const result = await addStaff(ctxA, input, meta);
    expect(result.ok).toBe(true);
    const userId = result.ok ? result.userId! : "";

    const [created] = await admin.db.select().from(user).where(eq(user.id, userId));
    expect(created?.phoneNumber).toBe(input.phone);
    expect(created?.email).toMatch(/@phone\.invalid$/);
    expect(await passwordHashOf(userId)).toBeTruthy();
    expect(await passwordHashOf(userId)).not.toBe("first-pass-1");

    const staff = await listStaff(ctxA);
    expect(staff.find((s) => s.userId === userId)).toMatchObject({
      roles: ["teacher"],
      active: true,
      email: null,
    });
    const audit = await admin.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entityType, "staff_member"), eq(auditLog.entityId, userId)));
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit[0]?.changes)).not.toContain("first-pass-1");
  });

  it("links someone who already has an account elsewhere, keeping their password", async () => {
    const elsewhere = newStaff();
    const ctxB = { ...ctxA, schoolId: schoolB.id };
    const headB = await createUser(admin.db, "Head B");
    await addMembership(admin.db, schoolB.id, headB.id, "admin");
    const first = await addStaff({ ...ctxB, userId: headB.id }, elsewhere, meta);
    const userId = first.ok ? first.userId! : "";
    const hashBefore = await passwordHashOf(userId);

    const linked = await addStaff(ctxA, { ...elsewhere, password: "different-pass" }, meta);
    expect(linked).toMatchObject({ ok: true, userId });
    expect(await passwordHashOf(userId)).toBe(hashBefore);
  });

  it("refuses to add the same person twice", async () => {
    const input = newStaff();
    await addStaff(ctxA, input, meta);
    expect(await addStaff(ctxA, input, meta)).toMatchObject({ ok: false, field: "phone" });
  });
});

describe("roles and deactivation", () => {
  it("changes roles", async () => {
    const added = await addStaff(ctxA, newStaff(), meta);
    const userId = added.ok ? added.userId! : "";
    expect(await setStaffRoles(ctxA, userId, ["teacher", "bursar"], meta)).toMatchObject({
      ok: true,
    });
    const staff = await listStaff(ctxA);
    expect(staff.find((s) => s.userId === userId)?.roles).toEqual(["bursar", "teacher"]);
  });

  it("never leaves the school without an active admin", async () => {
    const school = await createSchool(admin.db, "Lonely Admin School");
    const onlyAdmin = await createUser(admin.db, "Only Admin");
    await addMembership(admin.db, school.id, onlyAdmin.id, "admin");
    const other = await createUser(admin.db, "Other Admin");
    await addMembership(admin.db, school.id, other.id, "teacher");
    const ctx = { ...ctxA, userId: other.id, schoolId: school.id };
    expect(await setStaffRoles(ctx, onlyAdmin.id, ["teacher"], meta)).toMatchObject({
      ok: false,
      error: "The school must keep at least one active administrator.",
    });
    expect(await setStaffActive(ctx, onlyAdmin.id, false, meta)).toMatchObject({ ok: false });
  });

  it("does not let admins remove their own admin role or deactivate themselves", async () => {
    expect(await setStaffRoles(ctxA, headA.id, ["teacher"], meta)).toMatchObject({ ok: false });
    expect(await setStaffActive(ctxA, headA.id, false, meta)).toMatchObject({ ok: false });
  });

  it("deactivates in this school only, and can reactivate", async () => {
    const added = await addStaff(ctxA, newStaff(), meta);
    const userId = added.ok ? added.userId! : "";
    expect(await setStaffActive(ctxA, userId, false, meta)).toMatchObject({ ok: true });
    const rows = await admin.db
      .select()
      .from(membership)
      .where(and(eq(membership.userId, userId), eq(membership.schoolId, schoolA.id)));
    expect(rows.every((r) => !r.isActive)).toBe(true);
    expect((await listStaff(ctxA)).find((s) => s.userId === userId)?.active).toBe(false);
    expect(await setStaffActive(ctxA, userId, true, meta)).toMatchObject({ ok: true });
  });
});

describe("password reset", () => {
  it("sets a new password and signs the person out everywhere", async () => {
    const added = await addStaff(ctxA, newStaff(), meta);
    const userId = added.ok ? added.userId! : "";
    await admin.db.insert(session).values({
      id: uniq(),
      token: `token-${uniq()}`,
      userId,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const before = await passwordHashOf(userId);
    expect(await resetStaffPassword(ctxA, userId, "brand-new-pass", meta)).toMatchObject({
      ok: true,
    });
    expect(await passwordHashOf(userId)).not.toBe(before);
    const sessions = await admin.db.select().from(session).where(eq(session.userId, userId));
    expect(sessions).toEqual([]);
  });

  it("refuses for someone who also works at another school", async () => {
    const both = await createUser(admin.db, "Works At Both Schools");
    await addMembership(admin.db, schoolA.id, both.id, "teacher");
    await addMembership(admin.db, schoolB.id, both.id, "admin");
    await admin.db.insert(account).values({
      id: uniq(),
      accountId: both.id,
      providerId: "credential",
      userId: both.id,
      password: "original-hash",
    });
    const result = await resetStaffPassword(ctxA, both.id, "takeover-pass", meta);
    expect(result).toMatchObject({ ok: false });
    expect(await passwordHashOf(both.id)).toBe("original-hash");
  });

  it("refuses for someone who is not on this school's staff", async () => {
    const stranger = await createUser(admin.db, "Stranger");
    expect(await resetStaffPassword(ctxA, stranger.id, "takeover-pass", meta)).toMatchObject({
      ok: false,
    });
  });
});

describe("app_user_in_other_school", () => {
  it("answers only for people on the current school's staff", async () => {
    const stranger = await createUser(admin.db, "Unrelated Person");
    await addMembership(admin.db, schoolB.id, stranger.id, "teacher");
    const answer = await withDbContext({ userId: headA.id, schoolId: schoolA.id }, (tx) =>
      tx.execute<{ other: boolean | null }>(
        sql`select app_user_in_other_school(${stranger.id}) as other`,
      ),
    );
    expect(answer.rows[0]?.other).toBeNull();
  });
});
