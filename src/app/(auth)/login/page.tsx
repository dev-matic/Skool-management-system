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
        <h1 className="text-title font-semibold">Sign in</h1>
        <p className="mt-0.5 text-ink-secondary">School Management System</p>
      </div>
      <div className="px-6 py-5">
        <LoginForm />
      </div>
    </div>
  );
}
