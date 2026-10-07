import { expect, test } from "@playwright/test";

test("home page sends visitors to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveTitle(/School Management System/);
});

test("health check reports a reachable database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", database: "ok" });
});

test("reference and preview pages are hidden in production builds", async ({ request }) => {
  for (const path of ["/dev/components", "/preview/dashboard"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

test("a configured site never shows the not-set-up page", async ({ page }) => {
  await page.goto("/setup-needed");
  await expect(page).toHaveURL(/\/login$/);
});
