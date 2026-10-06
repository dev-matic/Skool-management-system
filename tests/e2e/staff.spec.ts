import { expect, test, type Page } from "@playwright/test";

// Demo accounts from `pnpm db:seed`; new staff use FAKE unique numbers.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

async function signIn(page: Page, identifier: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** A fake mobile number that is new on every run (024 5xx xxxx). */
function freshPhone(): string {
  const n = String(Date.now() % 10_000_000).padStart(7, "0");
  return `0245${n.slice(1)}`;
}

test.describe.configure({ mode: "serial" });

test("admin adds a teacher, who can then sign in", async ({ page, browser }) => {
  const phone = freshPhone();
  await signIn(page, "024 100 0001");
  await page.goto("/setup/staff");
  await page.getByRole("link", { name: "Add staff member" }).click();

  await page.getByLabel("Full name").fill("Kwesi Appiah (fake)");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("First password").fill("first-pass-9");
  // Teacher is ticked by default.
  await page.getByRole("button", { name: "Add staff member" }).click();

  await expect(page.getByRole("heading", { name: "Kwesi Appiah (fake)" })).toBeVisible();
  await expect(page.getByText("was added")).toBeVisible();

  const other = await browser.newPage();
  await signIn(other, phone, "first-pass-9");
  await expect(other.getByText("as Teacher")).toBeVisible();
  await other.close();
});

test("adding staff shows every problem next to its field", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup/staff/new");
  await page.getByLabel("Phone number").fill("12345");
  await page.getByRole("checkbox", { name: /Teacher/ }).uncheck();
  await page.getByRole("button", { name: "Add staff member" }).click();

  await expect(page.getByText("Enter the person's full name.")).toBeVisible();
  await expect(page.getByText("This is not a valid phone number")).toBeVisible();
  await expect(page.getByText("Choose at least one role.")).toBeVisible();
  await expect(page.getByLabel("Phone number")).toHaveValue("12345");
});

test("deactivating asks for confirmation", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup/staff/new");
  await page.getByLabel("Full name").fill("Ama Ofori (fake)");
  await page.getByLabel("Phone number").fill(freshPhone());
  await page.getByLabel("First password").fill("first-pass-9");
  await page.getByRole("button", { name: "Add staff member" }).click();
  await expect(page.getByRole("heading", { name: "Ama Ofori (fake)" })).toBeVisible();

  await page.getByRole("button", { name: "Deactivate…" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Deactivate…" }).click();
  await page.getByRole("button", { name: "Deactivate Ama Ofori (fake)" }).click();
  await expect(page.getByText("Deactivated", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();
});

test("teachers cannot open school setup", async ({ page }) => {
  await signIn(page, "teacher@demo-school.test");
  await page.goto("/setup/staff");
  await expect(page).toHaveURL(/\/forbidden$/);
});
