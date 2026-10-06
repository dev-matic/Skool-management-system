/**
 * Builds the `changes` stored in the audit log: for each field that changed,
 * `[oldValue, newValue]`. Sensitive fields are recorded as changed without
 * storing their contents.
 */
export type AuditChanges = Record<string, [unknown, unknown]>;

export const REDACTED = "[redacted]";

const ALWAYS_IGNORED = ["createdAt", "updatedAt"];

type Row = Record<string, unknown>;

export interface DiffOptions {
  /** Fields whose values must never be written to the audit log (e.g. medical notes). */
  redact?: readonly string[];
  /** Extra fields to leave out entirely. */
  ignore?: readonly string[];
}

function normalise(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  // Decimal (money/scores) and similar value objects serialise to strings.
  if (value !== null && typeof value === "object" && "toFixed" in value) return String(value);
  return value;
}

/** Compares two versions of a record. Pass `null` for `before` on create and `after` on delete. */
export function diffChanges(
  before: Row | null,
  after: Row | null,
  options: DiffOptions = {},
): AuditChanges {
  const redact = new Set(options.redact ?? []);
  const ignore = new Set([...ALWAYS_IGNORED, ...(options.ignore ?? [])]);
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: AuditChanges = {};

  for (const field of [...fields].sort()) {
    if (ignore.has(field)) continue;
    const oldValue = normalise(before?.[field]);
    const newValue = normalise(after?.[field]);
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    changes[field] = redact.has(field)
      ? [oldValue === null ? null : REDACTED, newValue === null ? null : REDACTED]
      : [oldValue, newValue];
  }
  return changes;
}
