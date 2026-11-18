import { fixture } from "./fixtures";
import { test, expect, chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";

// Test the real production build, served below the GitHub project path.
// Build first: npm run build && npm test.
test("Pages production assets, hash routes, editing and reload on mobile", async () => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4174",
      "--strictPort",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (process.env.CI ? undefined : "/usr/bin/chromium"),
    args: ["--no-sandbox"],
  });
  try {
    await expect
      .poll(async () => {
        if (server.exitCode !== null) throw Error(output);
        try {
          return (await fetch("http://127.0.0.1:4174/giftapp/")).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    const errors: string[] = [];
    const failedAssets: string[] = [];
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
    await page.addInitScript((data) => {
      if (!localStorage.getItem("givvy_dashboard_v3"))
        localStorage.setItem(
          "givvy_dashboard_v3",
          JSON.stringify({ version: 3, data }),
        );
    }, fixture());
    page.on("pageerror", (error) => errors.push(error.message));
    // External font CDN is optional; only same-origin assets can break this app.
    const ownOrigin = "http://127.0.0.1:4174";
    page.on("response", (response) => {
      if (response.url().startsWith(ownOrigin) && response.status() >= 400)
        failedAssets.push(response.url());
    });
    page.on("requestfailed", (request) => {
      if (request.url().startsWith(ownOrigin))
        failedAssets.push(request.url());
    });
    await page.goto("http://127.0.0.1:4174/giftapp/");
    await expect(
      page.getByRole("heading", { name: /Hi, Polina/i }),
    ).toBeVisible();
    const assets = await page
      .locator('script[src],link[rel="stylesheet"]')
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("src") || el.getAttribute("href")),
      );
    expect(assets.length).toBeGreaterThanOrEqual(2);
    expect(assets.filter((path) => path?.startsWith("/")).every((path) =>
      path?.startsWith("/giftapp/assets/")
    )).toBe(true);
    for (const name of ["Events", "People", "Ideas", "Home"]) {
      await page
        .getByRole("navigation")
        .getByRole("link", { name, exact: true })
        .click();
      expect(new URL(page.url()).pathname).toBe("/giftapp/");
      if (name === "Home") {
        // The greeting is intentionally dismissed after a client-side revisit.
        await expect(page.locator(".home-wordmark")).toBeVisible();
      } else {
        await expect(page.locator("h1")).toBeVisible();
      }
    }
    await page.goto("http://127.0.0.1:4174/giftapp/#/people");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("button", { name: "Add person" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Pages mobile test");
    await page
      .getByRole("button", { name: "Save person", exact: true })
      .click();
    await page.getByRole("link", { name: /Pages mobile test/ }).click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Pages mobile test", level: 1 }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("http://127.0.0.1:4174/giftapp/#/components");
    await expect(
      page.getByRole("heading", { name: "Component library" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Hi, Polina/i }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
  } finally {
    await browser.close();
    if (server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
  }
});
