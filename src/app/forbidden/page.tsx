import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { Icon, LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Not allowed" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-4 pt-[10vh]">
      <Icon icon={LockKeyhole} size="md" className="text-ink-secondary" />
      <h1 className="text-title font-semibold">You don&apos;t have access to that page</h1>
      <p className="text-ink-secondary">
        Your role does not allow this. If you think it should, ask your school administrator.
      </p>
      <LinkButton href="/dashboard" className="mt-2">
        Back to dashboard
      </LinkButton>
    </div>
  );
}
