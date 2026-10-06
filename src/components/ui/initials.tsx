import { cx } from "./cx";
import { TINTS, tintFor } from "./tint";

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * A person's initials in a tinted circle (no photos of children). Decorative:
 * the name is always shown beside it.
 */
export function InitialsCircle({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const tint = TINTS[tintFor(name)];
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-bold",
        size === "sm" ? "size-8 text-caption" : "size-9 text-label",
        tint.bg,
        tint.ink,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
