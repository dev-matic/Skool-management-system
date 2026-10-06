import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

// Always run on request; never cache a health check.
export const dynamic = "force-dynamic";

/** Used by uptime monitoring and deployment checks. Reports whether the database is reachable. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
