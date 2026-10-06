import { describe, expect, it } from "vitest";
import { previewPagesEnabled } from "./preview-pages";

describe("previewPagesEnabled", () => {
  it("shows preview pages in development and on Vercel previews only", () => {
    expect(previewPagesEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(previewPagesEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
    expect(previewPagesEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(previewPagesEnabled({ NODE_ENV: "production" })).toBe(false);
  });
});
