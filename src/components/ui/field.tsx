import {
  cloneElement,
  isValidElement,
  type AriaAttributes,
  type ComponentProps,
  type ReactElement,
} from "react";
import { CircleAlert } from "lucide-react";
import { cx } from "./cx";
import { Icon } from "./icon";

type ControlProps = Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & { id?: string };

/**
 * Label above, control, then hint and error below. Wires the label, hint and
 * error to the control for screen readers (docs/design-system.md, Form).
 */
export function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactElement<ControlProps>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-label font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-ink-secondary"> (optional)</span>}
      </label>
      {isValidElement(children)
        ? cloneElement(children, {
            id,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
          })
        : children}
      {hint && (
        <p id={hintId} className="text-label text-ink-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-label font-medium text-danger">
          <Icon icon={CircleAlert} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "h-8 w-full rounded-control border border-input bg-surface px-2.5 text-base text-ink pointer-coarse:h-10",
        "placeholder:text-ink-secondary",
        "aria-invalid:border-2 aria-invalid:border-danger",
        "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-disabled",
        className,
      )}
      {...props}
    />
  );
}
