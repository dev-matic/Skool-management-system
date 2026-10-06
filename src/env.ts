import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1)
  .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
    message: "must be a postgres:// connection string",
  });

const serverEnvSchema = z.object({
  // Restricted app role (row-level security applies). Used by the running app.
  DATABASE_URL: postgresUrl,
  // Secret used to sign session cookies. Generate with: openssl rand -base64 32
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  // Public base URL of the app, e.g. https://school.example.com
  BETTER_AUTH_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Reads and validates server environment variables on first use.
 * Lazy so that `next build` does not need secrets or a database.
 */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid environment configuration:\n  ${problems.join("\n  ")}`);
    }
    cached = result.data;
  }
  return cached;
}
