import { expect, test, type Page } from "@playwright/test";

// Demo accounts from `pnpm db:seed`. Years added here are FAKE and far in the
// future so they never clash with the demo year.
const PASSWORD = process.env.SEED_PASSWORD || "demo-password-2026";

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Phone number or email").fill(identifier);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("the top bar shows the current term", async ({ page }) => {
  await signIn(page, "teacher@demo-school.test");
  await expect(page.getByTestId("current-term")).toContainText(/Term \d, \d{4}\/\d{4}|Holiday/);
});

test("admin sees this year's terms with the current one marked", async ({ page }) => {
  await signIn(page, "024 100 0001");
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/setup\/years$/);
  await expect(page.getByRole("heading", { name: /\d{4}\/\d{4}/ }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Term 1", exact: true }).first()).toBeVisible();
});

test("adding a year explains bad dates, then saves", async ({ page }) => {
  const start = 2100 + Math.floor(Math.random() * 800);
  await signIn(page, "024 100 0001");
  await page.goto("/setup/years/new");

  await page.getByLabel("Starts").first().fill(`07/09/${start}`);
  await page
    .getByLabel("Ends")
    .first()
    .fill(`23/07/${start + 1}`);
  await page.getByLabel("Name").first().click();
  await expect(page.getByLabel("Name").first()).toHaveValue(`${start}/${start + 1}`);

  const term = (n: number) => page.getByRole("group", { name: `Term ${n}` });
  await term(1).getByLabel("Starts").fill(`07/09/${start}`);
  await term(1).getByLabel("Ends").fill(`31/02/${start}`);
  await term(2)
    .getByLabel("Starts")
    .fill(`11/01/${start + 1}`);
  await term(2)
    .getByLabel("Ends")
    .fill(`09/04/${start + 1}`);
  await term(3)
    .getByLabel("Starts")
    .fill(`01/04/${start + 1}`);
  await term(3)
    .getByLabel("Ends")
    .fill(`23/07/${start + 1}`);
  await page.getByRole("button", { name: "Save academic year" }).click();
  await expect(page.getByText("Enter a date as dd/mm/yyyy")).toBeVisible(); // 31/02 is not a real date

  await term(1).getByLabel("Ends").fill(`11/12/${start}`);
  await page.getByRole("button", { name: "Save academic year" }).click();
  await expect(page.getByText("Term 3 must start after Term 2 ends (09/04/")).toBeVisible();

  await term(3)
    .getByLabel("Starts")
    .fill(`26/04/${start + 1}`);
  await page.getByRole("button", { name: "Save academic year" }).click();
  await expect(page).toHaveURL(/\/setup\/years\?saved=/);
  await expect(page.getByText(`${start}/${start + 1} saved.`)).toBeVisible();
});

test("a school with no terms is pointed to setup", async ({ page }) => {
  await signIn(page, "admin@second-demo.test");
  await expect(page.getByTestId("current-term")).toHaveText("Set up this year's terms");
});
