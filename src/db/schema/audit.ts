import { bigint, index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AuditChanges } from "@/domain/audit-diff";
import { user } from "./auth";
import { school } from "./tenancy";

export const AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "reverse",
  "publish",
  "login",
  "logout",
  "export",
  "import",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditActionEnum = pgEnum("audit_action", AUDIT_ACTIONS);

/**
 * Append-only record of important changes. A database trigger rejects any
 * UPDATE, DELETE or TRUNCATE, and the app's database role is only granted
 * SELECT and INSERT.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    // Null for events not tied to one school, such as signing in.
    schoolId: bigint("school_id", { mode: "number" }).references(() => school.id),
    actorId: text("actor_id").references(() => user.id),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    changes: jsonb("changes").$type<AuditChanges>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.schoolId, t.entityType, t.entityId),
    index("audit_log_school_created_idx").on(t.schoolId, t.createdAt),
    index("audit_log_actor_idx").on(t.actorId, t.createdAt),
  ],
);
