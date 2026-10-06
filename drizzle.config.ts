import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  // Migrations run as the database owner, not as the restricted app role.
  dbCredentials: {
    url: process.env.DATABASE_ADMIN_URL ?? "",
  },
  strict: true,
  verbose: true,
});
