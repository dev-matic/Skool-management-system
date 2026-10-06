import { normalisePhone } from "./phone";

export type LoginIdentifier =
  { kind: "email"; email: string } | { kind: "phone"; e164: string } | { kind: "invalid" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Users sign in with either their email address or their phone number. */
export function parseLoginIdentifier(raw: string): LoginIdentifier {
  const value = raw.trim();
  if (value.includes("@")) {
    return EMAIL_PATTERN.test(value)
      ? { kind: "email", email: value.toLowerCase() }
      : { kind: "invalid" };
  }
  const phone = normalisePhone(value);
  return phone.ok ? { kind: "phone", e164: phone.e164 } : { kind: "invalid" };
}

/**
 * Users who sign in by phone may have no email address, but the auth library
 * requires one. They get a placeholder on the reserved ".invalid" domain,
 * which can never receive mail and is never shown in the interface.
 */
export function placeholderEmailForPhone(e164: string): string {
  return `${e164.replace("+", "")}@phone.invalid`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith("@phone.invalid");
}
