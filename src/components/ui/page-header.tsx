import type { ReactNode } from "react";

/** Page title, an optional one-line description, and actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-ink-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A bordered surface for grouping content. No shadow. */
export function Panel({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-panel border border-divider bg-surface ${className ?? ""}`.trim()}>
      {title && (
        <h2 className="border-b border-divider px-4 py-2.5 text-heading font-semibold">{title}</h2>
      )}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
