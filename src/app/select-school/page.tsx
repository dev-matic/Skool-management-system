import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { Icon } from "@/components/ui";
import { ROLE_LABELS } from "@/domain/roles";
import { chooseSchool } from "@/server/actions/session";
import { listMySchools, requireUser } from "@/server/tenant";

export const metadata: Metadata = { title: "Choose a school" };

export default async function SelectSchoolPage() {
  const current = await requireUser();
  const schools = await listMySchools(current.id);
  if (schools.length === 0) redirect("/no-access");

  return (
    <div className="mx-auto max-w-md px-4 pt-[10vh]">
      <h1 className="text-title font-semibold">Choose a school</h1>
      <p className="mt-1 text-ink-secondary">You have access to more than one school.</p>
      <ul className="mt-5 divide-y divide-divider rounded-panel border border-divider bg-surface">
        {schools.map((s) => (
          <li key={s.schoolId}>
            <form action={chooseSchool}>
              <input type="hidden" name="schoolId" value={s.schoolId} />
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-row-hover"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.schoolName}</span>
                  <span className="block text-label text-ink-secondary">
                    {s.roles.map((r) => ROLE_LABELS[r]).join(", ")}
                  </span>
                </span>
                <Icon icon={ChevronRight} className="text-ink-secondary" />
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
