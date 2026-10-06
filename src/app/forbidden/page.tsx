import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not allowed" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-[10vh]">
      <h1 className="text-xl font-semibold">You don&apos;t have access to that page</h1>
      <p className="text-slate-600">
        Your role does not allow this. If you think it should, ask your school administrator.
      </p>
      <Link href="/dashboard" className="text-blue-700 underline">
        Back to dashboard
      </Link>
    </div>
  );
}
