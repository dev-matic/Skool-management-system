import type { ReactNode } from "react";

/** Neutral facts and counts ("JHS 2", "3 unreconciled"). Never carries status. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-control bg-subtle px-1.5 text-caption font-semibold whitespace-nowrap text-ink">
      {children}
    </span>
  );
}
