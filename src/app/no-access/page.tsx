import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/server/tenant";

export const metadata: Metadata = { title: "No access" };

export default async function NoAccessPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-[10vh]">
      <h1 className="text-xl font-semibold">No school access</h1>
      <p className="text-slate-600">
        Your account is not linked to any active school. Please contact your school administrator.
      </p>
      <SignOutButton />
    </div>
  );
}
