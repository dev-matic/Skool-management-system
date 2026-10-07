/**
 * FAKE demo data for development, testing and hosted demo sites: two schools,
 * staff accounts, and the demo school's setup and timetable (see
 * seed-setup.ts and seed-timetable.ts). Safe to run repeatedly (existing rows
 * are left alone). Run with `pnpm db:seed` (seed.ts) or on deploy
 * (deploy-setup.ts).
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { todayIn } from "../domain/dates";
import { placeholderEmailForPhone } from "../domain/login";
import type { Phase1Role } from "../domain/roles";
import * as schema from "./schema";
import { seedDemoSetup } from "./seed-setup";
import { seedDemoTimetable } from "./seed-timetable";

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
  // Phase 1 has no parent or student accounts (CLAUDE.md).
  memberships: { school: SchoolSlug; role: Phase1Role }[];
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
    name: "Kwame Darko",
    phone: "+233241000006",
    email: "head@demo-school.test",
    memberships: [
      { school: "demo-basic", role: "admin" },
      { school: "demo-basic", role: "teacher" },
      { school: "second-demo", role: "admin" },
    ],
  },
  // FAKE demo teachers (phone-only accounts) used by the demo school setup.
  ...(
    [
      ["Akua Nyarko", "+233241000010"],
      ["Adwoa Asare", "+233241000011"],
      ["Selorm Agbeko", "+233241000012"],
      ["Mariama Seidu", "+233241000013"],
      ["Kofi Boadu", "+233241000014"],
      ["Yaw Mensah", "+233241000015"],
      ["Abdul-Rahman Issah", "+233241000016"],
      ["Kwabena Frimpong", "+233241000017"],
      ["Nana Ama Osei", "+233241000018"],
      ["Elikem Dzradosi", "+233241000019"],
    ] as const
  ).map(([name, phone]) => ({
    name,
    phone,
    email: null,
    memberships: [{ school: "demo-basic" as const, role: "teacher" as const }],
  })),
  {
    name: "Esi Quaye",
    phone: "+233241000007",
    email: "admin@second-demo.test",
    memberships: [{ school: "second-demo", role: "admin" }],
  },
];

/**
 * Creates the FAKE demo schools, staff, setup and timetable in the database
 * at `url` (an owner connection). Existing rows are left alone.
 */
export async function seedDemoData(url: string, password: string = DEMO_PASSWORD) {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const passwordHash = await hashPassword(password);
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

      const userIdByPhone = new Map<string, string>();
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
        if (u.phone) userIdByPhone.set(u.phone, existing.id);
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

      // The second school is left without setup, to show empty screens.
      await seedDemoSetup(tx, schoolIds.get("demo-basic")!, userIdByPhone);
      await seedDemoTimetable(tx, schoolIds.get("demo-basic")!, todayIn("Africa/Accra"));
    });
  } finally {
    await pool.end();
  }
}
