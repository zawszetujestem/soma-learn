import { test, expect } from "@playwright/test";

// Seed test — Risk #5 from context/foundation/test-plan.md:
// "A login/registration change (email as USERNAME_FIELD) locks users out".
// Demonstrates the project's E2E conventions:
//   - role-based locators (getByRole / getByLabel), no CSS selectors
//   - wait for state (URL), never waitForTimeout
//   - single self-contained flow: action -> assertion
//   - risk-linked test name

test("mentor logs in with email and password and reaches the course list", async ({ page }) => {
  await page.goto("/accounts/login/");

  await page.getByLabel("Email").fill("e2e-mentor@example.com");
  await page.getByLabel("Password").fill("E2ePass123!");
  await page.getByRole("button", { name: "Zaloguj" }).click();

  await expect(page).toHaveURL(/\/courses\/$/);
  await expect(page.getByRole("heading", { name: "Kursy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Matematyka — klasa 8" })).toBeVisible();
});
