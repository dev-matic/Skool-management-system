import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/server/tenant";
import { AddStaffForm } from "./add-staff-form";

export const metadata: Metadata = { title: "Add staff member" };

export default async function NewStaffPage() {
  await requireRole("admin");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Add staff member"
        description="Teachers, the bursar and other administrators. Parents and students do not get accounts yet."
      />
      <AddStaffForm />
    </div>
  );
}
