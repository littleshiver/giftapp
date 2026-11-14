import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { seed } from "./fixtures";
for (const width of [320, 375, 390, 430])
  test(`responsive layouts and interactions at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [],
      failed: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      // Optional web font CDN must not mask regressions in our own assets.
      if (r.url().startsWith("http://127.0.0.1:5173") && r.status() >= 400)
        failed.push(r.url());
    });
    await page.setViewportSize({ width, height: 844 });
    await seed(page);
    const directory = process.env.CAPTURE_SCREENSHOTS
      ? "docs/ui-handoff/screenshots"
      : testInfo.outputPath("screenshots");
    await mkdir(directory, { recursive: true });
    const shots = [
      ["home", "/"],
      ["calendar", "/events"],
      ["planning", "/events?mode=planning"],
      ["event", "/events/e1"],
      ["people", "/people"],
      ["person", "/people/p1"],
      ["ideas", "/ideas"],
      ["settings", "/settings"],
      ["onboarding", "/onboarding?preview=1"],
      ["components", "/components"],
    ];
    for (const [name, route] of shots) {
      await page.goto("/#" + route);
      await expect(page.locator("main")).toBeVisible();
      if (name === "home") {
        // Visual regression anchors: these are approved UX constraints.
        await expect(page.locator(".home-greeting")).toContainText("Hi, Polina");
        await expect(page.locator(".focus-wave")).toBeVisible();
        await expect(page.locator(".home-heading .compact-budget")).toHaveCount(0);
        const positions = await page.evaluate(() => {
          const card = document.querySelector(".focus-card")?.getBoundingClientRect();
          const budget = document.querySelector(".compact-budget")?.getBoundingClientRect();
          return { cardBottom: card?.bottom ?? 0, budgetTop: budget?.top ?? 0 };
        });
        expect(positions.budgetTop).toBeGreaterThan(positions.cardBottom);
      }
      await page
        .locator("img")
        .evaluateAll((images) =>
          Promise.all(images.map((img) => img.decode().catch(() => {}))),
        );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} has no page overflow at ${width}px`,
      ).toBe(true);
      if (name === "home" || width === 390)
        await page.screenshot({
          path: `${directory}/${name}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
    await page.goto("/#/events/e1");
    await page
      .getByRole("button", { name: "Edit Scented candle", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page
        .locator(".sheet")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: `${directory}/gift-editor-${width}.png`,
        animations: "disabled",
      });
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
