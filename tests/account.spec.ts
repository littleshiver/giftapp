import { test, expect } from "@playwright/test";

// CI and local tests run without Firebase env vars: the app must stay fully
// usable as a guest and the account screen must explain sign-in isn't ready.
test("without Firebase config the app stays in guest mode", async ({ page }) => {
  await page.goto("/#/account");
  await expect(page.getByRole("heading", { name: "Sign-in isn't available yet" })).toBeVisible();
  await page.goto("/#/onboarding");
  await expect(page.getByRole("link", { name: "I already have an account" })).toHaveCount(0);
  await page.goto("/#/settings");
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toHaveCount(0);
});
test("the account screen has no add button", async ({ page }) => {
  await page.goto("/#/settings");
  await expect(page.locator("button.fab")).toBeVisible();
  await page.goto("/#/account");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("button.fab")).toHaveCount(0);
});
