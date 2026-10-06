import { expect, test, type Page } from "@playwright/test";

// Demo accounts from `pnpm db:seed`. Subjects added here are FAKE and named
// uniquely per run.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function addSubject(page: Page, name: string) {
  const form = page.getByRole("form", { name: "Add a subject" });
  await form.getByLabel("Subject name").fill(name);
  await form.getByRole("button", { name: "Add subject" }).click();
  return form;
}

test("tick a subject for a class, save, then untick it", async ({ page }) => {
  const name = `Test ${Math.random().toString(36).slice(2, 7)}`;
  await signIn(page, "024 100 0001");
  await page.goto("/setup/subjects");
  const form = await addSubject(page, name);
  await expect(form.getByText(`${name} added.`)).toBeVisible();

  const grid = page.getByRole("group", { name: "Subjects by class" });
  const box = grid.getByRole("checkbox", { name: `JHS 1: ${name}` });
  await box.check();
  await expect(grid.getByText("Unsaved changes").first()).toBeVisible();
  await grid.getByRole("button", { name: "Save subjects by class" }).first().click();
  await expect(grid.getByText("Saved: 1 added.")).toBeVisible();
  const list = page.getByRole("table", { name: "Subjects the school teaches" });
  await expect(list.getByRole("row", { name: new RegExp(name) })).toContainText("1");

  await grid.getByRole("checkbox", { name: `JHS 1: ${name}` }).uncheck();
  await grid.getByRole("button", { name: "Save subjects by class" }).first().click();
  await expect(grid.getByText("Saved: 1 removed.")).toBeVisible();
});

test("clicking a subject name ticks it for every class", async ({ page }) => {
  const name = `Test ${Math.random().toString(36).slice(2, 7)}`;
  await signIn(page, "024 100 0001");
  await page.goto("/setup/subjects");
  await addSubject(page, name);
  const grid = page.getByRole("group", { name: "Subjects by class" });
  await grid.getByRole("button", { name, exact: true }).click();
  await expect(grid.getByRole("checkbox", { name: `KG 1: ${name}` })).toBeChecked();
  await expect(grid.getByRole("checkbox", { name: `JHS 3: ${name}` })).toBeChecked();
  await expect(grid.getByText("Unsaved changes").first()).toBeVisible();
});

test("a duplicate subject name is refused", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup/subjects");
  const form = await addSubject(page, "mathematics");
  await expect(form.getByText("There is already a subject called mathematics.")).toBeVisible();
});
