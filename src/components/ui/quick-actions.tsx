import type { ReactNode } from "react";

/** The role's most common tasks, near the top of a home screen. */
export function QuickActions({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-label font-semibold text-ink-secondary">Quick actions</span>
      {children}
    </nav>
  );
}
