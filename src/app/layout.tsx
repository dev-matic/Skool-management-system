import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "School Management System",
    template: "%s · School Management System",
  },
  description: "School management for Ghanaian schools",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GH">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <header className="no-print border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-12 max-w-7xl items-center px-4">
            <span className="text-sm font-semibold tracking-tight">School Management System</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
