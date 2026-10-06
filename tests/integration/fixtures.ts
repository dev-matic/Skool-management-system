import { randomUUID } from "node:crypto";
import { membership, school, user } from "@/db/schema";
import type { Role } from "@/domain/roles";
import type { createAdminDb } from "./test-db";

type AdminDb = ReturnType<typeof createAdminDb>["db"];

/** Unique suffix so test files never collide with each other's data. */
export function uniq(): string {
  return randomUUID().slice(0, 8);
}

export async function createSchool(db: AdminDb, name: string) {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${uniq()}`;
  const [row] = await db.insert(school).values({ name, slug }).returning();
  return row!;
}

export async function createUser(db: AdminDb, name: string) {
  const id = randomUUID();
  const [row] = await db
    .insert(user)
    .values({ id, name, email: `${id}@example.test` })
    .returning();
  return row!;
}

export async function addMembership(db: AdminDb, schoolId: number, userId: string, role: Role) {
  const [row] = await db.insert(membership).values({ schoolId, userId, role }).returning();
  return row!;
}

/**
 * Expects a database call to fail with a Postgres error matching `pattern`.
 * Drizzle wraps Postgres errors as "Failed query: ..." with the real reason in `cause`.
 */
export async function expectDbError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const messages: string[] = [];
    let current: unknown = error;
    while (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
    }
    if (messages.some((m) => pattern.test(m))) return;
    throw new Error(
      `Expected a database error matching ${pattern}, got:\n  ${messages.join("\n  ")}`,
    );
  }
  throw new Error(`Expected a database error matching ${pattern}, but the call succeeded.`);
}
