import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/tenant";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="rounded-panel border border-divider bg-surface">
      <div className="border-b border-divider px-6 py-4">
        <p className="text-label font-semibold text-ink-secondary">School Management System</p>
        <h1 className="mt-0.5 text-title font-semibold">Sign in</h1>
      </div>
      <div className="px-6 py-5">
        <LoginForm />
      </div>
    </div>
  );
}
