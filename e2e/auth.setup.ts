import { test as setup, expect } from "@playwright/test";

setup("log in as stranger mentor and save session", async ({ page }) => {
  await page.goto("/accounts/login/");
  await page.getByLabel("Email").fill("e2e-stranger@example.com");
  await page.getByLabel("Password").fill("E2ePass123!");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(page).toHaveURL(/\/courses\/$/);
  await page.context().storageState({ path: "e2e/.auth/stranger.json" });
});
