/**
 * Creates FAKE demo data in the database at DATABASE_ADMIN_URL:
 *
 *   pnpm db:seed
 *
 * Refuses to run in production unless DEMO_SEED=1 (hosted demo sites).
 */
import { DEMO_PASSWORD, DEMO_USERS, seedDemoData } from "./demo-data";

async function main() {
  // Hosted demo sites opt in with DEMO_SEED=1 (see docs/deploying.md).
  if (process.env.NODE_ENV === "production" && process.env.DEMO_SEED !== "1") {
    throw new Error("Refusing to seed demo data in production.");
  }
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL is not set (see .env.example).");
  await seedDemoData(url, process.env.SEED_PASSWORD || DEMO_PASSWORD);
  console.log(
    "Demo data ready. Sign in with any of these (password: %s):",
    process.env.SEED_PASSWORD ? "(your SEED_PASSWORD)" : DEMO_PASSWORD,
  );
  for (const u of DEMO_USERS) {
    const roles = u.memberships.map((m) => `${m.role}@${m.school}`).join(", ");
    console.log(`  ${(u.phone ?? u.email)!.padEnd(26)} ${u.name.padEnd(16)} ${roles}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
