import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { membership, school } from "@/db/schema";
import { hasAnyRole, resolveActiveSchool, type Role } from "@/domain/roles";
import { getAuth } from "./auth";
import { withDbContext, type Tx } from "./db-context";

/** Cookie remembering which school the user last chose. Always re-checked against memberships. */
export const ACTIVE_SCHOOL_COOKIE = "skool_school";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
}

export interface TenantContext {
  userId: string;
  userName: string;
  schoolId: number;
  schoolName: string;
  roles: Role[];
  /** True when the user belongs to more than one school (shows the school switcher). */
  hasOtherSchools: boolean;
}

export interface MySchool {
  schoolId: number;
  schoolName: string;
  roles: Role[];
}

/** The signed-in user, or null. Deactivated users are treated as signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const result = await getAuth().api.getSession({ headers: await headers() });
  if (!result || result.user.isActive === false) return null;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    phoneNumber: result.user.phoneNumber ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

/** All active schools the user belongs to, with their roles in each. */
export const listMySchools = cache(async (userId: string): Promise<MySchool[]> => {
  const rows = await withDbContext({ userId, schoolId: null }, (tx: Tx) =>
    tx
      .select({ schoolId: school.id, schoolName: school.name, role: membership.role })
      .from(membership)
      .innerJoin(school, eq(school.id, membership.schoolId))
      .where(
        and(
          eq(membership.userId, userId),
          eq(membership.isActive, true),
          eq(school.isActive, true),
        ),
      )
      .orderBy(school.name),
  );
  const bySchool = new Map<number, MySchool>();
  for (const row of rows) {
    const entry = bySchool.get(row.schoolId) ?? {
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      roles: [],
    };
    entry.roles.push(row.role);
    bySchool.set(row.schoolId, entry);
  }
  return [...bySchool.values()];
});

/**
 * The signed-in user and the school they are working in. Redirects to sign-in,
 * school selection, or the no-access page when needed. Call at the top of every
 * protected page and server action, then pass the result to `withTenant`.
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const current = await requireUser();
  const schools = await listMySchools(current.id);
  const cookieValue = (await cookies()).get(ACTIVE_SCHOOL_COOKIE)?.value;
  const preferred = cookieValue && /^\d+$/.test(cookieValue) ? Number(cookieValue) : null;
  const choice = resolveActiveSchool(
    schools.map((s) => s.schoolId),
    preferred,
  );

  if (choice.kind === "none") redirect("/no-access");
  if (choice.kind === "choose") redirect("/select-school");

  const active = schools.find((s) => s.schoolId === choice.schoolId)!;
  return {
    userId: current.id,
    userName: current.name,
    schoolId: active.schoolId,
    schoolName: active.schoolName,
    roles: active.roles,
    hasOtherSchools: schools.length > 1,
  };
});

/** Like getTenantContext, but only for users holding one of the given roles. */
export async function requireRole(...allowed: Role[]): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!hasAnyRole(ctx.roles, allowed)) redirect("/forbidden");
  return ctx;
}

/** Runs database work scoped to the context's school (enforced by row-level security). */
export function withTenant<T>(ctx: TenantContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withDbContext({ userId: ctx.userId, schoolId: ctx.schoolId }, fn);
}
