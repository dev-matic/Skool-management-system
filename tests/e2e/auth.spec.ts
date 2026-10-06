import { expect, test, type Page } from "@playwright/test";

// Demo accounts created by `pnpm db:seed` (src/db/seed.ts).
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

async function signIn(page: Page, identifier: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// On small screens the menu sits behind a Menu button; open it if needed.
async function mainNav(page: Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  return page.getByRole("navigation", { name: "Main" });
}

test("protected pages redirect to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("admin signs in with a phone number typed the local way", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("school-name")).toHaveText("Demo Basic School");
  await expect(page.getByRole("heading", { name: "Welcome, Akosua Mensah" })).toBeVisible();
  await expect(await mainNav(page)).toContainText("School setup");
  await expect(await mainNav(page)).toContainText("Fees & payments");
});

test("teacher signs in with email and only sees teacher areas", async ({ page }) => {
  await signIn(page, "Teacher@Demo-School.test");
  await expect(page.getByTestId("school-name")).toHaveText("Demo Basic School");
  await expect(await mainNav(page)).toContainText("Students");
  await expect(await mainNav(page)).not.toContainText("School setup");
  await expect(await mainNav(page)).not.toContainText("Fees & payments");
});

test("bursar with a phone-only account sees fees but not school setup", async ({ page }) => {
  await signIn(page, "+233241000002");
  await expect(page.getByText("as Bursar")).toBeVisible();
  await expect(await mainNav(page)).toContainText("Fees & payments");
  await expect(await mainNav(page)).not.toContainText("School setup");
  // The placeholder email used internally for phone-only accounts is never shown.
  await expect(page.locator("body")).not.toContainText("phone.invalid");
});

test("wrong password shows an error and keeps what was typed", async ({ page }) => {
  await signIn(page, "0241000004", "not-the-password");
  await expect(page.getByTestId("form-error")).toHaveText(
    "Incorrect phone number/email or password.",
  );
  await expect(page.getByLabel("Phone number or email")).toHaveValue("0241000004");
  await expect(page).toHaveURL(/\/login$/);
});

test("an unrecognisable identifier is explained", async ({ page }) => {
  await signIn(page, "0241");
  await expect(page.getByTestId("form-error")).toContainText("valid phone number");
});

test("a person working at two schools chooses one and can switch", async ({ page }) => {
  await signIn(page, "0241000006");
  await expect(page).toHaveURL(/\/select-school$/);
  await page.getByRole("button", { name: /Second Demo School/ }).click();
  await expect(page.getByTestId("school-name")).toHaveText("Second Demo School");
  await expect(page.getByText("as Administrator")).toBeVisible();

  await page.getByRole("link", { name: "Switch school" }).click();
  await page.getByRole("button", { name: /Demo Basic School/ }).click();
  await expect(page.getByTestId("school-name")).toHaveText("Demo Basic School");
  await expect(page.getByText("as Administrator, Teacher")).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page, "0241000003");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("keyboard users can skip past the menu to the page content", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});
