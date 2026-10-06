import type { LucideIcon } from "lucide-react";

const SIZES = { sm: 16, md: 20 } as const;

/**
 * The only way to draw an icon: one size scale and one stroke weight
 * (docs/design-system.md, Icons). Decorative by default; pass `label` when the
 * icon carries meaning on its own.
 */
export function Icon({
  icon: Glyph,
  size = "sm",
  label,
  className,
}: {
  icon: LucideIcon;
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  return (
    <Glyph
      size={SIZES[size]}
      strokeWidth={1.75}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
