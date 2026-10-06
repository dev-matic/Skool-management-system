"use client";

import {
  CalendarCheck,
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
import { Icon, cx } from "@/components/ui";
import type { NavIcon, NavItem } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  setup: School,
  students: Users,
  attendance: CalendarCheck,
  assessment: ClipboardList,
  fees: Wallet,
  audit: History,
};

/**
 * Top bar + sidebar + content (docs/design-system.md, Layout). Below 1024px
 * the sidebar is hidden behind a Menu button.
 */
export function AppFrame({
  topBar,
  items,
  children,
}: {
  topBar: ReactNode;
  items: readonly NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="no-print sr-only rounded-control bg-surface px-3 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:shadow-overlay"
      >
        Skip to main content
      </a>
      <header className="no-print sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-brand-edge bg-brand px-3 text-ink lg:px-4">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-control hover:bg-brand-hover lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon icon={menuOpen ? X : Menu} size="md" />
        </button>
        {topBar}
      </header>

      <div className="lg:flex">
        <nav
          id="main-nav"
          aria-label="Main"
          className={cx(
            "no-print border-b border-divider bg-surface lg:sticky lg:top-12 lg:block lg:h-[calc(100vh-3rem)] lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0",
            menuOpen ? "block" : "hidden",
          )}
        >
          <ul className="flex flex-col gap-0.5 p-2">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const label = (
                <>
                  <Icon icon={ICONS[item.icon]} size="md" />
                  <span className="flex-1">{item.label}</span>
                </>
              );
              return (
                <li key={item.href}>
                  {item.comingIn === null ? (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={cx(
                        "flex min-h-9 items-center gap-2.5 rounded-control px-2.5 py-1.5 leading-snug font-medium pointer-coarse:min-h-11",
                        active
                          ? "bg-brand-tint text-ink shadow-[inset_3px_0_0_var(--color-brand-strong)]"
                          : "text-ink hover:bg-subtle",
                      )}
                    >
                      {label}
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
        </nav>

        <main
          id="main"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-5 focus:outline-none lg:px-6"
        >
          <div className="mx-auto max-w-[90rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
