import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

/** Reads a required test database URL and refuses anything not clearly a test database. */
export function testDatabaseUrl(name: "TEST_DATABASE_URL" | "TEST_DATABASE_ADMIN_URL"): string {
  const url = process.env[name];
  if (!url) {
    throw new Error(
      `${name} is not set. Integration tests need a test database (see .env.example).`,
    );
  }
  const database = new URL(url).pathname.replace(/^\//, "");
  if (!database.endsWith("_test")) {
    throw new Error(
      `${name} points at "${database}". Test databases must end in "_test" because they are wiped.`,
    );
  }
  return url;
}

/** Owner connection: bypasses row-level security. Used only to arrange and inspect test data. */
export function createAdminDb() {
  const pool = new Pool({ connectionString: testDatabaseUrl("TEST_DATABASE_ADMIN_URL"), max: 2 });
  return { db: drizzle(pool, { schema }), pool };
}
