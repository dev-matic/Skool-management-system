import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
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
      <h1 className="text-xl font-semibold">Choose a school</h1>
      <p className="mt-1 text-sm text-slate-600">You have access to more than one school.</p>
      <ul className="mt-6 space-y-2">
        {schools.map((s) => (
          <li key={s.schoolId}>
            <form action={chooseSchool}>
              <input type="hidden" name="schoolId" value={s.schoolId} />
              <button
                type="submit"
                className="w-full rounded border border-slate-300 bg-white px-4 py-3 text-left hover:bg-slate-100 focus:outline-2 focus:outline-blue-600"
              >
                <span className="block font-medium">{s.schoolName}</span>
                <span className="text-sm text-slate-500">
                  {s.roles.map((r) => ROLE_LABELS[r]).join(", ")}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
