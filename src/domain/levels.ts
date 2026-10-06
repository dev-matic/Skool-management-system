/*
 * Grade levels and classes (M2). Each school names its own levels; these
 * are only the suggested defaults (current Ghana Education Service naming
 * for basic schools, as chosen by the school owner).
 */

export const STAGES = ["kg", "primary", "jhs", "shs"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  kg: "KG",
  primary: "Primary",
  jhs: "JHS",
  shs: "SHS",
};

export const STANDARD_LEVELS: readonly { name: string; stage: Stage }[] = [
  { name: "KG 1", stage: "kg" },
  { name: "KG 2", stage: "kg" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ name: `Basic ${n}`, stage: "primary" as const })),
  ...[1, 2, 3].map((n) => ({ name: `JHS ${n}`, stage: "jhs" as const })),
];

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/** Tidies a level or class name and explains what is wrong with it, if anything. */
export function checkName(raw: string, what: "level" | "class"): { name: string; error?: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name)
    return {
      name,
      error: `Enter the ${what} name, e.g. ${what === "level" ? "Basic 4" : "JHS 2A"}.`,
    };
  if (name.length > 40) return { name, error: "Use at most 40 characters." };
  return { name };
}

/** New order after moving one item up or down; unchanged at the ends. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
