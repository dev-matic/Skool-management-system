import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, LinkButton, PageHeader, Panel, StatusChip } from "@/components/ui";
import { formatPhone } from "@/domain/phone";
import { canResetPassword, getStaffMember } from "@/server/staff";
import { requireRole } from "@/server/tenant";
import { AccessForm, PasswordForm, RolesForm } from "./staff-forms";

export const metadata: Metadata = { title: "Staff member" };

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const ctx = await requireRole("admin");
  const { userId } = await params;
  const { notice } = await searchParams;
  const member = await getStaffMember(ctx, userId);
  if (!member) notFound();
  const isSelf = member.userId === ctx.userId;
  const resettable = !isSelf && (await canResetPassword(ctx, userId));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <LinkButton href="/setup/staff" variant="ghost" size="compact" icon={ArrowLeft}>
          All staff
        </LinkButton>
      </div>
      <PageHeader
        title={member.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular-nums">
              {member.phone ? formatPhone(member.phone) : "No phone"}
            </span>
            {member.email && <span>{member.email}</span>}
            <StatusChip status={member.active ? "active" : "deactivated"} />
          </span>
        }
      />
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <Panel title="Roles">
          {member.active ? (
            <RolesForm userId={member.userId} roles={member.roles} />
          ) : (
            <p className="text-ink-secondary">Reactivate this person to change their roles.</p>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Access to this school">
            {isSelf ? (
              <p className="text-ink-secondary">You cannot deactivate your own account.</p>
            ) : (
              <AccessForm userId={member.userId} name={member.name} active={member.active} />
            )}
          </Panel>
          <Panel title="Password">
            {isSelf ? (
              <p className="text-ink-secondary">
                Your own password is changed from your account, not here.
              </p>
            ) : resettable ? (
              <PasswordForm userId={member.userId} />
            ) : (
              <p className="text-ink-secondary">
                {member.name} also works at another school, so only they can change their password.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
