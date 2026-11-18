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
      ["reminders", "/events?mode=reminders"],
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
      // Images outside the clipped horizontal carousels are lazy-loaded.
      // Decoding an image that hasn't started loading can hang indefinitely.
      await page.locator("img").evaluateAll((images) =>
        Promise.all(images
          .filter((img) => img.loading !== "lazy" || img.complete)
          .map((img) => img.decode().catch(() => {}))),
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
  await expect(page.locator(".focus-gifts .gift-status-icon.is-bought").first()).toBeVisible();
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

test("Events screen: date-first cards and equal-width Calendar/Reminders switch", async ({ page }) => {
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
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(page.locator(".month-block").first()).toBeVisible();
  await expect(page.locator(".reminders-month .section-note")).toHaveCount(0);
  await expect(page.locator(".reminder-event")).toHaveCount(3);
});

test("shared gift card stays consistent in group occasions and the saved-idea picker", async ({ page }, testInfo) => {
  const directory = testInfo.outputPath("screenshots");
  await mkdir(directory, { recursive: true });
  await seed(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/events/e2");
    await expect(page.locator(".event-recipient-group")).toHaveCount(3);
    const groupBackground = await page.locator(".event-recipient-group").first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(groupBackground).toBe("rgba(0, 0, 0, 0)");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `${directory}/event-group-${width}.png`,
      fullPage: true, animations: "disabled",
    });
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("button", { name: "Add gift to occasion" }).click();
    await page.getByRole("dialog", { name: "Choose recipient" })
      .getByRole("button", { name: "Anna" }).click();
    const chooser = page.getByRole("dialog", { name: "Gift for Anna" });
    await expect(chooser.locator(".gift-card.is-idea")).toHaveCount(1);
    await expect(chooser.locator(".gift-status-icon")).toHaveCount(0);
    await expect(chooser.getByRole("button", { name: "Use idea Ceramic mug" })).toBeVisible();
    await page.screenshot({
      path: `${directory}/idea-picker-${width}.png`,
      fullPage: true, animations: "disabled",
    });
    await chooser.getByRole("button", { name: "Close", exact: true }).click();
  }
});

test("filled People gallery and portrait profile visual QA at 320 and 390", async ({page}, testInfo) => {
  const directory = testInfo.outputPath("screenshots");
  await mkdir(directory, {recursive:true});
  await seed(page);
  await page.goto("/#/settings");
  await page.getByRole("button", {name:"Filled",exact:true}).click();
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    await page.goto("/#/people");
    await expect(page.locator(".person-gallery-card")).toHaveCount(10);
    await expect(page.locator(".demo-person-sprite")).toHaveCount(4);
    await expect(page.locator(".person-gallery-hint")).toHaveCount(0);
    const geometry = await page.locator(".people-gallery-grid").evaluate((grid) => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const heights = Array.from(grid.querySelectorAll(".person-gallery-card"))
        .map(card => card.getBoundingClientRect().height);
      return {columns, heightDifference:Math.max(...heights)-Math.min(...heights),
        overflow:document.documentElement.scrollWidth-innerWidth};
    });
    expect(geometry.columns).toBe(3);
    expect(geometry.heightDifference).toBeLessThanOrEqual(1);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path:`${directory}/people-filled-${width}.png`,
      fullPage:true,animations:"disabled",
    });
    await page.locator(".person-gallery-card").filter({has:page.getByText("Mira",{exact:true})}).click();
    await expect(page.locator(".person-profile-photo .demo-person-sprite")).toBeVisible();
    await expect(page.locator(".person-guidance-positive")).toBeVisible();
    await expect(page.locator(".person-guidance-negative")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth-innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path:`${directory}/person-filled-${width}.png`,
      fullPage:true,animations:"disabled",
    });
  }
  await page.goto("/#/settings");
  await page.getByRole("button", {name:"Empty",exact:true}).click();
  await page.goto("/#/people");
  await expect(page.locator(".person-gallery-card")).toHaveCount(0);
  await page.screenshot({
    path:`${directory}/people-empty-390.png`,
    fullPage:true,animations:"disabled",
  });
});

test("Variant C profile with portrait and preferences at mobile widths", async ({ page }, testInfo) => {
  const dir = testInfo.outputPath("screenshots");
  await mkdir(dir, { recursive: true });
  await seed(page);
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Filled", exact: true }).click();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/people");
    await page.locator(".person-gallery-card")
      .filter({has: page.getByText("Mira", { exact:true })}).click();
    const cover = page.locator(".person-profile-cover");
    await expect(cover.locator(".demo-person-sprite")).toBeVisible();
    await expect(page.locator(".person-photo-back")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit person" })).toBeVisible();
    await expect(page.locator(".person-profile-panel")).toContainText("Mira");
    await expect(page.locator(".person-guidance-positive")).toBeVisible();
    await expect(page.locator(".person-guidance-negative")).toBeVisible();
    await expect(page.locator(".person-ideas .gift-card")).toHaveCount(1);
    const measures = await cover.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const panel = document.querySelector(".person-profile-panel")!.getBoundingClientRect();
      const shell = document.querySelector(".app-shell")!.getBoundingClientRect();
      const birthday = el.querySelector(".person-profile-birthday")!.getBoundingClientRect();
      const rows = Array.from(document.querySelectorAll(".person-gift-guidance > .person-guidance"))
        .map(row => row.getBoundingClientRect());
      return {
        ratio: r.width / r.height,
        noTopGap: Math.abs(r.top - shell.top) < 1,
        fullBleedPhoto: Math.abs(shell.width - r.width) < 1 && Math.abs(shell.left - r.left) < 1,
        fullBleedWhitePanel: Math.abs(shell.width - panel.width) < 1 && Math.abs(shell.left - panel.left) < 1,
        birthdayAboveWhite: birthday.bottom < panel.top,
        birthdayCentered: Math.abs((birthday.left + birthday.right) / 2 - (r.left + r.right) / 2) < 1,
        overlap: r.bottom - panel.top,
        columns: getComputedStyle(document.querySelector(".person-gift-guidance")!).gridTemplateColumns.split(" ").length,
        stackedWideRows: rows.length === 2 && rows[1].top > rows[0].bottom &&
          Math.abs(rows[0].width - rows[1].width) < 1,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(measures.ratio).toBeCloseTo(1, 2);
    expect(measures.noTopGap).toBe(true);
    expect(measures.birthdayCentered).toBe(true);
    expect(measures.fullBleedPhoto).toBe(true);
    expect(measures.fullBleedWhitePanel).toBe(true);
    expect(measures.birthdayAboveWhite).toBe(true);
    expect(measures.overlap).toBeGreaterThan(15);
    expect(measures.columns).toBe(1);
    expect(measures.stackedWideRows).toBe(true);
    expect(measures.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `${dir}/person-variant-c-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});

test("Gifted history uses the same gift card and stays compact on mobile", async ({page}, testInfo) => {
  const dir = testInfo.outputPath("screenshots");
  await mkdir(dir,{recursive:true});
  const data = fixture();
  data.events[0].date = "2026-11-10";
  await seed(page,data);
  for (const width of [320,390]) {
    await page.setViewportSize({width,height:844});
    await page.goto("/#/people/p1");
    await page.getByRole("button",{name:"Gifted",exact:true}).click();
    await expect(page.locator(".person-gift-collection .gift-card")).toHaveCount(1);
    await expect(page.getByRole("button",{name:"Edit gift Scented candle"})).toBeVisible();
    await expect(page.locator(".person-gift-collection button.gift-status-icon")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path:`${dir}/person-gifted-${width}.png`,
      fullPage:true,animations:"disabled"
    });
  }
});

test("Discover / Saved and both standard sheets are mobile-safe at 320 and 390", async ({ page }, testInfo) => {
  const directory = testInfo.outputPath("screenshots");
  await mkdir(directory, { recursive: true });
  await seed(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/ideas");
    // The app intentionally remembers the selected tab while the route stays
    // mounted; switch back explicitly for the second viewport iteration.
    await page.getByRole("button", {name:"Discover",exact:true}).click();
    await expect(page.getByRole("button", {name:"Discover",exact:true})).toHaveAttribute("aria-pressed","true");
    await expect(page.locator(".ideas-discovery-photo")).toBeVisible();
    await expect(page.getByRole("button", {name:"Like idea",exact:true})).toBeVisible();
    const layout = await page.locator(".ideas-discovery-card").evaluate(async card => {
      const image = card.querySelector("img")!;
      await image.decode();
      const rect = image.getBoundingClientRect();
      return { imageWidth: rect.width, sourceWidth: image.naturalWidth,
        overflow:document.documentElement.scrollWidth-innerWidth };
    });
    expect(layout.imageWidth).toBeGreaterThan(140);
    expect(layout.sourceWidth).toBeGreaterThan(350);
    expect(layout.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${directory}/ideas-discover-${width}.png`,
      fullPage:true, animations:"disabled" });

    await page.getByRole("button",{name:"Filters"}).click();
    await expect(page.getByRole("dialog",{name:"Filters"})).toBeVisible();
    await page.screenshot({ path: `${directory}/ideas-filters-${width}.png`,
      fullPage:true, animations:"disabled" });
    await page.getByRole("dialog",{name:"Filters"}).getByRole("button",{name:"Close",exact:true}).click();

    await page.getByRole("button",{name:"Like idea",exact:true}).click();
    const picker = page.getByRole("dialog",{name:"Save this idea for who?"});
    await expect(picker.getByRole("button",{name:/Anyone/})).toBeVisible();
    await expect(picker.getByRole("button",{name:"Anna"})).toBeVisible();
    await page.screenshot({ path: `${directory}/ideas-choose-recipient-${width}.png`,
      fullPage:true, animations:"disabled" });
    await picker.getByRole("button",{name:"Close",exact:true}).click();

    await page.getByRole("button",{name:"Saved",exact:true}).click();
    await expect(page.locator(".ideas-saved-grid .gift-card.is-idea")).toHaveCount(1);
    await expect(page.locator(".ideas-saved-grid .gift-status-icon")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${directory}/ideas-saved-${width}.png`,
      fullPage:true, animations:"disabled" });
  }
});

test("Discover reactions stay above bottom navigation, even on short phones with filters", async ({ page }, testInfo) => {
  const directory = testInfo.outputPath("screenshots");
  await mkdir(directory, { recursive: true });
  await seed(page);
  for (const viewport of [{width:320,height:667}, {width:390,height:844}, {width:430,height:932}]) {
    await page.setViewportSize(viewport);
    await page.goto("/#/ideas");
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await expect(page.getByRole("button", { name: "Create", exact: true })).toHaveCount(0);
    const metrics = await page.evaluate(async () => {
      const image = document.querySelector(".ideas-discovery-photo") as HTMLImageElement;
      await image.decode();
      const reaction = document.querySelector(".ideas-reactions")!.getBoundingClientRect();
      const nav = document.querySelector(".bottom-nav")!.getBoundingClientRect();
      const stage = document.querySelector(".ideas-swipe-stage")!.getBoundingClientRect();
      return {
        sourceWidth: image.naturalWidth,
        spaceBeforeNav: nav.top - reaction.bottom,
        reactionsWithinStage: reaction.left >= stage.left && reaction.right <= stage.right,
        wavePath: document.querySelector(".ideas-stage-wave path")?.getAttribute("d"),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(metrics.sourceWidth).toBeGreaterThanOrEqual(1200);
    expect(metrics.spaceBeforeNav).toBeGreaterThanOrEqual(10);
    expect(metrics.reactionsWithinStage).toBe(true);
    expect(metrics.wavePath).toContain("M0 48 Q0 26 24 20");
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `${directory}/discover-safe-${viewport.width}x${viewport.height}.png`,
      fullPage: true, animations: "disabled",
    });
  }
});

test("Four active filters scroll sideways instead of wrapping or pushing Discover beneath the nav", async ({page}, testInfo) => {
  const dir = testInfo.outputPath("screenshots");
  await mkdir(dir, {recursive:true});
  await seed(page);
  await page.setViewportSize({width:320,height:667});
  await page.goto("/#/ideas");
  await page.getByRole("button",{name:"Filters"}).click();
  const sheet = page.getByRole("dialog",{name:"Filters"});
  await sheet.getByRole("combobox",{name:"Age"}).selectOption("adult");
  await sheet.getByRole("combobox",{name:"Relationship"}).selectOption("friend");
  await sheet.getByRole("combobox",{name:"Category"}).selectOption("home");
  await sheet.getByRole("combobox",{name:"Budget"}).selectOption("mid");
  await sheet.getByRole("button",{name:"Apply filters"}).click();
  await expect(page.locator(".ideas-filter-chip")).toHaveCount(4);
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  const geometry = await page.evaluate(() => {
    const toolbar = document.querySelector(".ideas-filter-toolbar")!.getBoundingClientRect();
    const chipsEl = document.querySelector(".ideas-active-filters") as HTMLElement;
    const chips = [...chipsEl.children].map(chip => chip.getBoundingClientRect());
    const nav = document.querySelector(".bottom-nav")!.getBoundingClientRect();
    const actions = document.querySelector(".ideas-reactions")!.getBoundingClientRect();
    return {
      oneRow: chips.every(chip => Math.abs(chip.top - chips[0].top) < 1),
      scrollable: chipsEl.scrollWidth > chipsEl.clientWidth,
      toolbarHeight: toolbar.height,
      gap: nav.top - actions.bottom,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  expect(geometry.oneRow).toBe(true);
  expect(geometry.scrollable).toBe(true);
  expect(geometry.toolbarHeight).toBeLessThan(52);
  expect(geometry.gap).toBeGreaterThanOrEqual(10);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path:`${dir}/discover-four-filters-horizontal-320x667.png`,
    fullPage:true, animations:"disabled",
  });
});

test("Discover color field is full bleed, curved and mat-framed at phone widths", async ({page}) => {
  await seed(page);
  for(const viewport of [{width:320,height:667}, {width:390,height:844}, {width:430,height:932}]) {
    await page.setViewportSize(viewport);
    await page.goto("/#/ideas");
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector(".app-shell")!.getBoundingClientRect();
      const stage = document.querySelector(".ideas-swipe-stage")!.getBoundingClientRect();
      const mat = document.querySelector(".ideas-discovery-card")!;
      const image = document.querySelector(".ideas-discovery-photo")!.getBoundingClientRect();
      const card = mat.getBoundingClientRect();
      const title = document.querySelector(".ideas-discovery-caption h2")!;
      const heart = document.querySelector(".ideas-like svg")!;
      return {
        leftGap: Math.abs(stage.left - shell.left),
        rightGap: Math.abs(stage.right - shell.right),
        height: stage.height,
        imageInset: image.left - card.left,
        imageAspect: image.width / image.height,
        cardWidth: card.width,
        titleSize: parseFloat(getComputedStyle(title).fontSize),
        shadow: getComputedStyle(mat).boxShadow,
        wavePath: document.querySelector(".ideas-stage-wave path")?.getAttribute("d"),
        heartFill: heart.getAttribute("fill"),
        heartColor: getComputedStyle(document.querySelector(".ideas-like")!).color,
        dislikeColor: getComputedStyle(document.querySelector(".ideas-dislike")!).color,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(metrics.leftGap).toBeLessThanOrEqual(1);
    expect(metrics.rightGap).toBeLessThanOrEqual(1);
    expect(metrics.height).toBeLessThanOrEqual(510);
    expect(metrics.imageInset).toBeGreaterThanOrEqual(8);
    expect(metrics.imageAspect).toBeGreaterThan(0.99);
    expect(metrics.imageAspect).toBeLessThan(1.01);
    expect(metrics.cardWidth).toBeLessThanOrEqual(305);
    expect(metrics.titleSize).toBeLessThanOrEqual(15);
    expect(metrics.shadow).not.toBe("none");
    expect(metrics.wavePath).toContain("M0 48 Q0 26 24 20");
    expect(metrics.heartFill).toBe("currentColor");
    expect(metrics.heartColor).not.toBe(metrics.dislikeColor);
    expect(metrics.overflow).toBeLessThanOrEqual(1);
  }
});

test("Notifications float 8–16px above navigation and never collide with Discover reactions", async ({page}) => {
  await seed(page);
  for (const viewport of [{width:320,height:667}, {width:390,height:844}]) {
    await page.setViewportSize(viewport);
    await page.goto("/#/ideas");
    await page.getByRole("button", {name:"Dislike idea"}).click();
    await expect(page.locator(".app-toast")).toBeVisible();
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector(".bottom-nav")!.getBoundingClientRect();
      const toast = document.querySelector(".app-toast")!.getBoundingClientRect();
      const actions = document.querySelector(".ideas-reactions")!.getBoundingClientRect();
      return {
        toastGap: nav.top - toast.bottom,
        reactionGap: toast.top - actions.bottom,
      };
    });
    expect(metrics.toastGap).toBeGreaterThanOrEqual(8);
    expect(metrics.toastGap).toBeLessThanOrEqual(16);
    expect(metrics.reactionGap).toBeGreaterThanOrEqual(8);
  }
});
