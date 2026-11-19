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


test("Settings opens sign-in and registration previews without Firebase", async ({ page }) => {
  await page.goto("/#/settings");
  await page.getByRole("link", { name: "Preview sign in" }).click();
  await expect(page).toHaveURL(/preview=sign-in/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Design preview · no account changes")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeHidden();
  await expect(page.locator(".auth-wordmark")).toHaveText("Givvy");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("status").last()).toContainText("no sign-in");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible();

  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/preview=sign-up/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

  await page.getByRole("textbox", { name: "Name" }).fill("Lina");
  await page.getByRole("textbox", { name: "Email" }).fill("test@example.com");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("example-password");
  await page.getByRole("textbox", { name: "Confirm password" }).fill("different-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Passwords don't match");
  await page.getByRole("textbox", { name: "Confirm password" }).fill("example-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status").last()).toContainText("Preview only");
  await page.getByRole("link", { name: "Back to Settings" }).last().click();
  await expect(page).toHaveURL(/#\/settings$/);
});

test("Preview registration and reset password never mutate personal data", async ({ page }) => {
  await page.goto("/#/settings");
  const before = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  await page.getByRole("link", { name: "Preview registration" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill("test@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status").last()).toContainText("no reset email");
  const after = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  expect(after).toBe(before);
});
