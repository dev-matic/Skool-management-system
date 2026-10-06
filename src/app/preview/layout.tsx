import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewPagesEnabled } from "../dev/preview-pages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Design previews with FAKE data. No sign-in or database needed. */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (!previewPagesEnabled()) notFound();
  return children;
}
