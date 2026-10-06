/**
 * Soft accent tints (docs/design-system.md, Tints). Never status colours:
 * anything they mark also has a word. Full class names so Tailwind sees them.
 */
export type Tint = "sky" | "mint" | "peach" | "lilac";

export const TINTS: Record<Tint, { bg: string; ink: string }> = {
  sky: { bg: "bg-tint-sky", ink: "text-tint-sky-ink" },
  mint: { bg: "bg-tint-mint", ink: "text-tint-mint-ink" },
  peach: { bg: "bg-tint-peach", ink: "text-tint-peach-ink" },
  lilac: { bg: "bg-tint-lilac", ink: "text-tint-lilac-ink" },
};

/** Tints in their fixed order; repeats after four. */
export const TINT_ORDER: readonly Tint[] = ["sky", "mint", "peach", "lilac"];

export function tintAt(index: number): Tint {
  return TINT_ORDER[((index % TINT_ORDER.length) + TINT_ORDER.length) % TINT_ORDER.length]!;
}

/** The same tint every time for the same text, e.g. a subject or a person. */
export function tintFor(key: string): Tint {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tintAt(Math.abs(hash));
}
