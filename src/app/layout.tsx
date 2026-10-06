import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";

// Plus Jakarta Sans (SIL OFL 1.1), served with the app: no request to Google.
// Latin and Latin Extended cover English and Ghanaian names (e.g. Ɛ, Ɔ).
const jakarta = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "School Management System",
    template: "%s · School Management System",
  },
  description: "School management for Ghanaian schools",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GH" className={jakarta.variable}>
      <body className="min-h-screen bg-page font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
