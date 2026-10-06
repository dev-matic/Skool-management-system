import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLog } from "@/db/schema";
import { recordAudit } from "@/server/audit";
import { withDbContext } from "@/server/db-context";
import { addMembership, createSchool, createUser, expectDbError } from "./fixtures";
import { createAdminDb } from "./test-db";

const admin = createAdminDb();
let schoolA: { id: number };
let schoolB: { id: number };
let actor: { id: string };

beforeAll(async () => {
  schoolA = await createSchool(admin.db, "Audit School A");
  schoolB = await createSchool(admin.db, "Audit School B");
  actor = await createUser(admin.db, "Auditor");
  await addMembership(admin.db, schoolA.id, actor.id, "admin");
});

afterAll(() => admin.pool.end());

const ctxA = () => ({ userId: actor.id, schoolId: schoolA.id });

describe("recordAudit", () => {
  it("stores who changed what, in the current school", async () => {
    await withDbContext(ctxA(), (tx) =>
      recordAudit(tx, {
        schoolId: schoolA.id,
        actorId: actor.id,
        action: "update",
        entityType: "student",
        entityId: 42,
        changes: { status: ["active", "withdrawn"] },
        ipAddress: "41.66.0.1",
      }),
    );
    const rows = await withDbContext(ctxA(), (tx) =>
      tx.select().from(auditLog).where(eq(auditLog.entityType, "student")),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      schoolId: schoolA.id,
      actorId: actor.id,
      action: "update",
      entityId: "42",
      changes: { status: ["active", "withdrawn"] },
      ipAddress: "41.66.0.1",
    });
  });

  it("is rolled back together with a failed change", async () => {
    await expect(
      withDbContext(ctxA(), async (tx) => {
        await recordAudit(tx, {
          schoolId: schoolA.id,
          actorId: actor.id,
          action: "create",
          entityType: "rolled-back",
        });
        throw new Error("the change failed");
      }),
    ).rejects.toThrow("the change failed");
    const rows = await admin.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityType, "rolled-back"));
    expect(rows).toEqual([]);
  });

  it("accepts sign-in events not tied to a school, which schools cannot read back", async () => {
    await withDbContext({ userId: actor.id, schoolId: null }, (tx) =>
      recordAudit(tx, {
        schoolId: null,
        actorId: actor.id,
        action: "login",
        entityType: "user",
        entityId: actor.id,
      }),
    );
    const visible = await withDbContext(ctxA(), (tx) =>
      tx.select().from(auditLog).where(eq(auditLog.action, "login")),
    );
    expect(visible).toEqual([]);
  });

  it("cannot write entries for another school", async () => {
    await expectDbError(
      withDbContext(ctxA(), (tx) =>
        recordAudit(tx, {
          schoolId: schoolB.id,
          actorId: actor.id,
          action: "create",
          entityType: "x",
        }),
      ),
      /row-level security/,
    );
  });
});

describe("audit log is append-only", () => {
  it("the app cannot edit entries", async () => {
    await expectDbError(
      withDbContext(ctxA(), (tx) => tx.update(auditLog).set({ action: "delete" })),
      /permission denied/,
    );
  });

  it("the app cannot delete entries", async () => {
    await expectDbError(
      withDbContext(ctxA(), (tx) => tx.delete(auditLog)),
      /permission denied/,
    );
  });

  it("even the database owner cannot edit, delete or truncate entries", async () => {
    await expectDbError(admin.db.update(auditLog).set({ action: "delete" }), /append-only/);
    await expectDbError(admin.db.delete(auditLog), /append-only/);
    await expectDbError(admin.pool.query("TRUNCATE audit_log"), /append-only/);
  });
});
