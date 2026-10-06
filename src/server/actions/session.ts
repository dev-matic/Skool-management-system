"use server";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { user } from "@/db/schema";
import { parseLoginIdentifier, placeholderEmailForPhone } from "@/domain/login";
import { FailureLimiter } from "@/domain/rate-limit";
import { recordAudit, requestMeta } from "../audit";
import { getAuth } from "../auth";
import { withDbContext } from "../db-context";
import { ACTIVE_SCHOOL_COOKIE, getCurrentUser, listMySchools, requireUser } from "../tenant";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
// Per account: stops guessing one person's password. Per IP: stops spraying many accounts.
const failuresByAccount = new FailureLimiter(5, FIFTEEN_MINUTES);
const failuresByIp = new FailureLimiter(30, FIFTEEN_MINUTES);

export interface SignInState {
  error?: string;
  /** Echoed back so the user doesn't have to retype it. */
  identifier?: string;
}

const WRONG_CREDENTIALS = "Incorrect phone number/email or password.";

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const identifier = String(formData.get("identifier") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "");

  if (!identifier.trim() || !password) {
    return { error: "Enter your phone number or email, and your password.", identifier };
  }
  const parsed = parseLoginIdentifier(identifier);
  if (parsed.kind === "invalid") {
    return {
      error: "Enter a valid phone number (e.g. 024 123 4567) or email address.",
      identifier,
    };
  }

  const accountKey = parsed.kind === "email" ? parsed.email : parsed.e164;
  const ipKey = (await requestMeta()).ipAddress ?? "unknown";
  const waitMs = Math.max(
    failuresByAccount.retryAfterMs(accountKey),
    failuresByIp.retryAfterMs(ipKey),
  );
  if (waitMs > 0) {
    const minutes = Math.ceil(waitMs / 60_000);
    return {
      error: `Too many failed attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
      identifier,
    };
  }

  const found = await withDbContext({ userId: null, schoolId: null }, (tx) =>
    tx
      .select({ email: user.email, isActive: user.isActive })
      .from(user)
      .where(
        parsed.kind === "email" ? eq(user.email, parsed.email) : eq(user.phoneNumber, parsed.e164),
      )
      .limit(1),
  ).then((rows) => rows[0]);

  const recordFailure = () => {
    failuresByAccount.recordFailure(accountKey);
    failuresByIp.recordFailure(ipKey);
  };

  if (found && !found.isActive) {
    recordFailure();
    return { error: WRONG_CREDENTIALS, identifier };
  }

  // Unknown accounts still go through the normal check, so the response
  // doesn't reveal whether an account exists.
  const email =
    found?.email ??
    (parsed.kind === "email" ? parsed.email : placeholderEmailForPhone(parsed.e164));

  try {
    await getAuth().api.signInEmail({
      body: { email, password, rememberMe: false },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      recordFailure();
      return { error: WRONG_CREDENTIALS, identifier };
    }
    throw error;
  }

  failuresByAccount.reset(accountKey);
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const current = await getCurrentUser();
  if (current) {
    const meta = await requestMeta();
    await withDbContext({ userId: current.id, schoolId: null }, (tx) =>
      recordAudit(tx, {
        schoolId: null,
        actorId: current.id,
        action: "logout",
        entityType: "user",
        entityId: current.id,
        ...meta,
      }),
    );
    await getAuth().api.signOut({ headers: await headers() });
  }
  (await cookies()).delete(ACTIVE_SCHOOL_COOKIE);
  redirect("/login");
}

export async function chooseSchool(formData: FormData): Promise<void> {
  const current = await requireUser();
  const schoolId = Number(formData.get("schoolId"));
  const schools = await listMySchools(current.id);
  // Only schools the user actually belongs to can be chosen.
  if (!schools.some((s) => s.schoolId === schoolId)) redirect("/select-school");

  (await cookies()).set(ACTIVE_SCHOOL_COOKIE, String(schoolId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
