import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, RotateCw, CircleAlert } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass } from "./button";
import { cx } from "./cx";
import { Icon } from "./icon";

/*
 * Dense data table (docs/design-system.md, Table). Sorting is done with links
 * so it works from the server and keeps the sort in the URL.
 */

export function Table({
  caption,
  children,
  className,
}: {
  /** Describes the table for screen readers; visually hidden. */
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        // relative: hidden screen-reader text stays inside the scroll box.
        "relative overflow-x-auto rounded-panel border border-divider bg-surface print:overflow-visible print:border-black",
        className,
      )}
    >
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-subtle print:static">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export type SortDirection = "ascending" | "descending" | "none";

export function Th({
  children,
  numeric = false,
  sort,
  className,
  ...props
}: ComponentProps<"th"> & {
  numeric?: boolean;
  /** Current sort of this column and the link that changes it. */
  sort?: { direction: SortDirection; href: string };
}) {
  const icon =
    sort?.direction === "ascending"
      ? ArrowUp
      : sort?.direction === "descending"
        ? ArrowDown
        : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={sort ? sort.direction : undefined}
      className={cx(
        "h-9 border-b border-divider px-3 text-label font-semibold whitespace-nowrap text-ink-secondary",
        "print:border-black print:text-black",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {sort ? (
        <Link
          href={sort.href}
          className={cx(
            "inline-flex items-center gap-1 rounded-control hover:text-ink",
            numeric && "flex-row-reverse",
          )}
        >
          {children}
          <Icon icon={icon} className="no-print" />
        </Link>
      ) : (
        children
      )}
    </th>
  );
}

export function Tr({
  selected = false,
  total = false,
  className,
  ...props
}: ComponentProps<"tr"> & { selected?: boolean; total?: boolean }) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cx(
        total ? "font-semibold [&>td]:border-t-2 [&>td]:border-t-input" : "hover:bg-row-hover",
        selected &&
          "bg-brand-tint shadow-[inset_2px_0_0_var(--color-brand-strong)] hover:bg-brand-tint",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  numeric = false,
  className,
  ...props
}: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cx(
        "h-9 border-b border-divider px-3 py-2 align-middle print:border-black",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

/** Shown instead of rows while data loads: same height, no layout jump. */
export function TableLoadingRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="h-9 border-b border-divider px-3">
              <span className="block h-3 w-3/4 rounded-control bg-subtle" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** One sentence and the next action. */
export function TableEmpty({
  columns,
  message,
  action,
}: {
  columns: number;
  message: string;
  action?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={columns} className="px-3 py-8 text-center">
        <div className="flex flex-col items-center gap-3 text-ink-secondary">
          <Icon icon={Inbox} size="md" />
          <p>{message}</p>
          {action}
        </div>
      </td>
    </tr>
  );
}

/** What failed, in plain words, and a way to try again. */
export function TableError({
  columns,
  message,
  retryHref,
}: {
  columns: number;
  message: string;
  retryHref?: string;
}) {
  return (
    <tr>
      <td colSpan={columns} className="px-3 py-8 text-center">
        <div role="alert" className="flex flex-col items-center gap-3 text-danger">
          <Icon icon={CircleAlert} size="md" />
          <p className="font-medium">{message}</p>
          {retryHref && (
            <Link href={retryHref} className={buttonClass("secondary")}>
              <Icon icon={RotateCw} />
              Try again
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}
