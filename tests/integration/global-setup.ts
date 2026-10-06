import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createAdminDb } from "./test-db";

/** Wipes the test database and applies all migrations once per test run. */
export default async function setup() {
  const { db, pool } = createAdminDb();
  try {
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.query("DROP SCHEMA public CASCADE");
    await pool.query("CREATE SCHEMA public");
    await migrate(db, { migrationsFolder: "src/db/migrations" });
  } finally {
    await pool.end();
  }
}
