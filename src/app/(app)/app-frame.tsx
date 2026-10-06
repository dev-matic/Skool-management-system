"use client";

import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  History,
  LayoutDashboard,
  Menu,
  School,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, cx, initialsOf } from "@/components/ui";
import type { NavIcon, NavItem } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  setup: School,
  timetable: CalendarClock,
  students: Users,
  attendance: CalendarCheck,
  assessment: ClipboardList,
  fees: Wallet,
  audit: History,
};

function SchoolMark({ schoolName }: { schoolName: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-control bg-brand text-label font-bold text-ink"
    >
      {initialsOf(schoolName)}
    </span>
  );
}

/**
 * White sidebar + white top bar on the tinted page (docs/design-system.md,
 * Layout). Below 1024px the sidebar opens over the page from a Menu button.
 */
export function AppFrame({
  schoolName,
  topBar,
  items,
  children,
}: {
  schoolName: string;
  topBar: ReactNode;
  items: readonly NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#main"
        className="no-print sr-only rounded-control bg-surface px-3 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:shadow-overlay"
      >
        Skip to main content
      </a>

      <nav
        id="main-nav"
        aria-label="Main"
        onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
        className={cx(
          "no-print flex-col gap-5 overflow-y-auto border-card-edge bg-surface px-3 py-4",
          "lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:border-r",
          menuOpen
            ? "flex max-lg:fixed max-lg:inset-x-0 max-lg:top-14 max-lg:bottom-0 max-lg:z-30 max-lg:border-t"
            : "hidden",
        )}
      >
        <div className="hidden items-center gap-2.5 px-2 lg:flex">
          <SchoolMark schoolName={schoolName} />
          <span className="min-w-0 leading-tight font-semibold" data-testid="school-name">
            {schoolName}
          </span>
        </div>
        <div>
          <p className="px-2.5 pb-2 text-caption font-semibold text-ink-secondary">Menu</p>
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  {item.comingIn === null ? (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cx(
                        "flex min-h-9 items-center gap-2.5 rounded-control px-2.5 py-1.5 leading-snug pointer-coarse:min-h-11",
                        active
                          ? "bg-brand-tint font-semibold text-ink"
                          : "font-medium text-ink hover:bg-subtle",
                      )}
                    >
                      <Icon
                        icon={ICONS[item.icon]}
                        size="md"
                        className={active ? "text-brand-strong" : "text-ink-secondary"}
                      />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      title={`Available from milestone ${item.comingIn}`}
                      className="flex min-h-9 items-center gap-2.5 rounded-control px-2.5 py-1.5 leading-snug text-ink-secondary pointer-coarse:min-h-11"
                    >
                      <Icon icon={ICONS[item.icon]} size="md" />
                      <span className="flex-1">
                        {item.label} <span className="text-caption">(soon)</span>
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-card-edge bg-surface px-3 lg:px-6">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-control hover:bg-subtle lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon icon={menuOpen ? X : Menu} size="md" />
          </button>
          <span className="flex min-w-0 items-center gap-2 lg:hidden">
            <SchoolMark schoolName={schoolName} />
            <span className="hidden truncate font-semibold sm:inline">{schoolName}</span>
          </span>
          {topBar}
        </header>

        <main id="main" tabIndex={-1} className="min-w-0 px-4 py-5 focus:outline-none lg:px-6">
          <div className="mx-auto max-w-[90rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
