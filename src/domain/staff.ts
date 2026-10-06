import { normalisePhone } from "./phone";
import { isPhase1Role, type Phase1Role, type Role } from "./roles";

/*
 * Checks for staff details typed by a school admin (M2 staff screen).
 * Errors are keyed by form field and written for the person typing.
 */

export const MIN_PASSWORD_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export interface NewStaff {
  name: string;
  phone: string; // E.164
  email: string | null;
  roles: Phase1Role[];
  password: string;
}

export function parseRoles(values: readonly string[]): Phase1Role[] {
  return [...new Set(values)].filter((v): v is Phase1Role => isPhase1Role(v as Role));
}

export function checkPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) return "Use at most 128 characters.";
  return null;
}

export function parseNewStaff(input: {
  name: string;
  phone: string;
  email: string;
  roles: readonly string[];
  password: string;
}): Parsed<NewStaff> {
  const errors: FieldErrors = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Enter the person's full name.";
  else if (name.length > 100) errors.name = "Use at most 100 characters.";

  const phone = normalisePhone(input.phone);
  if (!phone.ok) errors.phone = phone.error;

  const email = input.email.trim().toLowerCase();
  if (email && !EMAIL.test(email)) errors.email = "Enter a valid email address, or leave it empty.";

  const roles = parseRoles(input.roles);
  if (roles.length === 0) errors.roles = "Choose at least one role.";

  const passwordError = checkPassword(input.password);
  if (passwordError) errors.password = passwordError;

  if (Object.keys(errors).length > 0 || !phone.ok) return { ok: false, errors };
  return {
    ok: true,
    value: { name, phone: phone.e164, email: email || null, roles, password: input.password },
  };
}

/**
 * Whether removing admin rights from some people would leave the school
 * with no active admin. `adminIds` are the current active admins.
 */
export function wouldLeaveNoAdmin(adminIds: readonly string[], losingAdmin: string): boolean {
  return adminIds.includes(losingAdmin) && adminIds.filter((id) => id !== losingAdmin).length === 0;
}
