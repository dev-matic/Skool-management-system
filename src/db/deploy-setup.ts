/**
 * Runs before `next build` on Vercel (the "vercel-build" script):
 *
 * 1. Applies database migrations, as the database owner.
 * 2. With APP_DB_PASSWORD set, lets the restricted "skool_app" role sign in
 *    with that password (the running app always connects as skool_app).
 * 3. With DEMO_SEED=1, adds the FAKE demo school; SEED_PASSWORD (8+
 *    characters) becomes the demo accounts' password, so a public site never
 *    uses the password written in the code.
 *
 * Without an owner connection it does nothing, so builds without a database
 * still work. See docs/deploying.md.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { APP_DB_ROLE, adminDatabaseUrl } from "../env";
import { seedDemoData } from "./demo-data";

async function main() {
  const env = process.env;
  const url = adminDatabaseUrl(env);
  if (!url) {
    console.log("Database setup skipped: no DATABASE_ADMIN_URL or DATABASE_URL_UNPOOLED.");
    return;
  }
  if (env.DEMO_SEED === "1" && (env.SEED_PASSWORD ?? "").length < 8) {
    throw new Error(
      "DEMO_SEED=1 needs SEED_PASSWORD (at least 8 characters) for the demo accounts.",
    );
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    console.log("Applying database migrations…");
    await migrate(drizzle(pool), { migrationsFolder: "src/db/migrations" });

    if (env.APP_DB_PASSWORD) {
      const client = await pool.connect();
      try {
        // Role names and passwords cannot be query parameters; escape instead.
        await client.query(
          `ALTER ROLE ${client.escapeIdentifier(APP_DB_ROLE)} WITH LOGIN PASSWORD ${client.escapeLiteral(env.APP_DB_PASSWORD)}`,
        );
      } finally {
        client.release();
      }
      console.log(`The app will connect as ${APP_DB_ROLE}.`);
    }
  } finally {
    await pool.end();
  }

  if (env.DEMO_SEED === "1") {
    console.log("Adding the FAKE demo school…");
    await seedDemoData(url, env.SEED_PASSWORD);
  }
  console.log("Database setup done.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
