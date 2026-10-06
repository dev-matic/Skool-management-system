import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/**
 * Phone numbers are stored in E.164 form, e.g. "+233241234567".
 *
 * Users may type Ghanaian numbers any common way: "024 123 4567",
 * "0241234567", "233241234567", "+233 24 123 4567", "00233241234567".
 * Numbers without a country code are treated as Ghanaian. Foreign numbers
 * (e.g. a parent abroad) are accepted when typed with their "+" country code.
 */
export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

const ALLOWED_CHARACTERS = /^[\d\s()+\-.]+$/;

export function normalisePhone(input: string): PhoneResult {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter a phone number." };
  }
  if (!ALLOWED_CHARACTERS.test(trimmed)) {
    return { ok: false, error: "A phone number can only contain digits, spaces and +." };
  }
  // "233..." without a plus is common in Ghana; treat it as the country code.
  const digitsOnly = trimmed.replace(/\D/g, "");
  const candidate =
    !trimmed.startsWith("+") && digitsOnly.startsWith("233") && digitsOnly.length === 12
      ? `+${digitsOnly}`
      : trimmed;

  const parsed = parsePhoneNumberFromString(candidate, "GH");
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: "This is not a valid phone number (e.g. 024 123 4567)." };
  }
  return { ok: true, e164: parsed.number };
}

/** Formats a stored E.164 number for display: "024 123 4567" for Ghana, international otherwise. */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  return parsed.country === "GH" ? parsed.formatNational() : parsed.formatInternational();
}
