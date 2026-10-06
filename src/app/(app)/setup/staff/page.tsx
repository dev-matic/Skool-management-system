import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Alert,
  Badge,
  LinkButton,
  PageHeader,
  StatusChip,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { formatPhone } from "@/domain/phone";
import { ROLE_LABELS } from "@/domain/roles";
import { listStaff } from "@/server/staff";
import { requireRole } from "@/server/tenant";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const ctx = await requireRole("admin");
  const staff = await listStaff(ctx);
  const activeCount = staff.filter((s) => s.active).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Staff"
        description={`${activeCount} active staff member${activeCount === 1 ? "" : "s"} with access to ${ctx.schoolName}.`}
        actions={
          <LinkButton href="/setup/staff/new" variant="primary" icon={Plus}>
            Add staff member
          </LinkButton>
        }
      />
      <Table caption="Staff members and their roles">
        <THead>
          <tr>
            <Th>Name</Th>
            <Th>Phone</Th>
            <Th>Email</Th>
            <Th>Roles</Th>
            <Th>Status</Th>
          </tr>
        </THead>
        <TBody>
          {staff.map((s) => (
            <Tr key={s.userId}>
              <Td>
                <Link
                  href={`/setup/staff/${s.userId}`}
                  className="font-medium text-brand-strong underline"
                >
                  {s.name}
                </Link>
                {s.userId === ctx.userId && (
                  <span className="text-label text-ink-secondary"> (you)</span>
                )}
              </Td>
              <Td className="tabular-nums whitespace-nowrap">
                {s.phone ? formatPhone(s.phone) : "—"}
              </Td>
              <Td>{s.email ?? "—"}</Td>
              <Td>
                {s.roles.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {s.roles.map((r) => (
                      <Badge key={r}>{ROLE_LABELS[r]}</Badge>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <StatusChip status={s.active ? "active" : "deactivated"} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      {staff.length === 1 && (
        <Alert tone="info">
          You are the only staff member so far. Add teachers and the bursar so you can assign
          classes and record fees.
        </Alert>
      )}
    </div>
  );
}
