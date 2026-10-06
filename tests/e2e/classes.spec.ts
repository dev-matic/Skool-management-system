import { expect, test, type Page } from "@playwright/test";

// Demo accounts from `pnpm db:seed`. Classes added here are FAKE and named
// uniquely per run.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const uniqueName = () => `Test ${Math.random().toString(36).slice(2, 7)}`;

test("admin sees this year's classes with class teachers", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup/classes");
  const row = page.getByRole("row", { name: /JHS 2A/ });
  await expect(row).toContainText("JHS 2");
  await expect(row).toContainText("Nana Ama Osei");
});

test("adding a class keeps the form ready for the next one", async ({ page }) => {
  const name = uniqueName();
  await signIn(page, "024 100 0001");
  await page.goto("/setup/classes");
  const form = page.getByRole("form", { name: "Add a class" });
  await form.getByLabel("Class name").fill(name);
  await form.getByLabel("Level").selectOption({ label: "JHS 3" });
  await form.getByRole("button", { name: "Add class" }).click();

  await expect(form.getByText(`${name} added.`)).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  await expect(form.getByLabel("Class name")).toHaveValue("");
  await expect(form.getByLabel("Class name")).toBeFocused();

  // The same name again is refused, next to the field.
  await form.getByLabel("Class name").fill(name);
  await form.getByLabel("Level").selectOption({ label: "JHS 3" });
  await form.getByRole("button", { name: "Add class" }).click();
  await expect(form.getByText(`There is already a class called ${name} this year.`)).toBeVisible();
});

test("deleting a class asks first", async ({ page }) => {
  const name = uniqueName();
  await signIn(page, "024 100 0001");
  await page.goto("/setup/classes");
  const form = page.getByRole("form", { name: "Add a class" });
  await form.getByLabel("Class name").fill(name);
  await form.getByLabel("Level").selectOption({ label: "Basic 1" });
  await form.getByRole("button", { name: "Add class" }).click();
  await expect(form.getByText(`${name} added.`)).toBeVisible();

  await page.getByRole("link", { name: `Edit ${name}` }).click();
  await page.getByRole("button", { name: "Delete class…" }).click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await expect(page).toHaveURL(/\/setup\/classes\?year=/);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
});

test("a school without a year is asked to add one first", async ({ page }) => {
  await signIn(page, "admin@second-demo.test");
  await page.goto("/setup/classes");
  await expect(page.getByText("Add an academic year first")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add KG 1–2, Basic 1–6 and JHS 1–3" }),
  ).toBeVisible();
});
