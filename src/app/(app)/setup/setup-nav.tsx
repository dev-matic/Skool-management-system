"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/** Sections of School setup. Each is added here when it is built. */
const SECTIONS = [{ href: "/setup/staff", label: "Staff" }] as const;

export function SetupNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="School setup" className="no-print border-b border-divider">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {SECTIONS.map((s) => {
          const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex h-9 items-center border-b-2 px-3 font-medium whitespace-nowrap",
                  active
                    ? "border-brand-strong text-ink"
                    : "border-transparent text-ink-secondary hover:text-ink",
                )}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
