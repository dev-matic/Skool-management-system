import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import { TONE_CLASSES, type StatusTone } from "./status";

const ICONS: Record<StatusTone, LucideIcon> = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
  neutral: Info,
};

/** A message block. Danger alerts are announced to screen readers. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  tone?: StatusTone;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "flex gap-2 rounded-control px-3 py-2 text-base",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      <Icon icon={ICONS[tone]} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
