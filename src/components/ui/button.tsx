import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-brand-edge bg-brand font-semibold text-ink hover:bg-brand-hover",
  secondary: "border-input bg-surface font-medium text-ink hover:bg-subtle",
  ghost: "border-transparent bg-transparent font-medium text-brand-strong hover:bg-subtle",
  danger: "border-destructive bg-destructive font-semibold text-white hover:bg-danger",
};

const SIZES: Record<ButtonSize, string> = {
  default: "h-8 gap-2 px-3",
  compact: "h-7 gap-1.5 px-2",
};

/** Classes for anything that should look like a button (buttons and links). */
export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "default") {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-control border text-base whitespace-nowrap",
    "transition-colors duration-150 pointer-coarse:h-10",
    "disabled:cursor-not-allowed disabled:border-divider disabled:bg-subtle disabled:text-ink-disabled",
    VARIANTS[variant],
    SIZES[size],
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Shows a spinner, disables the button and keeps its label. */
  loading?: boolean;
};

export function Button({
  variant = "secondary",
  size = "default",
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClass(variant, size), className)}
      {...props}
    >
      {loading ? (
        <Icon icon={LoaderCircle} className="motion-safe:animate-spin" />
      ) : (
        icon && <Icon icon={icon} />
      )}
      {children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
};

/** A link that looks like a button, for navigation actions. */
export function LinkButton({
  variant = "secondary",
  size = "default",
  icon,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={cx(buttonClass(variant, size), className)} {...props}>
      {icon && <Icon icon={icon} />}
      {children}
    </Link>
  );
}
