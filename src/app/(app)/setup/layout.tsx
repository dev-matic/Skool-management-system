import { requireRole } from "@/server/tenant";
import { SetupNav } from "./setup-nav";

/** School setup is for administrators only (each page and action checks again). */
export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="flex flex-col gap-5">
      <SetupNav />
      {children}
    </div>
  );
}
