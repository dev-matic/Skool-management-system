/**
 * Creates demo data for development and testing: two schools and one user per
 * role. Safe to run repeatedly (existing rows are left alone).
 *
 *   pnpm db:seed
 *
 * Runs as the database owner (DATABASE_ADMIN_URL). Refuses to run in production.
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { placeholderEmailForPhone } from "../domain/login";
import type { Role } from "../domain/roles";
import * as schema from "./schema";

const { account, membership, school, user } = schema;

export const DEMO_PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

const SCHOOLS = [
  { slug: "demo-basic", name: "Demo Basic School", shortCode: "DBS", phone: "+233302000001" },
  { slug: "second-demo", name: "Second Demo School", shortCode: "SDS", phone: "+233302000002" },
] as const;

type SchoolSlug = (typeof SCHOOLS)[number]["slug"];

interface DemoUser {
  name: string;
  phone: string | null;
  email: string | null;
  memberships: { school: SchoolSlug; role: Role }[];
}

export const DEMO_USERS: DemoUser[] = [
  {
    name: "Akosua Mensah",
    phone: "+233241000001",
    email: "admin@demo-school.test",
    memberships: [{ school: "demo-basic", role: "admin" }],
  },
  {
    name: "Kojo Asante",
    phone: "+233241000002",
    email: null, // phone-only account
    memberships: [{ school: "demo-basic", role: "bursar" }],
  },
  {
    name: "Efua Owusu",
    phone: "+233241000003",
    email: "teacher@demo-school.test",
    memberships: [{ school: "demo-basic", role: "teacher" }],
  },
  {
    name: "Yaw Boateng",
    phone: "+233241000004",
    email: null,
    memberships: [{ school: "demo-basic", role: "parent" }],
  },
  {
    name: "Abena Boateng",
    phone: null,
    email: "student@demo-school.test",
    memberships: [{ school: "demo-basic", role: "student" }],
  },
  {
    name: "Kwame Darko",
    phone: "+233241000006",
    email: "head@demo-school.test",
    memberships: [
      { school: "demo-basic", role: "admin" },
      { school: "demo-basic", role: "teacher" },
      { school: "second-demo", role: "admin" },
    ],
  },
  {
    name: "Esi Quaye",
    phone: "+233241000007",
    email: "admin@second-demo.test",
    memberships: [{ school: "second-demo", role: "admin" }],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data in production.");
  }
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL is not set (see .env.example).");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  try {
    await db.transaction(async (tx) => {
      const schoolIds = new Map<SchoolSlug, number>();
      for (const s of SCHOOLS) {
        await tx.insert(school).values(s).onConflictDoNothing({ target: school.slug });
        const [row] = await tx
          .select({ id: school.id })
          .from(school)
          .where(eq(school.slug, s.slug));
        schoolIds.set(s.slug, row!.id);
      }

      for (const u of DEMO_USERS) {
        const email = u.email ?? placeholderEmailForPhone(u.phone!);
        let [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
        if (!existing) {
          const id = randomUUID();
          await tx.insert(user).values({ id, name: u.name, email, phoneNumber: u.phone });
          await tx.insert(account).values({
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            userId: id,
            password: passwordHash,
          });
          existing = { id };
        }
        for (const m of u.memberships) {
          const schoolId = schoolIds.get(m.school)!;
          const [already] = await tx
            .select({ id: membership.id })
            .from(membership)
            .where(
              and(
                eq(membership.schoolId, schoolId),
                eq(membership.userId, existing.id),
                eq(membership.role, m.role),
              ),
            );
          if (!already) {
            await tx.insert(membership).values({ schoolId, userId: existing.id, role: m.role });
          }
        }
      }
    });
  } finally {
    await pool.end();
  }

  console.log("Demo data ready. Sign in with any of these (password: %s):", DEMO_PASSWORD);
  for (const u of DEMO_USERS) {
    const roles = u.memberships.map((m) => `${m.role}@${m.school}`).join(", ");
    console.log(`  ${(u.phone ?? u.email)!.padEnd(26)} ${u.name.padEnd(16)} ${roles}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
