import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { hasAnyRole, ROLE_LABELS } from "@/domain/roles";
import { getTenantContext } from "@/server/tenant";
import { AppFrame } from "./app-frame";
import { NAV_ITEMS } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  const items = NAV_ITEMS.filter((item) => hasAnyRole(ctx.roles, item.roles));

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
