import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ROLES } from "@/domain/roles";
import { user } from "./auth";

export const roleEnum = pgEnum("role", ROLES);
export const positionMethodEnum = pgEnum("position_method", ["competition", "dense"]);
export const attendanceModeEnum = pgEnum("attendance_mode", ["daily", "am_pm"]);

/** A school is a tenant. Every other school-owned table points here with `school_id`. */
export const school = pgTable(
  "school",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    shortCode: text("short_code"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    logoUrl: text("logo_url"),
    currency: text("currency").notNull().default("GHS"),
    timezone: text("timezone").notNull().default("Africa/Accra"),
    // Class positions with ties: competition = 1,2,2,4; dense = 1,2,2,3.
    positionMethod: positionMethodEnum("position_method").notNull().default("competition"),
    attendanceMode: attendanceModeEnum("attendance_mode").notNull().default("daily"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("school_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("school_currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("school_phone_e164", sql`${t.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
);

/** Which role(s) a person holds in which school. One row per (school, user, role). */
export const membership = pgTable(
  "membership",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    schoolId: bigint("school_id", { mode: "number" })
      .notNull()
      .references(() => school.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    role: roleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id),
  },
  (t) => [
    unique("membership_school_user_role_key").on(t.schoolId, t.userId, t.role),
    index("membership_user_id_idx").on(t.userId),
  ],
);
