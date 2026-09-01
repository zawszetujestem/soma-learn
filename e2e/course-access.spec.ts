import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

// Risk #2 from context/foundation/test-plan.md:
// "A user opens a course they are not entitled to by swapping an id".
// The stranger mentor (logged in via storageState) must get 403 when opening
// another mentor's course instance.

const seedState = JSON.parse(readFileSync("e2e/.seed-state.json", "utf-8")) as {
  instance_pk: number;
};

test("stranger mentor is forbidden from opening another mentor's course instance", async ({
  page,
}) => {
  const response = await page.goto(`/courses/${seedState.instance_pk}/`);

  expect(response?.status()).toBe(403);
});
