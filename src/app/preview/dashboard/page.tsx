import type { Metadata } from "next";
import { PreviewDashboard } from "./preview-dashboard";
import { PreviewShell } from "./preview-shell";

export const metadata: Metadata = { title: "Dashboard preview (fake data)" };

/** Admin dashboard design preview with FAKE data, shown before the real data exists. */
export default function DashboardPreviewPage() {
  return (
    <PreviewShell>
      <PreviewDashboard />
    </PreviewShell>
  );
}
