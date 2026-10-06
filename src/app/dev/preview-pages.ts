/**
 * Reference and preview pages (fake data, no sign-in) are shown in development
 * and on Vercel preview deployments, never on a production deployment.
 */
export function previewPagesEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview";
}
