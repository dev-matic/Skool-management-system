import { expect, test, type Locator, type Page } from "@playwright/test";

// Demo accounts and the FAKE demo timetable from `pnpm db:seed`.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

/** Chooses a subject whose menu label starts with `name` (busy teachers get a note). */
async function chooseSubject(select: Locator, name: string) {
  const value = await select
    .locator("option", { hasText: new RegExp(`^${name}`) })
    .getAttribute("value");
  await select.selectOption(value!);
}

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("a teacher sees their week and today's classes, read-only", async ({ page }) => {
  await signIn(page, "teacher@demo-school.test");
  await expect(page.getByRole("heading", { name: "Today's classes" })).toBeVisible();
  await page.goto("/timetable");
  await expect(page.getByRole("heading", { name: "My timetable" })).toBeVisible();
  const grid = page.getByRole("table", { name: /My timetable/ });
  await expect(grid.getByText("Basic 1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /subject$/ })).toHaveCount(0);

  // Their own class opens read-only; editing pages are refused.
  await page.goto("/timetable/classes");
  await page.getByRole("link", { name: "Basic 1" }).click();
  await expect(page.getByRole("heading", { name: "Basic 1 timetable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save timetable" })).toHaveCount(0);
  await page.goto("/timetable/plans");
  await expect(page).toHaveURL(/\/forbidden$/);
});

test("a teacher cannot open a class they do not teach", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/timetable/classes");
  const href = await page.getByRole("link", { name: "JHS 2B" }).getAttribute("href");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, "teacher@demo-school.test");
  const response = await page.goto(href!);
  expect(response?.status()).toBe(404);
});

test("saving a lesson that double-books a teacher names the clash", async ({ page }, testInfo) => {
  // Desktop and phone runs happen at the same time, so each uses its own day.
  const day = testInfo.project.name === "phone" ? "Wednesday" : "Monday";
  await signIn(page, "024 100 0001");
  const openClass = async (name: string) => {
    await page.goto("/timetable/classes");
    await page.getByRole("link", { name }).click();
    return page.getByRole("group", { name: `${name} timetable` });
  };
  const editor = await openClass("JHS 2A");
  const cell = editor.getByRole("combobox", { name: `JHS 2A ${day} Period 1 subject` });
  const original = await cell.inputValue();
  const originalLabel = (await cell.locator("option:checked").textContent())?.trim() ?? "";
  let changed = false;

  // Make sure Kwame Darko (Mathematics) teaches JHS 2A in this period.
  if (!originalLabel.startsWith("Mathematics")) {
    await chooseSubject(cell, "Mathematics");
    await expect(editor.getByText("Unsaved changes").first()).toBeVisible();
    await editor.getByRole("button", { name: "Save timetable" }).first().click();
    const clash = editor.getByText(/Kwame Darko is already teaching/).first();
    const saved = editor.getByText("Saved 1 lesson.");
    await expect(clash.or(saved)).toBeVisible();
    if (await clash.isVisible()) {
      // He is busy elsewhere then: that clash is named, and nothing is saved.
      await expect(editor.getByText(/Nothing was saved/)).toBeVisible();
      return;
    }
    changed = true;
  }

  // JHS 2B cannot have him at the same time.
  const other = await openClass("JHS 2B");
  const otherCell = other.getByRole("combobox", { name: `JHS 2B ${day} Period 1 subject` });
  // The menu already warns that he is busy with JHS 2A.
  await expect(
    otherCell.locator("option", { hasText: "Mathematics · Kwame Darko busy (JHS 2A)" }),
  ).toHaveCount(1);
  await chooseSubject(otherCell, "Mathematics");
  await other.getByRole("button", { name: "Save timetable" }).first().click();
  await expect(
    other.getByText(/Kwame Darko is already teaching JHS 2A \(Mathematics\)/).first(),
  ).toBeVisible();
  await expect(other.getByText(/Nothing was saved/)).toBeVisible();
  // The clashing cell is marked too.
  await expect(otherCell.locator("xpath=ancestor::td").getByText(/already teaching/)).toBeVisible();

  if (changed) {
    // Put JHS 2A back as seeded.
    const again = await openClass("JHS 2A");
    await again
      .getByRole("combobox", { name: `JHS 2A ${day} Period 1 subject` })
      .selectOption(original);
    await again.getByRole("button", { name: "Save timetable" }).first().click();
    await expect(again.getByText("Saved 1 lesson.")).toBeVisible();
  }
});

test("the whole-school view filters by class and day", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/timetable");
  await expect(page.getByRole("heading", { name: "Whole school" })).toBeVisible();
  const filters = page.getByRole("form", { name: "Filter lessons" });
  await filters.getByLabel("Day").selectOption({ label: "Whole week" });
  await filters.getByLabel("Class").selectOption({ label: "KG 1" });
  await filters.getByRole("button", { name: "Show" }).click();
  await expect(filters.getByText("25 lessons")).toBeVisible();
  const table = page.getByRole("table", { name: /Lessons/ });
  await expect(table.getByRole("link", { name: "KG 1" }).first()).toBeVisible();
  await expect(table.getByRole("link", { name: "Basic 1" })).toHaveCount(0);
});

test("a day plan with impossible times is refused, naming the row", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/timetable/plans");
  await page.getByRole("link", { name: "Add day plan" }).click();
  await expect(page.getByRole("heading", { name: "Add day plan" })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Test day (not saved)");
  await page.getByLabel("Period 1 starts").fill("10:00");
  await page.getByLabel("Period 1 ends").fill("9:00");
  await page.getByRole("button", { name: "Save day plan" }).click();
  await expect(page.getByText("Period 1 must end after it starts.")).toBeVisible();

  // Fixing the time and adding a row starts it when the first one ends.
  await page.getByLabel("Period 1 ends").fill("10:40");
  await page.getByRole("button", { name: "Add lesson period" }).click();
  await expect(page.getByLabel("Period 2 starts")).toHaveValue("10:40");
  await expect(page.getByLabel("Period 2 ends")).toHaveValue("11:20");
});
