import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { seed, fixture } from "./fixtures";
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
          const budget = document.querySelector(".home-budget-section")?.getBoundingClientRect();
          return { cardBottom: card?.bottom ?? 0, budgetTop: budget?.top ?? 0 };
        });
        expect(positions.budgetTop).toBeGreaterThan(positions.cardBottom);
      }
      await page
        .locator("img")
        .evaluateAll((images) =>
          Promise.all(images.map((img) => img.decode().catch(() => {}))),
        );
      const overflowDetails = await page.evaluate(() => {
        const viewport = innerWidth;
        const candidates = Array.from(document.querySelectorAll("*"))
          .map((el) => {
            const box = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              cls: (el.getAttribute("class") || "").slice(0, 80),
              left: Math.round(box.left),
              right: Math.round(box.right),
              parent: (el.parentElement?.getAttribute("class") || "").slice(0, 50),
            };
          })
          .filter((x) => x.right > viewport + 2 || x.left < -2);
        return { viewport, scrollWidth: document.documentElement.scrollWidth, candidates: candidates.slice(-45) };
      });
      if (overflowDetails.scrollWidth > overflowDetails.viewport) {
        console.log(name + " width overflow: " + JSON.stringify(overflowDetails));
      }
      expect(
        overflowDetails.scrollWidth <= overflowDetails.viewport,
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

test("preview empty and filled mobile screenshots", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const directory = process.env.CAPTURE_SCREENSHOTS
    ? "docs/ui-handoff/screenshots"
    : testInfo.outputPath("screenshots");
  await mkdir(directory, { recursive: true });

  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Filled", exact: true }).click();
  await page.goto("/#/");
  await expect(page.locator(".demo-product-sprite").first()).toBeVisible();
  const occasionChips = page.locator(".upcoming-track .occasion-chip");
  await expect(occasionChips).toHaveCount(4);
  // Exact standalone assets, not an atlas. Every image has the same square
  // source bounds and occupies exactly the white tile's content box.
  await occasionChips.locator("img.occ-illustration").evaluateAll((images) =>
    Promise.all(images.map((img) => (img as HTMLImageElement).decode())),
  );
  const uiChecks = await occasionChips.evaluateAll((elements) =>
    elements.map((element) => {
      const bg = getComputedStyle(element).getPropertyValue("--event-start").trim();
      const icon = element.querySelector("img.occ-illustration") as HTMLImageElement | null;
      const base = element.querySelector(".occ-thumb") as HTMLElement;
      const iconRect = icon?.getBoundingClientRect();
      const baseRect = base.getBoundingClientRect();
      const timer = element.querySelector(".occ-count")!.getBoundingClientRect();
      const name = element.querySelector(".occ-name")!.getBoundingClientRect();
      return {
        bg,
        iconSrc: icon?.currentSrc ?? "",
        iconKind: icon?.dataset.artKind ?? "",
        naturalWidth: icon?.naturalWidth ?? 0,
        naturalHeight: icon?.naturalHeight ?? 0,
        iconBase: getComputedStyle(base).backgroundColor,
        centered: !!iconRect &&
          Math.abs(iconRect.left - baseRect.left) <= 1 &&
          Math.abs(iconRect.top - baseRect.top) <= 1 &&
          Math.abs(iconRect.width - baseRect.width) <= 1 &&
          Math.abs(iconRect.height - baseRect.height) <= 1,
        overlap: timer.bottom > name.top + 1 && timer.left < name.right && timer.right > name.left,
      };
    }),
  );
  expect(new Set(uiChecks.map((item) => item.bg)).size).toBe(4);
  expect(uiChecks.map((item) => item.iconKind))
    .toEqual(["birthday", "new-year", "romantic", "celebration"]);
  expect(uiChecks.every((item) =>
    item.iconSrc.includes(".png") &&
    item.naturalWidth === 540 && item.naturalHeight === 540 &&
    item.centered && item.iconBase === "rgb(255, 255, 255)" &&
    !item.overlap,
  )).toBe(true);
  await expect(page.locator(".home-heading")).not.toContainText("Today");
  await expect(page.locator(".home-heading")).not.toContainText("November");
  await expect(page.locator(".home-wordmark")).toBeVisible();
  await expect(page.locator(".home-budget-grid > .home-budget-card")).toHaveCount(2);
  await expect(page.locator(".home-inspiration")).toBeVisible();
  await expect(page.locator(".focus-gifts .status-tag")).toHaveCount(0);
  await expect(page.locator(".focus-gifts .bought-corner").first()).toBeVisible();
  // The headline and product rail share one inset; never float out of alignment.
  const layout = await page.evaluate(() => {
    const left = (selector: string) =>
      document.querySelector(selector)?.getBoundingClientRect().left ?? -1;
    return {
      chip: left(".upcoming-track .occasion-chip"),
      focus: left(".focus-card"),
      title: left(".focus-head h2"),
      product: left(".focus-gifts .product-card"),
    };
  });
  // Feature is truly edge-to-edge, unlike inset Coming up cards.
  expect(layout.focus).toBeGreaterThanOrEqual(-1);
  expect(layout.focus).toBeLessThanOrEqual(1);
  expect(layout.chip - layout.focus).toBeGreaterThan(15);
  expect(layout.chip - layout.focus).toBeLessThan(25);
  // Heading and image strip should still share the same inner content inset.
  expect(Math.abs(layout.title - layout.product), JSON.stringify(layout)).toBeLessThan(3);
  const firstTone = await page.locator(".focus-card")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--event-start").trim());
  await page.screenshot({
    path: `${directory}/home-filled-390.png`,
    fullPage: true, animations: "disabled",
  });
  await page.getByRole("button", { name: /New Year/ }).click();
  await expect(page.locator(".focus-head h2")).toHaveText("New Year");
  const selectedTone = await page.locator(".occasion-chip.is-selected")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--event-start").trim());
  const focusTone = await page.locator(".focus-card")
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--event-start").trim());
  expect(focusTone).toBe(selectedTone);
  expect(focusTone).not.toBe(firstTone);
  await expect(page.locator(".focus-gifts .status-tag")).toHaveCount(0);
  await page.screenshot({
    path: `${directory}/home-filled-newyear-390.png`,
    fullPage: true, animations: "disabled",
  });

  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await page.goto("/#/");
  await expect(page.getByText("Add your first occasion to start planning.")).toBeVisible();
  await page.screenshot({
    path: `${directory}/home-empty-390.png`,
    fullPage: true, animations: "disabled",
  });

  await page.goto("/#/settings");
  await page.screenshot({
    path: `${directory}/preview-settings-390.png`,
    fullPage: true, animations: "disabled",
  });
});

test("gallery shows four sharp independent centered occasion illustrations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("/#/components");
  const icons = page.locator(".illustration-sample img.occ-illustration");
  await expect(icons).toHaveCount(4);
  await icons.evaluateAll((images) => Promise.all(
    images.map((img) => (img as HTMLImageElement).decode())
  ));
  const images = await icons.evaluateAll((elements) => elements.map((el) => {
    const image = el as HTMLImageElement;
    const wrapper = image.parentElement!.getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    return {
      src: image.currentSrc,
      kind: image.dataset.artKind,
      width: image.naturalWidth,
      height: image.naturalHeight,
      centered: Math.abs(rect.left - wrapper.left) <= 1 &&
        Math.abs(rect.top - wrapper.top) <= 1 &&
        Math.abs(rect.width - wrapper.width) <= 1 &&
        Math.abs(rect.height - wrapper.height) <= 1,
    };
  }));
  expect(images.map((x) => x.kind))
    .toEqual(["birthday", "romantic", "new-year", "celebration"]);
  expect(images.every((x) => x.src.includes(".png") &&
    x.width === 540 && x.height === 540 && x.centered)).toBe(true);
  // The PNGs must contain transparency — no baked-in rounded tile.
  const alpha = await icons.evaluateAll(async (elements) => {
    return Promise.all(elements.map(async (el) => {
      const img = el as HTMLImageElement;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const corner = ctx.getImageData(0, 0, 1, 1).data[3];
      const center = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3];
      return {corner, center};
    }));
  });
  expect(alpha.every((a) => a.corner === 0 && a.center > 220)).toBe(true);
});

test("selected occasion animates unless reduced motion is requested", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Filled", exact: true }).click();
  await page.goto("/#/");
  await page.getByRole("button", { name: /New Year/ }).click();
  await expect(page.locator(".focus-head h2")).toHaveText("New Year");
  const animated = await page.locator(".focus-card")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animated).toContain("givvy-featured-change");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.locator(".focus-card")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(reduced).toBe("none");
});

test("calendar QA: four occasions, chosen date and quiet month", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const data = fixture();
  data.events[0].date = "2026-11-28"; // birthday
  data.events[1].date = "2026-11-08"; // New Year (fixture name, earlier date for QA)
  data.events[2].date = "2026-11-18"; // anniversary
  data.events.push({
    ...data.events[2],
    id: "e4",
    date: "2026-11-23",
    name: "Little celebration",
    kind: "holiday",
    image: "",
  });
  data.gifts.push({ ...data.gifts[0], id: "g5", eventId: "e3", status: "bought" });
  await seed(page, data);
  await page.goto("/#/events");
  const directory = process.env.CAPTURE_SCREENSHOTS
    ? "docs/ui-handoff/screenshots"
    : testInfo.outputPath("screenshots");
  await mkdir(directory, { recursive: true });
  await expect(page.locator(".calendar-event-card")).toHaveCount(4);
  await expect(page.locator(".calendar-event-card")).toContainText([
    "1 gift to buy",
    "All gifts bought",
    "No gifts planned yet",
    "2 gifts to buy",
  ]);
  await page.locator(".calendar-event-card img").evaluateAll((images) =>
    Promise.all(images.map((img) => (img as HTMLImageElement).decode().catch(() => {}))),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `${directory}/calendar-populated-390.png`,
    fullPage: true,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "2026-11-28" }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(1);
  await page.screenshot({
    path: `${directory}/calendar-filtered-390.png`,
    fullPage: true,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(0);
  await page.screenshot({
    path: `${directory}/calendar-quiet-month-390.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("Events screen: date-first cards and equal-width Calendar/Planning switch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("/#/events");
  const card = page.locator(".calendar-event-card").first();
  const textOrder = await card.locator(".calendar-event-body").evaluate((body) =>
    Array.from(body.children).map((el) => el.className || el.tagName.toLowerCase()));
  expect(textOrder).toEqual(["calendar-event-date", "strong", "calendar-event-status"]);
  const measure = await page.locator(".events-mode-row").evaluate((row) => {
    const outer = row.getBoundingClientRect();
    const tabs = row.querySelector(".pill-tabs")!.getBoundingClientRect();
    const buttons = Array.from(row.querySelectorAll(".pill-tab")).map((b) => b.getBoundingClientRect());
    return { container: outer.width, group: tabs.width, buttons: buttons.map((b) => b.width) };
  });
  expect(Math.abs(measure.container - measure.group)).toBeLessThan(1);
  expect(Math.abs(measure.buttons[0] - measure.buttons[1])).toBeLessThan(1);
  await page.getByRole("button", { name: "Planning", exact: true }).click();
  await expect(page.locator(".month-block").first()).toBeVisible();
});
