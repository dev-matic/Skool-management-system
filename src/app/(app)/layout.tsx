import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { formatDate } from "@/domain/dates";
import { hasAnyRole, ROLE_LABELS } from "@/domain/roles";
import { getCurrentTerm } from "@/server/academic-years";
import { getTenantContext } from "@/server/tenant";
import { AppFrame } from "./app-frame";
import { NAV_ITEMS } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  const items = NAV_ITEMS.filter((item) => hasAnyRole(ctx.roles, item.roles));
  const { status } = await getCurrentTerm(ctx);
  const isAdmin = hasAnyRole(ctx.roles, ["admin"]);

  const termLabel =
    status.kind === "in-term" ? (
      <span data-testid="current-term">
        {status.term.name}, {status.term.yearName}
      </span>
    ) : status.kind === "break" ? (
      <span data-testid="current-term">
        Holiday · {status.next.name} starts{" "}
        <span className="tabular-nums">{formatDate(status.next.startsOn)}</span>
      </span>
    ) : isAdmin ? (
      <Link href="/setup/years" className="underline" data-testid="current-term">
        Set up this year&apos;s terms
      </Link>
    ) : null;

  const topBar = (
    <>
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="truncate font-semibold" data-testid="school-name">
          {ctx.schoolName}
        </span>
        {ctx.hasOtherSchools && (
          <Link href="/select-school" className="shrink-0 text-label underline">
            Switch school
          </Link>
        )}
        {termLabel && (
          <span className="hidden shrink-0 border-l border-brand-edge pl-3 text-label md:inline">
            {termLabel}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-right leading-tight sm:block">
          <span className="block font-semibold">{ctx.userName}</span>
          <span className="block text-caption">
            {ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")}
          </span>
        </span>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <AppFrame topBar={topBar} items={items}>
      {children}
    </AppFrame>
  );
}
