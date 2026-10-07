import { describe, expect, it } from "vitest";
import {
  ConfigError,
  adminDatabaseUrl,
  appDatabaseUrl,
  configProblems,
  publicBaseUrl,
  readServerEnv,
} from "./env";

const SECRET = "x".repeat(40);
const LOCAL = {
  DATABASE_URL: "postgres://skool_app:pw@localhost:5432/skool_dev",
  BETTER_AUTH_SECRET: SECRET,
  BETTER_AUTH_URL: "http://localhost:3000",
};
// Shaped like the Neon integration's settings (fake values).
const NEON = {
  DATABASE_URL: "postgresql://neondb_owner:ownerpw@ep-x-pooler.example.test/neondb?sslmode=require",
  DATABASE_URL_UNPOOLED:
    "postgresql://neondb_owner:ownerpw@ep-x.example.test/neondb?sslmode=require",
  APP_DB_PASSWORD: "app p@ss/word",
  BETTER_AUTH_SECRET: SECRET,
  VERCEL_PROJECT_PRODUCTION_URL: "school.example.test",
  VERCEL_URL: "school-abc123.example.test",
  VERCEL_BRANCH_URL: "school-git-branch.example.test",
};

describe("server settings", () => {
  it("uses DATABASE_URL as is when it is already the app role", () => {
    const env = readServerEnv(LOCAL);
    expect(env.DATABASE_URL).toBe(LOCAL.DATABASE_URL);
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("on Neon, connects as skool_app with APP_DB_PASSWORD and keeps the owner for setup", () => {
    const url = new URL(appDatabaseUrl(NEON)!);
    expect(url.username).toBe("skool_app");
    expect(decodeURIComponent(url.password)).toBe("app p@ss/word");
    expect(url.host).toBe("ep-x-pooler.example.test");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(adminDatabaseUrl(NEON)).toBe(NEON.DATABASE_URL_UNPOOLED);
    expect(adminDatabaseUrl(LOCAL)).toBeUndefined();
  });

  it("finds the site address and preview links on Vercel", () => {
    const env = readServerEnv(NEON);
    expect(env.BETTER_AUTH_URL).toBe("https://school.example.test");
    expect(env.trustedOrigins).toEqual([
      "https://school-abc123.example.test",
      "https://school-git-branch.example.test",
      "https://school.example.test",
    ]);
    expect(publicBaseUrl({ ...NEON, BETTER_AUTH_URL: "https://custom.example.test" })).toBe(
      "https://custom.example.test",
    );
  });

  it("refuses to run as the database owner", () => {
    const withoutPassword = { ...NEON, APP_DB_PASSWORD: undefined };
    expect(() => readServerEnv(withoutPassword)).toThrow(ConfigError);
    expect(configProblems(withoutPassword)).toEqual([
      expect.stringContaining('must connect as "skool_app", not "neondb_owner"'),
    ]);
  });

  it("lists every missing setting by name, without values", () => {
    const problems = configProblems({});
    expect(problems.map((p) => p.split(":")[0])).toEqual([
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
    ]);
    expect(problems[0]).toBe("DATABASE_URL: missing");
    expect(configProblems(LOCAL)).toEqual([]);
  });
});
