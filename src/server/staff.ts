import "server-only";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { account, membership, session, user } from "@/db/schema";
import { placeholderEmailForPhone } from "@/domain/login";
import { PHASE1_ROLES, type Phase1Role } from "@/domain/roles";
import { wouldLeaveNoAdmin, type NewStaff } from "@/domain/staff";
import { recordAudit } from "./audit";
import type { Tx } from "./db-context";
import { withTenant, type TenantContext } from "./tenant";

/*
 * Staff accounts for the current school (M2). Only admins call these; the
 * server actions check the role first. People have one login across all
 * schools; their access to this school is their membership rows here.
 */

export interface StaffMember {
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  roles: Phase1Role[];
  active: boolean;
}

export type StaffResult =
  { ok: true; message: string; userId?: string } | { ok: false; error: string; field?: string };

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

async function membershipsInSchool(tx: Tx, schoolId: number) {
  return tx
    .select({
      userId: membership.userId,
      role: membership.role,
      isActive: membership.isActive,
      name: user.name,
      phone: user.phoneNumber,
      email: user.email,
    })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(and(eq(membership.schoolId, schoolId), inArray(membership.role, [...PHASE1_ROLES])));
}

function activeAdminIds(rows: Awaited<ReturnType<typeof membershipsInSchool>>): string[] {
  return rows.filter((r) => r.role === "admin" && r.isActive).map((r) => r.userId);
}

/** Everyone with a Phase 1 role in this school, active people first, then by name. */
export async function listStaff(ctx: TenantContext): Promise<StaffMember[]> {
  const rows = await withTenant(ctx, (tx) => membershipsInSchool(tx, ctx.schoolId));
  const byUser = new Map<string, StaffMember>();
  for (const r of rows) {
    const entry = byUser.get(r.userId) ?? {
      userId: r.userId,
      name: r.name,
      phone: r.phone,
      email: r.email.endsWith("@phone.invalid") ? null : r.email,
      roles: [],
      active: false,
    };
    if (r.isActive) {
      entry.roles.push(r.role as Phase1Role);
      entry.active = true;
    }
    byUser.set(r.userId, entry);
  }
  const order = (role: Phase1Role) => PHASE1_ROLES.indexOf(role);
  return [...byUser.values()]
    .map((s) => ({ ...s, roles: s.roles.sort((a, b) => order(a) - order(b)) }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}

export async function getStaffMember(ctx: TenantContext, userId: string) {
  const staff = await listStaff(ctx);
  return staff.find((s) => s.userId === userId) ?? null;
}

/**
 * Adds a person to this school. If someone with this phone number (or
 * email) already has an account, for example at another school, they are
 * linked instead and keep their own password.
 */
export async function addStaff(
  ctx: TenantContext,
  input: NewStaff,
  meta: RequestMeta,
): Promise<StaffResult> {
  const passwordHash = await hashPassword(input.password);
  return withTenant(ctx, async (tx) => {
    const lookups = [eq(user.phoneNumber, input.phone)];
    if (input.email) lookups.push(eq(user.email, input.email));
    const matches = await tx
      .select({ id: user.id, phone: user.phoneNumber, email: user.email })
      .from(user)
      .where(or(...lookups));
    if (matches.length > 1) {
      return {
        ok: false,
        field: "email",
        error: "This phone number and email belong to two different people.",
      };
    }
    const existing = matches[0];
    if (
      existing &&
      input.email &&
      existing.email !== input.email &&
      existing.phone === input.phone
    ) {
      // Same phone, different email: keep the account's email; don't guess.
      return {
        ok: false,
        field: "email",
        error: "Someone already uses this phone number with a different email. Leave email empty.",
      };
    }

    let userId: string;
    let linked = false;
    if (existing) {
      userId = existing.id;
      linked = true;
      const current = await tx
        .select({ id: membership.id })
        .from(membership)
        .where(and(eq(membership.schoolId, ctx.schoolId), eq(membership.userId, userId)));
      if (current.length > 0) {
        return {
          ok: false,
          field: "phone",
          error: "This person is already on your staff list. Change their roles there.",
        };
      }
    } else {
      userId = randomUUID();
      await tx.insert(user).values({
        id: userId,
        name: input.name,
        email: input.email ?? placeholderEmailForPhone(input.phone),
        phoneNumber: input.phone,
      });
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
    }

    await tx.insert(membership).values(
      input.roles.map((role) => ({
        schoolId: ctx.schoolId,
        userId,
        role,
        createdBy: ctx.userId,
      })),
    );
    await recordAudit(tx, {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: "create",
      entityType: "staff_member",
      entityId: userId,
      changes: {
        roles: [null, input.roles.join(", ")],
        linkedExistingAccount: [null, linked],
      },
      ...meta,
    });
    return {
      ok: true,
      userId,
      message: linked
        ? `${input.name} already had an account, so they were added to this school. They keep their existing password.`
        : `${input.name} was added. Give them their phone number and first password to sign in.`,
    };
  });
}

/** Sets which Phase 1 roles a staff member holds in this school. */
export async function setStaffRoles(
  ctx: TenantContext,
  userId: string,
  roles: Phase1Role[],
  meta: RequestMeta,
): Promise<StaffResult> {
  if (roles.length === 0) {
    return {
      ok: false,
      field: "roles",
      error: "Choose at least one role, or deactivate this person instead.",
    };
  }
  return withTenant(ctx, async (tx) => {
    const rows = await membershipsInSchool(tx, ctx.schoolId);
    const theirs = rows.filter((r) => r.userId === userId);
    if (theirs.length === 0) return { ok: false, error: "This person is not on your staff list." };
    if (!theirs.some((r) => r.isActive)) {
      return { ok: false, error: "Reactivate this person before changing their roles." };
    }
    if (!roles.includes("admin") && wouldLeaveNoAdmin(activeAdminIds(rows), userId)) {
      return {
        ok: false,
        field: "roles",
        error: "The school must keep at least one active administrator.",
      };
    }
    if (userId === ctx.userId && !roles.includes("admin")) {
      return { ok: false, field: "roles", error: "You cannot remove your own administrator role." };
    }

    const before = theirs.filter((r) => r.isActive).map((r) => r.role as Phase1Role);
    for (const role of PHASE1_ROLES) {
      const row = theirs.find((r) => r.role === role);
      const wanted = roles.includes(role);
      if (row && row.isActive !== wanted) {
        await tx
          .update(membership)
          .set({ isActive: wanted, updatedAt: new Date() })
          .where(
            and(
              eq(membership.schoolId, ctx.schoolId),
              eq(membership.userId, userId),
              eq(membership.role, role),
            ),
          );
      } else if (!row && wanted) {
        await tx
          .insert(membership)
          .values({ schoolId: ctx.schoolId, userId, role, createdBy: ctx.userId });
      }
    }
    await recordAudit(tx, {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: "update",
      entityType: "staff_member",
      entityId: userId,
      changes: { roles: [before.join(", "), roles.join(", ")] },
      ...meta,
    });
    return { ok: true, message: "Roles saved." };
  });
}

/** Deactivates or reactivates a staff member in this school only. */
export async function setStaffActive(
  ctx: TenantContext,
  userId: string,
  active: boolean,
  meta: RequestMeta,
): Promise<StaffResult> {
  if (!active && userId === ctx.userId) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }
  return withTenant(ctx, async (tx) => {
    const rows = await membershipsInSchool(tx, ctx.schoolId);
    const theirs = rows.filter((r) => r.userId === userId);
    if (theirs.length === 0) return { ok: false, error: "This person is not on your staff list." };
    const admins = activeAdminIds(rows);
    if (!active && wouldLeaveNoAdmin(admins, userId)) {
      return { ok: false, error: "The school must keep at least one active administrator." };
    }
    await tx
      .update(membership)
      .set({ isActive: active, updatedAt: new Date() })
      .where(and(eq(membership.schoolId, ctx.schoolId), eq(membership.userId, userId)));
    await recordAudit(tx, {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: "update",
      entityType: "staff_member",
      entityId: userId,
      changes: { active: [!active, active] },
      ...meta,
    });
    return {
      ok: true,
      message: active ? "Reactivated." : "Deactivated. They can no longer sign in to this school.",
    };
  });
}

/**
 * Sets a new password and signs the person out everywhere. Only allowed for
 * people who belong to this school alone: otherwise an admin of one school
 * could take over an account that also runs another school.
 */
export async function resetStaffPassword(
  ctx: TenantContext,
  userId: string,
  password: string,
  meta: RequestMeta,
): Promise<StaffResult> {
  const passwordHash = await hashPassword(password);
  return withTenant(ctx, async (tx) => {
    const here = await tx
      .select({ id: membership.id })
      .from(membership)
      .where(and(eq(membership.schoolId, ctx.schoolId), eq(membership.userId, userId)));
    if (here.length === 0) return { ok: false, error: "This person is not on your staff list." };
    if (await belongsToOtherSchools(tx, userId)) {
      return {
        ok: false,
        error: "This person also works at another school, so only they can change their password.",
      };
    }
    await tx
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    await tx.delete(session).where(eq(session.userId, userId));
    await recordAudit(tx, {
      schoolId: ctx.schoolId,
      actorId: ctx.userId,
      action: "update",
      entityType: "staff_member",
      entityId: userId,
      changes: { password: [null, "reset by administrator"] },
      ...meta,
    });
    return { ok: true, message: "Password changed. They have been signed out everywhere." };
  });
}

/** Can this school's admin reset the person's password? */
export async function canResetPassword(ctx: TenantContext, userId: string): Promise<boolean> {
  return withTenant(ctx, async (tx) => !(await belongsToOtherSchools(tx, userId)));
}

/*
 * Row-level security hides other schools' memberships from this request,
 * so this asks the database through a narrow function that only answers
 * yes or no (see migration 0005).
 */
async function belongsToOtherSchools(tx: Tx, userId: string): Promise<boolean> {
  const result = await tx.execute<{ other: boolean | null }>(
    sql`select app_user_in_other_school(${userId}) as other`,
  );
  // NULL (not on this school's staff) is treated as "yes" so callers refuse.
  return result.rows[0]?.other !== false;
}
