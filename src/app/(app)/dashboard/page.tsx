import type { Metadata } from "next";
import { ROLE_LABELS } from "@/domain/roles";
import { getTenantContext } from "@/server/tenant";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Every page checks access itself; layouts alone are not enough.
  const ctx = await getTenantContext();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome, {ctx.userName}</h1>
      <p className="text-slate-600">
        You are signed in to <strong>{ctx.schoolName}</strong> as{" "}
        {ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")}.
      </p>
      <p className="text-sm text-slate-500">
        School setup, students, attendance, scores and fees will appear in the menu as they are
        built.
      </p>
    </section>
  );
}
