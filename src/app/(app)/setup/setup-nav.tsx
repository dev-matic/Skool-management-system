"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/** Sections of School setup. Each is added here when it is built. */
const SECTIONS = [
  { href: "/setup/years", label: "Years & terms" },
  { href: "/setup/classes", label: "Classes" },
  { href: "/setup/subjects", label: "Subjects" },
  { href: "/setup/teachers", label: "Teachers" },
  { href: "/setup/staff", label: "Staff" },
] as const;

export function SetupNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="School setup" className="no-print">
      <ul className="inline-flex max-w-full gap-1 overflow-x-auto rounded-panel border border-card-edge bg-surface p-1 shadow-card">
        {SECTIONS.map((s) => {
          const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex h-8 items-center rounded-control px-3 whitespace-nowrap pointer-coarse:h-10",
                  active
                    ? "bg-brand-tint font-semibold text-ink"
                    : "font-medium text-ink-secondary hover:bg-subtle hover:text-ink",
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
