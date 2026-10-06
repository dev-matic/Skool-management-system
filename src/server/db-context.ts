import "server-only";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "@/db/client";

/** A database transaction handle, passed to services and queries. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface DbContext {
  userId: string | null;
  schoolId: number | null;
}

/**
 * Runs `fn` in a transaction with the request's user and school recorded in
 * Postgres settings. Row-level security policies read these settings, so
 * queries can only see and change rows of the current school.
 *
 * The settings are transaction-local (`set_config(..., true)`), so they can
 * never leak to another request sharing the same pooled connection.
 */
export async function withDbContext<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${ctx.userId ?? ""}, true),
                 set_config('app.school_id', ${ctx.schoolId === null ? "" : String(ctx.schoolId)}, true)`,
    );
    return fn(tx);
  });
}
