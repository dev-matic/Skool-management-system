import { expect, test, type Page } from "@playwright/test";

// Demo accounts and FAKE assignments from `pnpm db:seed`.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.configure({ mode: "serial" });

test("admin assigns a teacher and saves", async ({ page }, testInfo) => {
  // Desktop and phone runs happen at the same time, so each edits its own
  // cell (both unassigned in the seed).
  const subject =
    testInfo.project.name === "phone" ? "Creative Arts and Design" : "Career Technology";
  await signIn(page, "024 100 0001");
  await page.goto("/setup/teachers");
  const grid = page.getByRole("group", { name: "Teachers by class and subject" });
  const cell = grid.getByRole("combobox", { name: `JHS 3 ${subject} teacher` });

  // Start from an empty cell, whatever an earlier interrupted run left behind.
  if ((await cell.inputValue()) !== "") {
    await cell.selectOption({ label: "No teacher" });
    await grid.getByRole("button", { name: "Save teachers" }).first().click();
    await expect(grid.getByText("Saved 1 change.")).toBeVisible();
  }

  await cell.selectOption({ label: "Kwabena Frimpong" });
  await expect(grid.getByText("Unsaved changes").first()).toBeVisible();
  await grid.getByRole("button", { name: "Save teachers" }).first().click();
  await expect(grid.getByText("Saved 1 change.")).toBeVisible();
  await expect(cell).toHaveValue(/.+/);

  // Put it back so the demo data stays as seeded.
  await cell.selectOption({ label: "No teacher" });
  await grid.getByRole("button", { name: "Save teachers" }).first().click();
  await expect(grid.getByText("Saved 1 change.")).toBeVisible();
});

test("the class teacher can take every subject in one click", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup/teachers");
  const grid = page.getByRole("group", { name: "Teachers by class and subject" });
  await grid.getByRole("button", { name: "Kwabena Frimpong takes all JHS 1 subjects" }).click();
  for (const subject of ["Mathematics", "French", "Career Technology"]) {
    await expect(
      grid.getByRole("combobox", { name: `JHS 1 ${subject} teacher` }).locator("option:checked"),
    ).toHaveText("Kwabena Frimpong");
  }
  await expect(grid.getByText("Unsaved changes").first()).toBeVisible();
});

test("a teacher sees their own classes on the dashboard", async ({ page }) => {
  await signIn(page, "teacher@demo-school.test");
  const table = page.getByRole("table", { name: "Classes and subjects you teach" });
  const row = table.getByRole("row", { name: /Basic 1/ });
  await expect(row).toContainText("Class teacher");
  await expect(row).toContainText("Mathematics");
});

test("teachers cannot open the assignment screen", async ({ page }) => {
  await signIn(page, "teacher@demo-school.test");
  await page.goto("/setup/teachers");
  await expect(page).toHaveURL(/\/forbidden$/);
});

test("setup pages never scroll sideways; wide grids scroll inside their box", async ({ page }) => {
  await signIn(page, "024 100 0001");
  for (const path of [
    "/setup/years",
    "/setup/classes",
    "/setup/subjects",
    "/setup/teachers",
    "/setup/staff",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
