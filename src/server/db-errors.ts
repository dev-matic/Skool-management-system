/** Postgres error codes we turn into plain messages. */
export const PG_UNIQUE = "23505";
export const PG_FOREIGN_KEY = "23503";

/** Postgres error code from a Drizzle error (the real error is the cause). */
export function pgCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
