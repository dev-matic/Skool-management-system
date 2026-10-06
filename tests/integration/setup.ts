import { afterAll } from "vitest";
import { testDatabaseUrl } from "./test-db";

// Server code reads these through src/env.ts.
process.env.DATABASE_URL = testDatabaseUrl("TEST_DATABASE_URL");
process.env.BETTER_AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters-long";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

afterAll(async () => {
  const { getPool } = await import("@/db/client");
  await getPool().end();
});
