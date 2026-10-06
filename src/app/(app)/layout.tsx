import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { InitialsCircle } from "@/components/ui";
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
      <Link href="/setup/years" className="text-brand-strong underline" data-testid="current-term">
        Set up this year&apos;s terms
      </Link>
    ) : null;

  const topBar = (
    <>
      {termLabel && (
        <span className="hidden shrink-0 rounded-full bg-brand-tint px-3 py-1 text-label font-semibold md:inline">
          {termLabel}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        {ctx.hasOtherSchools && (
          <Link href="/select-school" className="shrink-0 text-label text-brand-strong underline">
            Switch school
          </Link>
        )}
        <InitialsCircle name={ctx.userName} size="md" />
        <span className="hidden leading-tight sm:block">
          <span className="block font-semibold">{ctx.userName}</span>
          <span className="block text-caption text-ink-secondary">
            {ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")}
          </span>
        </span>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <AppFrame schoolName={ctx.schoolName} topBar={topBar} items={items}>
      {children}
    </AppFrame>
  );
}
