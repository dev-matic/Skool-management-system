import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { membership } from "@/db/schema";
import { withDbContext } from "@/server/db-context";
import { addMembership, createSchool, createUser, expectDbError } from "./fixtures";
import { createAdminDb } from "./test-db";

/*
 * Phase 1 has admin, bursar and teacher accounts only (CLAUDE.md). The
 * database refuses parent and student memberships, whoever asks.
 */

const admin = createAdminDb();
let schoolA: { id: number };
let adminA: { id: string };
let someone: { id: string };

beforeAll(async () => {
  schoolA = await createSchool(admin.db, "Phase One School");
  adminA = await createUser(admin.db, "Phase One Admin");
  someone = await createUser(admin.db, "Would-be Parent");
  await addMembership(admin.db, schoolA.id, adminA.id, "admin");
});

afterAll(() => admin.pool.end());

describe("Phase 1 roles", () => {
  it.each(["parent", "student"] as const)(
    "refuses a %s membership even from the database owner",
    async (role) => {
      await expectDbError(
        addMembership(admin.db, schoolA.id, someone.id, role),
        /membership_phase1_role/,
      );
    },
  );

  it("refuses a parent membership created by a school admin through the app", async () => {
    await expectDbError(
      withDbContext({ userId: adminA.id, schoolId: schoolA.id }, (tx) =>
        tx.insert(membership).values({ schoolId: schoolA.id, userId: someone.id, role: "parent" }),
      ),
      /membership_phase1_role/,
    );
  });

  it("still allows admin, bursar and teacher memberships", async () => {
    const rows = await Promise.all(
      (["bursar", "teacher"] as const).map((role) =>
        addMembership(admin.db, schoolA.id, someone.id, role),
      ),
    );
    expect(rows.map((r) => r.role)).toEqual(["bursar", "teacher"]);
  });
});
