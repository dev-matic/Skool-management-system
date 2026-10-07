"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cx } from "@/components/ui";

/** Sections of the timetable; the chosen term follows you between them. */
export function TimetableNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const term = useSearchParams().get("term");
  return (
    <nav aria-label="Timetable" className="no-print">
      <ul className="inline-flex max-w-full gap-1 overflow-x-auto rounded-panel border border-card-edge bg-surface p-1 shadow-card">
        {items.map((s) => {
          const active =
            s.href === "/timetable"
              ? pathname === s.href
              : pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.href}>
              <Link
                href={term ? `${s.href}?term=${term}` : s.href}
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
