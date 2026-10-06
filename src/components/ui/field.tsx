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

/**
 * A group of checkboxes with one legend, hint and error, e.g. a person's
 * roles. Checked values are submitted under `name`, one entry each.
 */
export function CheckboxGroup({
  name,
  legend,
  options,
  defaultValues = [],
  hint,
  error,
  disabledValues = [],
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string; description?: string }[];
  defaultValues?: readonly string[];
  hint?: string;
  error?: string;
  disabledValues?: readonly string[];
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset
      className="flex flex-col gap-1"
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-1 text-label font-semibold text-ink">{legend}</legend>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-2">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValues.includes(option.value)}
              disabled={disabledValues.includes(option.value)}
              className="mt-0.5 size-4 shrink-0 rounded-control border-input pointer-coarse:size-5"
            />
            <span>
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <span className="block text-label text-ink-secondary">{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
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
    </fieldset>
  );
}

/**
 * A date typed as dd/mm/yyyy (docs/design-system.md, Form). Text rather than
 * the browser's date picker, which shows US-style dates on some computers.
 */
export function DateInput(props: Omit<ComponentProps<"input">, "type">) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      maxLength={10}
      autoComplete="off"
      className="tabular-nums"
      {...props}
    />
  );
}
