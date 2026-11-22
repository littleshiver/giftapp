import { test, expect } from "@playwright/test";

// UI tests normally use a dev-only fake session. Opt out to test real gating.
test("without a Firebase session all app routes require authentication", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("givvy_e2e_require_auth", "1"));
  await page.goto("/#/people");
  await expect(page).toHaveURL(/welcome/);
  await expect(page.getByRole("heading", { name: "All your gifts, in one place." })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator(".person-gallery-card")).toHaveCount(0);
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Sign-in is temporarily unavailable" })).toBeVisible();
  await expect(page.locator(".bottom-nav, .create-menu")).toHaveCount(0);
});
test("deep links and preview links cannot bypass the auth gate", async ({page}) => {
  await page.addInitScript(() => sessionStorage.setItem("givvy_e2e_require_auth", "1"));
  for (const path of ["/settings","/events/e1","/onboarding?preview=1","/components"]) {
    await page.goto("/#" + path);
    await expect(page.getByRole("heading", {name:"All your gifts, in one place."})).toBeVisible();
  }
  await page.goto("/#/account?preview=sign-up");
  await expect(page.getByRole("heading", {name:"Sign-in is temporarily unavailable"})).toBeVisible();
  await expect(page.getByText("Design preview · no account changes")).toHaveCount(0);
});
test("the account screen has no add button", async ({ page }) => {
  await page.goto("/#/settings");
  await expect(page.locator("button.fab")).toHaveCount(0);
  await page.goto("/#/account");
  await expect(page.getByRole("heading", {name:"Account",exact:true})).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("button", {name:/Name/})).toBeVisible();
  await page.getByRole("button",{name:/Name/}).click();
  await expect(page.getByRole("dialog",{name:"Your name"})).toBeVisible();
  await page.getByRole("dialog").getByRole("button",{name:"Cancel"}).click();
  await expect(page.locator("button.fab")).toHaveCount(0);
});


test("Settings opens sign-in and registration previews without Firebase", async ({ page }) => {
  await page.goto("/#/settings");
  await page.goto("/#/settings/developer");
  await page.goto("/#/account?preview=sign-in");
  await expect(page).toHaveURL(/preview=sign-in/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Design preview · no account changes")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeHidden();
  await expect(page.locator(".auth-brand .home-wordmark")).toHaveText("givvy");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("status").last()).toContainText("Google sign-in wasn\'t started");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible();

  await page.locator("[data-ph=account-switch-mode]").click();
  await expect(page).toHaveURL(/preview=sign-up/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  await page.getByRole("textbox", { name: "Name" }).fill("Lina");
  await page.getByRole("textbox", { name: "Email" }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("example-password");
  await page.getByLabel("Confirm password").fill("different-password");
  await page.locator("[data-ph=account-email-sign-up]").click();
  await expect(page.getByRole("alert")).toContainText("Passwords don't match");
  await page.getByRole("textbox", { name: "Confirm password" }).fill("example-password");
  await page.locator("[data-ph=account-email-sign-up]").click();
  await expect(page.getByRole("status").last()).toContainText("Preview only");
  await page.getByRole("link", { name: "Back to Settings" }).last().click();
  await expect(page).toHaveURL(/#\/settings$/);
});

test("Preview registration and reset password never mutate personal data", async ({ page }) => {
  await page.goto("/#/settings");
  const before = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  await page.goto("/#/settings/developer");
  await page.goto("/#/account?preview=sign-up");
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


test("Auth forms fit short phone viewport with the shared logo and no redundant data note",async ({page})=>{
  for(const size of [{width:390,height:844},{width:320,height:667}]){
    await page.setViewportSize(size);
    for(const flow of ["sign-in","sign-up"]){
      await page.goto("/#/account?preview="+flow);
      await expect(page.locator(".auth-brand .home-wordmark-spark")).toHaveCount(1);
      await expect(page.locator(".auth-guest-note")).toHaveCount(0);
      const bounds=await page.evaluate(()=>{
        const panel=document.querySelector(".auth-panel")!.getBoundingClientRect();
        const brand=document.querySelector(".auth-brand")!.getBoundingClientRect();
        return {panelBottom:panel.bottom,brandTop:brand.top,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
      });
      expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewport+1);
      expect(bounds.brandTop).toBeGreaterThanOrEqual(0);
      expect(bounds.panelBottom).toBeLessThanOrEqual(size.height+1);
    }
  }
});

test("Sign-in and registration have bottom-anchored sheets with a curved padded top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const screen of ["sign-in", "sign-up"]) {
    await page.goto("/#/account?preview=" + screen);
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const sheet = rect(".auth-bottom-sheet");
      const logo = rect(".auth-brand");
      const wave = rect(".auth-wave");
      const form = rect(".auth-panel");
      return {
        bottomSpace: innerHeight - sheet.bottom,
        emptySpace: wave.top - logo.bottom,
        waveBottom: wave.bottom,
        formTop: form.top,
        panelPadding: parseFloat(getComputedStyle(document.querySelector(".auth-panel")!).paddingTop),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(Math.abs(geometry.bottomSpace)).toBeLessThanOrEqual(2);
    expect(geometry.emptySpace).toBeGreaterThan(28);
    expect(geometry.panelPadding).toBeGreaterThanOrEqual(17);
    expect(geometry.formTop).toBeGreaterThanOrEqual(geometry.waveBottom - 2);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
  }
});
