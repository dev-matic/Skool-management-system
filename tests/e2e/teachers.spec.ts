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

test("saving still works after someone else removes a subject meanwhile", async ({
  page,
  browser,
}) => {
  // Two FAKE subjects for JHS 1, named uniquely per run.
  const id = Math.random().toString(36).slice(2, 7);
  const [gone, kept] = [`Gone ${id}`, `Kept ${id}`];
  await signIn(page, "024 100 0001");
  await page.goto("/setup/subjects");
  const addForm = page.getByRole("form", { name: "Add a subject" });
  const subjectsGrid = page.getByRole("group", { name: "Subjects by class" });
  for (const name of [gone, kept]) {
    await addForm.getByLabel("Subject name").fill(name);
    await addForm.getByRole("button", { name: "Add subject" }).click();
    await expect(addForm.getByText(`${name} added.`)).toBeVisible();
    await subjectsGrid.getByRole("checkbox", { name: `JHS 1: ${name}` }).check();
  }
  await subjectsGrid.getByRole("button", { name: "Save subjects by class" }).first().click();
  await expect(subjectsGrid.getByText("Saved: 2 added.")).toBeVisible();

  await page.goto("/setup/teachers");
  const grid = page.getByRole("group", { name: "Teachers by class and subject" });
  await expect(grid.getByRole("combobox", { name: `JHS 1 ${gone} teacher` })).toBeVisible();

  // Another admin takes the first subject off JHS 1 while this page is open.
  const other = await browser.newPage();
  await signIn(other, "024 100 0001");
  await other.goto("/setup/subjects");
  const otherGrid = other.getByRole("group", { name: "Subjects by class" });
  await otherGrid.getByRole("checkbox", { name: `JHS 1: ${gone}` }).uncheck();
  await otherGrid.getByRole("button", { name: "Save subjects by class" }).first().click();
  await expect(otherGrid.getByText("Saved: 1 removed.")).toBeVisible();

  await grid
    .getByRole("combobox", { name: `JHS 1 ${kept} teacher` })
    .selectOption({ label: "Kwabena Frimpong" });
  await grid.getByRole("button", { name: "Save teachers" }).first().click();
  await expect(grid.getByText("Saved 1 change.")).toBeVisible();
  await expect(grid.getByRole("combobox", { name: `JHS 1 ${gone} teacher` })).toHaveCount(0);

  // Leave JHS 1 as seeded.
  await otherGrid.getByRole("checkbox", { name: `JHS 1: ${kept}` }).uncheck();
  await otherGrid.getByRole("button", { name: "Save subjects by class" }).first().click();
  await expect(otherGrid.getByText("Saved: 1 removed.")).toBeVisible();
  await other.close();
});

test("the class teacher can take every subject in one click", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup/teachers");
  const grid = page.getByRole("group", { name: "Teachers by class and subject" });
  // One table per stage, each with a stage-wide shortcut.
  await expect(grid.getByRole("heading", { name: /^KG/ })).toBeVisible();
  await expect(
    grid.getByRole("button", { name: "Class teachers take all JHS subjects" }),
  ).toBeVisible();
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
