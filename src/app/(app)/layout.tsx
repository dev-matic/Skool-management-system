import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { hasAnyRole, ROLE_LABELS } from "@/domain/roles";
import { getTenantContext } from "@/server/tenant";
import { NAV_ITEMS } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  const items = NAV_ITEMS.filter((item) => hasAnyRole(ctx.roles, item.roles));

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <span className="font-semibold" data-testid="school-name">
            {ctx.schoolName}
          </span>
          {ctx.hasOtherSchools && (
            <Link href="/select-school" className="text-sm text-blue-700 underline">
              Switch school
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              {ctx.userName}{" "}
              <span className="text-slate-500">
                ({ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")})
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
        <nav aria-label="Main" className="no-print md:w-52 md:shrink-0">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {items.map((item) => (
              <li key={item.href} className="shrink-0">
                {item.comingIn === null ? (
                  <Link
                    href={item.href}
                    className="block rounded px-3 py-1.5 text-sm hover:bg-slate-200"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="block rounded px-3 py-1.5 text-sm text-slate-400"
                    title={`Coming in ${item.comingIn}`}
                  >
                    {item.label} <span className="text-xs">(soon)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
