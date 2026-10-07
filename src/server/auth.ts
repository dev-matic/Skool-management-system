import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { serverEnv } from "@/env";
import { recordAudit } from "./audit";
import { withDbContext } from "./db-context";

const TWELVE_HOURS = 60 * 60 * 12;

function createAuth() {
  const env = serverEnv();
  return betterAuth({
    appName: "School Management System",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // Vercel preview links of this deployment may sign in too.
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      // Accounts are created by school administrators, never by public sign-up.
      disableSignUp: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        phoneNumber: { type: "string", required: false, input: false },
        isActive: { type: "boolean", required: false, input: false, defaultValue: true },
      },
    },
    session: {
      // School computers are often shared: sessions end after 12 hours.
      expiresIn: TWELVE_HOURS,
      updateAge: 60 * 60,
    },
    telemetry: { enabled: false },
    databaseHooks: {
      session: {
        create: {
          after: async (created) => {
            await withDbContext({ userId: created.userId, schoolId: null }, (tx) =>
              recordAudit(tx, {
                schoolId: null,
                actorId: created.userId,
                action: "login",
                entityType: "user",
                entityId: created.userId,
                ipAddress: created.ipAddress ?? null,
                userAgent: created.userAgent ?? null,
              }),
            );
          },
        },
      },
    },
    // Lets server actions set the session cookie.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/** The auth instance, created on first use so builds don't need secrets. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
