import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import { TINTS, type Tint } from "./tint";

/**
 * A number someone acts on (docs/design-system.md, Figure tile). The whole
 * tile links to the list behind the number; there is no tile without one.
 */
export function FigureTile({
  tint,
  icon,
  label,
  value,
  detail,
  href,
  linkLabel,
  children,
}: {
  tint: Tint;
  icon: LucideIcon;
  label: string;
  value: string;
  detail: ReactNode;
  href: string;
  linkLabel: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex flex-col gap-2 rounded-panel p-4 text-ink hover:ring-2 hover:ring-card-edge",
        TINTS[tint].bg,
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-semibold">{label}</span>
        <span
          className={cx(
            "grid size-9 shrink-0 place-items-center rounded-control bg-surface",
            TINTS[tint].ink,
          )}
        >
          <Icon icon={icon} size="md" />
        </span>
      </span>
      <span className="text-figure font-bold tabular-nums">{value}</span>
      <span className="text-label">{detail}</span>
      {children}
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-label font-semibold group-hover:underline">
        {linkLabel}
        <Icon icon={ArrowRight} />
      </span>
    </Link>
  );
}
