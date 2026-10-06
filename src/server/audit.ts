import "server-only";
import { headers } from "next/headers";
import { auditLog, type AuditAction } from "@/db/schema";
import type { AuditChanges } from "@/domain/audit-diff";
import type { Tx } from "./db-context";

export interface AuditEntry {
  schoolId: number | null;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | number | null;
  changes?: AuditChanges | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an audit entry inside the caller's transaction, so the change and
 * its audit record are saved together or not at all.
 */
export async function recordAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({
    schoolId: entry.schoolId,
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId:
      entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
    changes: entry.changes && Object.keys(entry.changes).length > 0 ? entry.changes : null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
  });
}

/** IP address and browser of the current request, for audit entries. */
export async function requestMeta(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  // Behind our reverse proxy (Caddy) the client IP is the first X-Forwarded-For entry.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: forwarded || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
  };
}
