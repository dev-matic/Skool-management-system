import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";
import { Icon } from "@/components/ui";
import { requireUser } from "@/server/tenant";

export const metadata: Metadata = { title: "No access" };

export default async function NoAccessPage() {
  await requireUser();
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-4 pt-[10vh]">
      <Icon icon={LockKeyhole} size="md" className="text-ink-secondary" />
      <h1 className="text-title font-semibold">No school access</h1>
      <p className="text-ink-secondary">
        Your account is not linked to any active school. Please contact your school administrator.
      </p>
      <div className="mt-2">
        <SignOutButton />
      </div>
    </div>
  );
}
