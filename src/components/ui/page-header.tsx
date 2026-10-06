import type { ReactNode } from "react";
import { cx } from "./cx";

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

/** The white rounded card surface (docs/design-system.md, Card). */
export const cardClass = "rounded-panel border border-card-edge bg-surface shadow-card";

/**
 * A card: title with an optional subtitle, actions or filters on the right,
 * then the content (tables, lists, charts, forms).
 */
export function Panel({
  id,
  title,
  subtitle,
  aside,
  children,
  className,
}: {
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cx(cardClass, "flex min-w-0 scroll-mt-20 flex-col gap-3 p-4", className)}
    >
      {(title || aside) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-heading font-semibold">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-label text-ink-secondary">{subtitle}</p>}
          </div>
          {aside}
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
