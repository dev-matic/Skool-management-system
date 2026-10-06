import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards the colour pairs promised in docs/design-system.md: if anyone edits a
// token in globals.css, this fails before an unreadable screen ships.

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  const hex = match?.[1];
  if (!hex) throw new Error(`Colour token --color-${name} not found in globals.css`);
  return hex;
}

function luminance(hex: string): number {
  const linear = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// [foreground, background, minimum ratio]
const TEXT = 4.5;
const NON_TEXT = 3;
const PAIRS: [string, string, number][] = [
  ["ink", "surface", TEXT],
  ["ink", "page", TEXT],
  ["ink", "subtle", TEXT],
  ["ink-secondary", "surface", TEXT],
  ["ink-secondary", "subtle", TEXT],
  ["ink-secondary", "page", TEXT],
  ["ink", "brand", TEXT],
  ["ink", "brand-hover", TEXT],
  ["ink", "brand-tint", TEXT],
  ["brand-strong", "surface", TEXT],
  ["brand-strong", "brand-tint", TEXT],
  ["success", "success-bg", TEXT],
  ["warning", "warning-bg", TEXT],
  ["danger", "danger-bg", TEXT],
  ["info", "info-bg", TEXT],
  ["neutral", "neutral-bg", TEXT],
  ["white", "destructive", TEXT],
  ["danger", "surface", TEXT],
  ["input", "surface", NON_TEXT],
  ["brand-edge", "surface", NON_TEXT],
  ["focus", "surface", NON_TEXT],
  ["focus", "brand", NON_TEXT],
];

describe("design tokens", () => {
  it.each(PAIRS)("%s on %s meets %s:1", (fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });

  it("contrast helper matches known values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});
