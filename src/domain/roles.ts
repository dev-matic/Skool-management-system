/**
 * Roles a person can hold in a school. Stored on `membership`, so one person
 * can hold several roles (e.g. teacher + admin) and different roles in
 * different schools.
 */
export const ROLES = ["admin", "bursar", "teacher", "parent", "student"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Roles that can sign in and use the app in Phase 1 (CLAUDE.md: admin, bursar
 * and teacher only). Parent and student stay in ROLES so the database is ready
 * for a later phase, but they grant no access and new memberships with them
 * are refused by the database.
 */
export const PHASE1_ROLES = ["admin", "bursar", "teacher"] as const satisfies readonly Role[];
export type Phase1Role = (typeof PHASE1_ROLES)[number];

export function isPhase1Role(role: Role): role is Phase1Role {
  return (PHASE1_ROLES as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  bursar: "Bursar",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
};

/** True when the user holds at least one of the allowed roles. */
export function hasAnyRole(userRoles: readonly Role[], allowed: readonly Role[]): boolean {
  return allowed.some((role) => userRoles.includes(role));
}

export type ActiveSchoolChoice =
  { kind: "school"; schoolId: number } | { kind: "choose" } | { kind: "none" };

/**
 * Decides which school a signed-in user is working in.
 * - The preferred school (from the user's last choice) is used only if they are still a member.
 * - With exactly one school, that one is used automatically.
 * - With several and no valid preference, the user must choose.
 */
export function resolveActiveSchool(
  memberSchoolIds: readonly number[],
  preferredSchoolId: number | null,
): ActiveSchoolChoice {
  const unique = [...new Set(memberSchoolIds)];
  if (unique.length === 0) return { kind: "none" };
  if (preferredSchoolId !== null && unique.includes(preferredSchoolId)) {
    return { kind: "school", schoolId: preferredSchoolId };
  }
  if (unique.length === 1) return { kind: "school", schoolId: unique[0]! };
  return { kind: "choose" };
}
