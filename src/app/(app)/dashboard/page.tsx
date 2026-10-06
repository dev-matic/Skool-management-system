import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ui";
import { ROLE_LABELS } from "@/domain/roles";
import { getTenantContext } from "@/server/tenant";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Every page checks access itself; layouts alone are not enough.
  const ctx = await getTenantContext();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome, ${ctx.userName}`}
        description={
          <>
            You are signed in to{" "}
            <strong className="font-semibold text-ink">{ctx.schoolName}</strong> as{" "}
            {ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")}.
          </>
        }
      />
      <Panel title="Getting started" className="max-w-2xl">
        <p>
          School setup, students, attendance, scores and fees appear in the menu as they are built.
          Areas marked <strong className="font-semibold">Soon</strong> are not available yet.
        </p>
      </Panel>
    </div>
  );
}
