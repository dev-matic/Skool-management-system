import { z } from "zod";

/*
 * Server settings, read from environment variables on first use (lazy, so
 * `next build` needs no secrets or database).
 *
 * Locally and in CI, DATABASE_URL already uses the restricted "skool_app"
 * role. On Vercel with the Neon integration, DATABASE_URL is the database
 * owner, so APP_DB_PASSWORD is set as well and the app connects as
 * skool_app with that password instead (see docs/deploying.md). The app
 * never runs as the owner: the owner is not bound by row-level security.
 */

export const APP_DB_ROLE = "skool_app";

type Env = Record<string, string | undefined>;

const postgresUrl = z
  .string()
  .min(1)
  .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
    message: "must be a postgres:// connection string",
  });

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  // Secret used to sign session cookies. Generate with: openssl rand -base64 32
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export interface ServerEnv {
  /** Connection for the running app, always as the restricted role. */
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  /** Public base URL of the app, e.g. https://school.example.com */
  BETTER_AUTH_URL: string;
  /** Other addresses this deployment answers on (Vercel preview links). */
  trustedOrigins: string[];
  NODE_ENV: "development" | "test" | "production";
}

/** A missing or wrong setting. Messages name the setting, never its value. */
export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid environment configuration:\n  ${problems.join("\n  ")}`);
    this.name = "ConfigError";
  }
}

const https = (host: string | undefined) => (host ? `https://${host}` : undefined);

/** The connection string the app uses: DATABASE_URL, as skool_app when APP_DB_PASSWORD is set. */
export function appDatabaseUrl(env: Env): string | undefined {
  const url = env.DATABASE_URL;
  if (!url || !env.APP_DB_PASSWORD) return url;
  try {
    const parsed = new URL(url);
    parsed.username = APP_DB_ROLE;
    parsed.password = env.APP_DB_PASSWORD;
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Owner connection for migrations and the demo seed, when one is configured. */
export function adminDatabaseUrl(env: Env): string | undefined {
  return (
    env.DATABASE_ADMIN_URL ??
    env.DATABASE_URL_UNPOOLED ??
    (env.APP_DB_PASSWORD ? env.DATABASE_URL : undefined)
  );
}

/** BETTER_AUTH_URL, or on Vercel the project's production address. */
export function publicBaseUrl(env: Env): string | undefined {
  return env.BETTER_AUTH_URL ?? https(env.VERCEL_PROJECT_PRODUCTION_URL) ?? https(env.VERCEL_URL);
}

/** Vercel's own addresses for this deployment, so sign-in works on preview links. */
export function vercelOrigins(env: Env): string[] {
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL].flatMap(
    (host) => (host ? [`https://${host}`] : []),
  );
}

/** Checks the settings; throws ConfigError naming every problem. */
export function readServerEnv(env: Env): ServerEnv {
  const problems: string[] = [];
  const result = serverEnvSchema.safeParse({ ...env, DATABASE_URL: appDatabaseUrl(env) });
  if (!result.success) {
    problems.push(
      ...result.error.issues.map((i) => {
        const name = i.path.join(".");
        return env[name] ? `${name}: ${i.message}` : `${name}: missing`;
      }),
    );
  }
  const baseUrl = publicBaseUrl(env);
  if (!baseUrl || !z.url().safeParse(baseUrl).success) {
    problems.push(
      baseUrl
        ? "BETTER_AUTH_URL: must be the site's address, e.g. https://school.example.com"
        : "BETTER_AUTH_URL: missing (the site's address, e.g. https://school.example.com)",
    );
  }
  if (result.success) {
    let role: string | null = null;
    try {
      role = decodeURIComponent(new URL(result.data.DATABASE_URL).username);
    } catch {
      problems.push("DATABASE_URL: must be a valid connection string");
    }
    if (role !== null && role !== APP_DB_ROLE) {
      problems.push(
        `DATABASE_URL: the app must connect as "${APP_DB_ROLE}", not "${role}". Set APP_DB_PASSWORD (see docs/deploying.md).`,
      );
    }
  }
  if (problems.length > 0 || !result.success) throw new ConfigError(problems);
  return {
    DATABASE_URL: result.data.DATABASE_URL,
    BETTER_AUTH_SECRET: result.data.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: baseUrl!,
    trustedOrigins: vercelOrigins(env),
    NODE_ENV: result.data.NODE_ENV,
  };
}

/** Names of settings that are missing or wrong, for the "not set up yet" page. */
export function configProblems(env: Env = process.env): string[] {
  try {
    readServerEnv(env);
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
}

let cached: ServerEnv | undefined;

/** Reads and validates server settings on first use. */
export function serverEnv(): ServerEnv {
  cached ??= readServerEnv(process.env);
  return cached;
}
