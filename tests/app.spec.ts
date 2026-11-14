import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
const seed = {
  people: [
    { id: "p1", name: "Alex", birthday: "1997-03-20", note: "Tea lover" },
  ],
  events: [
    {
      id: "e1",
      name: "Birthday",
      date: "2026-11-28",
      kind: "birthday",
      people: ["p1"],
      budgets: { p1: 0 },
      enabled: true,
    },
    {
      id: "e2",
      name: "New Year",
      date: "2026-12-31",
      kind: "holiday",
      people: ["p1"],
      budgets: { p1: 5000 },
      enabled: true,
    },
  ],
  gifts: [
    {
      id: "g1",
      name: "Teapot",
      personId: "p1",
      eventId: "e1",
      price: 1200,
      status: "idea",
      note: "Keep this note",
      link: "https://example.com",
      image: "",
    },
  ],
  settings: { birthdayBudget: 10000, christmas: true, hanukkah: false },
  skipped: [],
};
async function legacy(page: Page) {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("seeded")) {
      localStorage.setItem("givvy_dashboard_v1", JSON.stringify(data));
      localStorage.setItem("seeded", "yes");
    }
  }, seed);
  await page.goto("/");
}
// Exercise real browser storage, routes, forms and derived budgets together.
test("legacy migration, gift status, image, independent budgets and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await legacy(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Events" })
    .click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("link", { name: /Birthday/ }).click();
  await expect(page.locator(".tag")).toHaveText("₽0");
  await page.getByRole("button", { name: /Teapot/ }).click();
  await expect(page.getByLabel("Notes")).toHaveValue("Keep this note");
  await page.getByLabel("Status").selectOption("bought");
  await page
    .getByLabel("Gift photo")
    .setInputFiles({
      name: "gift.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  await expect(
    page.locator(".summary-row").filter({ hasText: "Already bought" }),
  ).toContainText("₽1,200");
  await expect(page.locator(".gift img")).toHaveAttribute("src", /^data:image/);
  await page.getByRole("button", { name: "Edit occasion" }).click();
  await expect(page.getByLabel("Budget for Alex")).toHaveValue("0");
  await page.getByLabel("Budget for Alex").fill("300");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await page.reload();
  await expect(page.locator(".tag")).toHaveText("₽300");
  await page.getByRole("link", { name: "All events" }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("link", { name: /New Year/ }).click();
  await expect(page.locator(".tag")).toHaveText("₽5,000");
  const stored = await page.evaluate(() => ({
    legacy: JSON.parse(localStorage.getItem("givvy_dashboard_v1")!),
    v2: JSON.parse(localStorage.getItem("givvy_dashboard_v2")!),
  }));
  expect(stored.legacy).toEqual(seed);
  expect(stored.v2.version).toBe(2);
  expect(stored.v2.data.gifts[0].status).toBe("bought");
  expect(errors).toEqual([]);
});
test("person and event CRUD, gift prerequisites and cascade deletion", async ({
  page,
}) => {
  await legacy(page);
  await page.goto("/#/people");
  await page.getByRole("button", { name: /Add person|＋ Person/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jamie");
  await page.getByLabel("Birthday (optional)").fill("1998-07-03");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.getByRole("link", { name: /Jamie/ }).click();
  await page.getByRole("button", { name: "Edit person" }).click();
  await page.getByLabel("Notes").fill("Books");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.goto("/#/events");
  await page.getByRole("button", { name: /New event|＋ Event/ }).click();
  await page.getByLabel("Occasion name").fill("Dinner");
  await page.getByLabel("Include Jamie").check();
  await page.getByLabel("Budget for Jamie").fill("0");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("link", { name: /Dinner/ }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await page.getByLabel("Gift name").fill("Novel");
  await page
    .getByRole("combobox", { name: "For", exact: true })
    .selectOption({ label: "Jamie" });
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  await expect(page.getByRole("button", { name: /Novel/ })).toBeVisible();
  await page.getByRole("button", { name: /Novel/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete gift" }).click();
  await expect(page.getByRole("button", { name: /Novel/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Edit occasion" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page).toHaveURL(/#\/events$/);
  await page.goto("/#/people");
  await page.getByRole("link", { name: /Alex/ }).click();
  await page.getByRole("button", { name: "Edit person" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete person" }).click();
  const d = await page.evaluate(
    () => JSON.parse(localStorage.getItem("givvy_dashboard_v2")!).data,
  );
  expect(d.gifts).toEqual([]);
  expect(
    d.events.every((e) => !e.people.includes("p1") && !("p1" in e.budgets)),
  ).toBe(true);
});
test("calendar navigation, suggestions with buttons and touch swipes", async ({
  page,
}) => {
  await legacy(page);
  await page.goto("/#/events");
  const original = await page.locator(".calhead strong").textContent();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calhead strong")).not.toHaveText(original!);
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.locator(".calhead strong")).toHaveText(original!);
  await page.locator(".day").first().click();
  await expect(page.locator(".day[aria-pressed=true]")).toHaveCount(1);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ideas" })
    .click();
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Choose a person");
  await page.getByLabel("Finding ideas for").selectOption("p1");
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(page.locator(".gift")).toHaveCount(2);
  await page.getByRole("button", { name: "Skip idea" }).click();
  await expect(page.locator(".suggest h3")).toHaveText(
    "An experience together",
  );
  async function swipe(from: number, to: number) {
    await page.locator(".suggest").evaluate(
      (el, { from, to }) => {
        const touch = (x: number) =>
          new Touch({ identifier: 1, target: el, clientX: x, clientY: 100 });
        el.dispatchEvent(
          new TouchEvent("touchstart", {
            bubbles: true,
            touches: [touch(from)],
          }),
        );
        el.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            changedTouches: [touch(to)],
          }),
        );
      },
      { from, to },
    );
  }
  await swipe(20, 150);
  await expect(page.locator(".gift")).toHaveCount(3);
  await swipe(200, 30);
  await expect(page.locator(".suggest h3")).toHaveText("A little green friend");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ideas", exact: true })
    .click();
  await expect(page.locator(".suggest h3")).toHaveText("A little green friend");
  await expect(page.getByLabel("Finding ideas for")).toHaveValue("p1");
});
test("preferences, backup export, valid and invalid import", async ({
  page,
}) => {
  await legacy(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Default birthday budget").fill("0");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await expect(page.getByLabel("Default birthday budget")).toHaveValue("0");
  await page.getByLabel("Hanukkah", { exact: false }).check();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const path = await (await download).path();
  expect(path).toBeTruthy();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.version).toBe(2);
  expect(backup.data.settings.birthdayBudget).toBe(0);
  expect(backup.data.settings.hanukkah).toBe(true);
  await page
    .getByLabel("Import backup")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ people: [{}], events: [], gifts: [] }),
      ),
    });
  await expect(page.getByRole("status")).toContainText("Invalid recipient");
  page.once("dialog", (d) => d.accept());
  await page
    .getByLabel("Import backup")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          ...seed,
          people: [{ ...seed.people[0], name: "Restored" }],
        }),
      ),
    });
  await expect(page.getByRole("status")).toContainText("Backup imported");
  await page.goto("/#/people");
  await expect(page.getByRole("link", { name: /Restored/ })).toBeVisible();
});
test("corrupt storage is preserved", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("givvy_dashboard_v2", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("not been overwritten");
  await page.goto("/#/people");
  await page.getByRole("button", { name: /Add person|＋ Person/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("No overwrite");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("givvy_dashboard_v2")),
  ).toBe("{broken");
  await expect(page.getByRole("status")).toContainText("recovery");
});
for (const width of [320, 375, 390, 430])
  test(`navigation and overflow at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 844 });
    await legacy(page);
    for (const name of ["Home", "Events", "People", "Ideas"]) {
      await page
        .getByRole("navigation")
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/#/events/e1");
    await page.getByRole("button", { name: "Edit occasion" }).click();
    expect(
      await page.evaluate(
        () => document.querySelector(".sheet")!.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

test("storage quota failures keep the editor and previous data", async ({
  page,
}) => {
  await legacy(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: /Teapot/ }).click();
  await page.getByLabel("Gift name").fill("Unsaved");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Changes were not saved");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: /Teapot/ })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("givvy_dashboard_v2")),
  ).toBeNull();
});
