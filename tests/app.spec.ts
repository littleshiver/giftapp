import { test, expect } from "@playwright/test";
import { fixture, image, seed, readData } from "./fixtures";
test("Home featured gallery: individual gift cards, event link and prefilled add sheet", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveText([
    "Ideas",
    "People",
    "Home",
    "Events",
    "Settings",
  ]);
  await expect(page.locator(".occasion-chip[aria-pressed=true]")).toContainText(
    "Anna's birthday",
  );

  // The featured panel is no longer a giant click target.
  await expect(page.locator(".focus-card")).not.toHaveAttribute("role", "link");
  await expect(page.locator(".focus-gifts .product-title")).toHaveCount(0);
  await expect(page.locator(".focus-gifts .product-caption")).toHaveCount(0);
  await expect(page.locator(".focus-gifts .gift-card-edit")).toHaveCount(0);
  await page.locator(".focus-date").click();
  await expect(page).toHaveURL(/\/(?:#\/)?$/);

  // A Home gift is a visual reminder, not a shortcut into editing.
  await page.getByRole("button", { name: "View gift Scented candle" }).click();
  await expect(page).toHaveURL(/#\/events\/e1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit gift Scented candle" })).toBeVisible();

  await page.goto("/#/");
  await page.getByRole("link", { name: "Open Anna's birthday occasion" }).click();
  await expect(page).toHaveURL(/#\/events\/e1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/#/");
  await page.getByRole("button", { name: /Dec 31.*New Year/ }).click();
  await expect(page.locator(".focus-head h2")).toHaveText("New Year");
  await expect(page.locator(".focus-gifts .product-add")).toHaveCount(0);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Save to", exact: true })).toHaveValue("e2");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  // Existing deep links from older versions remain supported.
  await page.goto("/#/events/e2?addGift=1");
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(errors).toEqual([]);
});
test("FAB actions; gift photo/status, membership validation and independent idea conversion", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page
    .getByRole("button", { name: "Add gift", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Save to" }).selectOption("");
  await page.getByLabel("Gift name", { exact: true }).fill("A photo idea");
  await page.getByLabel("Estimated price").fill("800");
  await page.getByLabel("Notes", { exact: true }).fill("Important note");
  await page.getByLabel("Product link").fill("https://example.com");
  await page.getByLabel("Gift photo").setInputFiles({
    name: "mug.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(image("mug").split(",")[1], "base64"),
  });
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = (await readData(page)).ideas.find(
    (i) => i.name === "A photo idea",
  );
  expect(saved.image).toMatch(/^data:image\/jpeg/);
  expect(saved.eventId).toBeUndefined();
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("button", { name: "Edit idea A photo idea" }).click();
  await page.getByRole("button", { name: "Use for an occasion" }).click();
  await expect(page.getByLabel("Gift name", { exact: true })).toHaveValue(
    "A photo idea",
  );
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Important note",
  );
  await expect(page.getByLabel("Product link")).toHaveValue(
    "https://example.com",
  );
  // An idea saved for Anyone requires an explicit occasion and recipient.
  await page.getByRole("combobox", { name: "Occasion", exact: true })
    .selectOption("e1");
  await page.getByRole("combobox", { name: "For", exact: true })
    .selectOption("p1");
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  const data = await readData(page);
  expect(data.ideas.some((i) => i.name === "A photo idea")).toBe(true);
  expect(data.gifts.find((g) => g.name === "A photo idea").status).toBe(
    "to_buy",
  );
  await page.goto("/#/events/e1");
  await page
    .getByRole("button", { name: "Mark Scented candle as To buy", exact: true })
    .click();
  await expect(page.locator(".gift-status-icon.is-bought")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mark Scented candle as Bought", exact: true })
    .click();
  await expect(page.locator(".gift-status-icon.is-bought")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Edit Scented candle", exact: true })
    .click();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Keep the original note",
  );
  await page
    .getByRole("combobox", { name: "Occasion", exact: true })
    .selectOption("e3");
  await expect(
    page.getByRole("combobox", { name: "For", exact: true }),
  ).toHaveValue("p2");
  await expect(
    page.getByRole("combobox", { name: "For", exact: true }).locator("option"),
  ).toContainText(["Choose recipient", "Denis", "Anna · add to occasion", "Mira · add to occasion"]);
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  expect((await readData(page)).gifts.find((g) => g.id === "g1").personId).toBe(
    "p2",
  );
});
test("birthday has exactly one recipient; budgets and assigned gifts remain event-owned", async ({ page }) => {
  const data = fixture();
  data.events[0].budgets.p1 = 0;
  await seed(page, data);
  await expect(page.locator(".home-budget-warning")).toContainText("7 400 ₽ over budget");
  await page.goto("/#/events/e1");
  await expect(page.locator(".event-summary-budget")).toContainText("1 900 ₽");
  // Birthday is already anchored to one person: no duplicate recipient card.
  await expect(page.locator(".event-person-summary")).toHaveCount(0);
  await expect(page.locator(".event-overview-panel .event-summary-budget")).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Include Anna")).toBeDisabled();
  await page.getByLabel("Budget for Anna").fill("");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  expect((await readData(page)).events.find((e) => e.id === "e1").budgets).toEqual({});
  await page.goto("/#/events/e2");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Include Denis").uncheck();
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reassign or delete");
});
test("calendar, reminders, people editing and contextual gift/idea creation", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/events");
  await expect(page.locator(".calendar-top strong")).toHaveText(
    "November 2026",
  );
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-top strong")).toHaveText(
    "December 2026",
  );
  await page.getByRole("button", { name: "2026-12-31", exact: true }).click();
  await expect(page.getByRole("link", { name: /New Year/ })).toBeVisible();
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(page.locator(".month-block")).toHaveCount(3);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "People", exact: true })
    .click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jamie");
  await page.getByLabel("Good gifts").fill("Books");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.getByRole("link", { name: /Jamie/ }).click();
  await expect(page.getByText("Books", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit person" }).click();
  await page.getByLabel("Notes", { exact: true }).fill("A note");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.reload();
  await expect(page.getByText("A note", { exact: true })).toBeVisible();
});
test("Discover like opens the recipient sheet, a canceled like does not save, and dislikes persist", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/ideas");
  await expect(page.getByRole("button", { name: "Discover", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  await expect(page.locator(".ideas-filters-button")).toBeVisible();
  await expect(page.locator(".ideas-discovery-card .ideas-filters-button")).toHaveCount(0);

  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  const chooser = page.getByRole("dialog", { name: "Save this idea for who?" });
  await expect(chooser.getByRole("button", { name: /Anyone/ })).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Anna" })).toBeVisible();
  await chooser.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  expect((await readData(page)).ideas).toHaveLength(1);

  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  await page.getByRole("dialog", { name: "Save this idea for who?" })
    .getByRole("button", { name: /Anyone/ }).click();
  expect((await readData(page)).ideas.at(-1)).toMatchObject({
    name: "Ceramic mug", personId: "", sourceDiscoveryId: "discovery:ceramic-mug",
  });
  expect((await readData(page)).ideas.at(-1).image).toMatch(/^data:image\/jpeg/);
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Throw blanket");
  await page.getByRole("button", { name: "Dislike idea" }).click();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Art book");
  expect((await readData(page)).skipped).toContain("discovery:throw-blanket");

  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.locator(".ideas-saved-grid .gift-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Anyone", exact: true }).click();
  await expect(page.locator(".ideas-saved-grid .gift-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Anna", exact: true }).click();
  await expect(page.locator(".ideas-saved-grid .gift-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Edit idea Ceramic mug" })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Ideas", exact: true }).click();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("button", { name: "Anna", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Art book");
  expect((await readData(page)).ideas.some((idea) => idea.sourceDiscoveryId === "discovery:ceramic-mug")).toBe(true);
});

test("Discover filters are in a separate sheet, with removable chips and meaningful results", async ({ page }) => {
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Filters" }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await sheet.getByRole("combobox", { name: "Age" }).selectOption("child");
  await sheet.getByRole("combobox", { name: "Relationship" }).selectOption("close");
  await sheet.getByRole("button", { name: "Apply filters" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove Child filter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Close person filter" })).toBeVisible();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Throw blanket");
  await page.getByRole("button", { name: "Remove Child filter" }).click();
  await expect(page.getByRole("button", { name: "Remove Child filter" })).toHaveCount(0);
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Clear" }).click();
  await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  await expect(page.locator(".ideas-active-filters")).toHaveCount(0);
});

test("Discover liking a suggestion for a person uses their Saved filter and avoids repeated recommendations", async ({ page }) => {
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  await page.getByRole("dialog", { name: "Save this idea for who?" })
    .getByRole("button", { name: "Mira" }).click();
  const added = (await readData(page)).ideas.at(-1);
  expect(added).toMatchObject({
    personId: "p3", sourceDiscoveryId: "discovery:ceramic-mug",
  });
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Throw blanket");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("button", { name: "Mira", exact: true }).click();
  await expect(page.locator(".ideas-saved-grid .gift-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit idea Ceramic mug" }).click();
  await expect(page.getByRole("dialog", { name: "Edit idea" })).toBeVisible();
});

test("legacy migration notice, original data exports, v3 restore and invalid backup", async ({
  page,
}) => {
  const legacy = {
    people: [{ id: "p", name: "Original", birthday: "", note: "keep" }],
    events: [
      {
        id: "e",
        name: "New Year",
        date: "2026-12-31",
        kind: "holiday",
        people: ["p"],
        budgets: { p: 0 },
        enabled: true,
      },
    ],
    gifts: [
      {
        id: "g",
        name: "Original idea",
        price: 100,
        status: "idea",
        eventId: "e",
        personId: "p",
        image: image("mug"),
        note: "keep",
        link: "https://example.com",
      },
    ],
    settings: { birthdayBudget: 0 },
    skipped: [],
  };
  await page.addInitScript((d) => {
    if (!localStorage.getItem("givvy_dashboard_v1"))
      localStorage.setItem("givvy_dashboard_v1", JSON.stringify(d));
  }, legacy);
  await page.goto("/");
  await expect(page.getByText("Saved data upgrade preview")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3")),
  ).toBeNull();
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit idea Original idea" })).toBeVisible();
  await page.goto("/#/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export original data" }).click();
  expect((await download).suggestedFilename()).toBe(
    "givvy-original-backup.json",
  );
  await page.getByLabel("Your name").fill("Me");
  await page.getByRole("button", { name: "Save preferences" }).click();
  expect((await readData(page)).migration.original).toEqual(legacy);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("givvy_dashboard_v1")!),
    ),
  ).toEqual(legacy);
  await page.getByLabel("Import backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "Unsupported backup version",
  );
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Import backup").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 3, data: fixture() })),
  });
  await expect(page.getByRole("status")).toContainText("Backup imported");
  expect((await readData(page)).settings.name).toBe("Polina");
});
test("corrupt data and quota errors never overwrite storage or claim success", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("button", { name: "Edit idea Ceramic mug" }).click();
  await page.getByLabel("Idea name", { exact: true }).fill("Unsaved");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(page.locator(".warning[role=alert]")).toContainText("Changes were not saved");
  await expect(page.locator(".app-toast.toast-error")).toContainText("Couldn’t save");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await readData(page)).ideas[0].name).toBe("Ceramic mug");
});
test("invalid image keeps editor contents and no status duplicates", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/events/e1");
  await page
    .getByRole("button", { name: "Edit Scented candle", exact: true })
    .click();
  await page.getByLabel("Gift photo").setInputFiles({
    name: "invalid.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("invalid image data"),
  });
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Image could not be loaded",
  );
  await expect(page.getByLabel("Gift name", { exact: true })).toHaveValue(
    "Scented candle",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".gift-status-icon")).toHaveCount(3);
});

test("occasion/gift CRUD and explicit cascade deletion retain independent ideas", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/events");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add occasion", exact: true }).click();
  await page.getByLabel("Occasion name").fill("Dinner");
  await page.getByLabel("Type", { exact: true }).selectOption("other");
  await page.getByLabel("Include Anna").check();
  await page.getByLabel("Budget for Anna").fill("0");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  const event = (await readData(page)).events.find((e) => e.name === "Dinner");
  await page.goto("/#/events/" + event.id);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await page.getByRole("button", { name: "Choose from saved ideas" }).click();
  await expect(page.getByRole("dialog", { name: "Gift for Anna" })).toBeVisible();
  await page.getByRole("button", { name: "Add a new gift" }).click();
  await page.getByLabel("Gift name", { exact: true }).fill("Flowers");
  await page.getByLabel("Price (₽)").fill("100");
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Flowers", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Flowers", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete gift", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Flowers", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete event", exact: true }).click();
  expect((await readData(page)).events.some((e) => e.id === event.id)).toBe(
    false,
  );
  await page.goto("/#/people/p1");
  await page.getByRole("button", { name: "Edit person" }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete person", exact: true })
    .click();
  const result = await readData(page);
  expect(result.people.some((p) => p.id === "p1")).toBe(false);
  expect(result.ideas[0].name).toBe("Ceramic mug");
  expect(result.ideas[0].personId).toBe("");
  expect(result.gifts.every((g) => g.personId !== "p1")).toBe(true);
  expect(
    result.events.every(
      (e) => !e.people.includes("p1") && !Object.hasOwn(e.budgets, "p1"),
    ),
  ).toBe(true);
});

test("an imported gift with a missing occasion stays visible and can be repaired", async ({
  page,
}) => {
  const data = fixture();
  data.gifts[0].eventId = "missing-occasion";
  await seed(page, data);
  await page.goto("/#/events");
  await page.getByRole("button", { name: "Repair Scented candle" }).click();
  await expect(
    page.getByRole("combobox", { name: "Occasion", exact: true }),
  ).toHaveValue("missing-occasion");
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Keep the original note",
  );
  await page
    .getByRole("combobox", { name: "Occasion", exact: true })
    .selectOption("e1");
  await page.getByRole("button", { name: "Save gift", exact: true }).click();
  const repaired = (await readData(page)).gifts.find((g) => g.id === "g1");
  expect(repaired.eventId).toBe("e1");
  expect(repaired.note).toBe("Keep the original note");
  expect(repaired.image).toBe(data.gifts[0].image);
});


test("new recipient assigned to an occasion appears in the gift picker", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jamie new");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  const created = (await readData(page)).people.find((p) => p.name === "Jamie new");
  expect(created).toBeTruthy();

  await page.goto("/#/events/e2");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Include Jamie new").check();
  await page.getByLabel("Budget for Jamie new").fill("2000");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  expect((await readData(page)).events.find((e) => e.id === "e2").people)
    .toContain(created.id);

  // A global Add action must not silently choose a different occasion.
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("combobox", { name: "Save to" })).toHaveValue("");
  await page.getByRole("combobox", { name: "Save to" }).selectOption("e2");
  const personSelector = page.getByRole("combobox", { name: "For", exact: true });
  await expect(personSelector).toContainText("Jamie new");
  await personSelector.selectOption(created.id);
  await page.getByLabel("Gift name", { exact: true }).fill("Board game");
  await page.getByLabel("Price (₽)").fill("1200");
  await page.getByRole("button", { name: "Add to occasion", exact: true }).click();

  await page.reload();
  const saved = await readData(page);
  expect(saved.gifts.find((g) => g.name === "Board game")).toMatchObject({
    eventId: "e2",
    personId: created.id,
    status: "to_buy",
    price: 1200,
  });
  expect(saved.events.find((e) => e.id === "e2").budgets[created.id]).toBe(2000);
});

test("gift editor adds people only to group occasions and does not invent budgets", async ({ page }) => {
  await seed(page);
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Rory new");
  await page.getByRole("button", { name: "Save person" }).click();
  const created = (await readData(page)).people.find((p) => p.name === "Rory new");

  // A birthday is not an occasion with arbitrarily many recipients.
  await page.goto("/#/events/e1");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await page.getByRole("button", { name: "Choose from saved ideas" }).click();
  await expect(page.getByRole("dialog", { name: "Gift for Anna" })).toBeVisible();
  await page.getByRole("button", { name: "Add a new gift" }).click();
  await expect(page.getByRole("combobox", { name: "For" }).locator("option")).toHaveCount(2);
  await page.getByRole("button", { name: "Close" }).click();

  // A global add flow still allows explicitly assigning an unlisted
  // recipient; the event-detail FAB only offers people already in the event.
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await page.getByRole("combobox", { name: "Save to" }).selectOption("e2");
  await page.getByRole("combobox", { name: "For" }).selectOption(created.id);
  await expect(page.locator('.section-note[role="status"]'))
    .toContainText("Saving this gift also adds Rory new");
  await page.getByLabel("Gift name", { exact: true }).fill("Tea set");
  await page.getByLabel("Price (₽)").fill("850");
  await page.getByRole("button", { name: "Add to occasion" }).click();
  const saved = await readData(page);
  const occasion = saved.events.find((e) => e.id === "e2");
  expect(occasion.people).toContain(created.id);
  expect(Object.hasOwn(occasion.budgets, created.id)).toBe(false);
  expect(saved.gifts.find((g) => g.name === "Tea set")).toMatchObject({
    eventId: "e2", personId: created.id, status: "to_buy",
  });
  await page.reload();
  expect((await readData(page)).events.find((e) => e.id === "e2").people)
    .toContain(created.id);
});

test("empty and filled previews never overwrite personal storage or photo data", async ({ page }) => {
  await seed(page);
  const savedBefore = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: "Viewing my data" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Filled", exact: true }).click();
  await expect(page.getByRole("button", { name: "Filled", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#/");
  await expect(page.getByText("Mira's birthday", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".demo-product-sprite").first()).toBeVisible();

  // Real source sheet must decode. The first populated event uses three images.
  const sprite = page.locator(".demo-product-sprite").first();
  const decoded = await sprite.evaluate(async (el) => {
    const value = getComputedStyle(el).backgroundImage;
    const url = value.startsWith("url(") ? value.slice(4, -1).replace(/["']/g, "") : "";
    if (!url) return { loaded: false, width: 0, height: 0 };
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { return { loaded: false, width: 0, height: 0 }; }
    return { loaded: true, width: img.naturalWidth, height: img.naturalHeight };
  });
  expect(decoded).toEqual({ loaded: true, width: 1920, height: 768 });

  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await page.goto("/#/");
  await expect(page.getByText("Add your first occasion to start planning.")).toBeVisible();
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Return to my data", exact: true }).click();
  await page.goto("/#/");
  await expect(page.getByText("Anna's birthday", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBe(savedBefore);

  await page.reload();
  expect(await page.evaluate(() => sessionStorage.getItem("givvy_preview_mode"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBe(savedBefore);
});

test("changes in filled preview are temporary and cannot modify the personal backup", async ({ page }) => {
  await seed(page);
  const savedBefore = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Filled", exact: true }).click();
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Temporary tester");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByText("Temporary tester")).toBeVisible();

  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: "Import JSON" })).toBeDisabled();
  await page.getByRole("button", { name: "Return to my data", exact: true }).click();
  await page.goto("/#/people");
  await expect(page.getByText("Temporary tester")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBe(savedBefore);
});

test("calendar shows whole month first, filters by day and restores month view", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events");
  await expect(page.locator(".calendar-top strong")).toHaveText("November 2026");
  await expect(page.locator(".calendar-agenda-heading h2")).toHaveText("November events");
  await expect(page.locator(".calendar-event-card")).toHaveCount(1);
  await expect(page.locator(".calendar-event-card")).toContainText("Anna's birthday");
  await expect(page.locator(".calendar-event-card .calendar-event-status")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add occasion", exact: true })).toHaveCount(0);

  // The initial date is an outline for Today, but never an active filter.
  await expect(page.locator(".cal-day.is-selected")).toHaveCount(0);
  await page.getByRole("button", { name: "2026-11-20", exact: true }).click();
  await expect(page.locator(".calendar-agenda-heading h2")).toHaveText("Nov 20");
  await expect(page.locator(".calendar-event-card")).toHaveCount(0);
  await expect(page.getByText("Nothing planned for this day")).toBeVisible();
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(1);

  await page.getByRole("button", { name: "2026-11-28", exact: true }).click();
  await expect(page.locator(".calendar-agenda-heading h2")).toHaveText("Nov 28");
  await expect(page.locator(".calendar-event-card")).toContainText("Anna's birthday");
  await page.getByRole("link", { name: /Anna's birthday/ }).last().click();
  await expect(page).toHaveURL(/#\/events\/e1$/);
  await page.goBack();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-top strong")).toHaveText("December 2026");
  await expect(page.locator(".calendar-agenda-heading h2")).toHaveText("December events");
  await expect(page.locator(".calendar-event-card")).toContainText("New Year");
  await expect(page.locator(".calendar-event-card .calendar-event-status")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show all" })).toHaveCount(0);
});

test("calendar marker colors and gift statuses reflect actual enabled events", async ({ page }) => {
  const data = fixture();
  data.events.push({
    ...data.events[0],
    id: "e4",
    name: "Tea meetup",
    date: "2026-11-28",
    kind: "other",
    image: "",
  });
  data.events.push({
    ...data.events[0],
    id: "e5",
    name: "Little celebration",
    date: "2026-11-23",
    kind: "holiday",
    image: "",
  });
  data.events[0].enabled = true;
  await seed(page, data);
  await page.goto("/#/events");
  await expect(page.locator(".calendar-event-card")).toHaveCount(3);
  await expect(page.locator(".cal-day[aria-label='2026-11-28'] .cal-dot")).toHaveCount(2);
  const tints = await page.locator(".calendar-event-card").evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).getPropertyValue("--calendar-event-tint").trim())
  );
  expect(new Set(tints).size).toBe(3);
  await expect(page.getByRole("link", { name: /Tea meetup/ })).toContainText("Tea meetup");

  await page.getByRole("button", { name: "2026-11-28" }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Little celebration/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Reminders", exact: true }).click();
  await expect(page.locator(".month-block")).toHaveCount(3);
});

test("empty calendar is navigable without adding duplicate create buttons", async ({ page }) => {
  await seed(page);
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await page.goto("/#/events");
  await expect(page.locator(".calendar-card")).toBeVisible();
  await expect(page.locator(".calendar-event-card")).toHaveCount(0);
  await expect(page.getByText("No occasions this month")).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-top strong")).toHaveText("December 2026");
  await expect(page.getByRole("button", { name: "Add occasion", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create", exact: true })).toBeVisible();
});

test("featured gallery uses near-full width and a clean green bought tick", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const card = page.locator(".focus-card");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.width - 390)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.x + box!.width - 390)).toBeLessThanOrEqual(1);
  const marker = page.locator(".focus-gifts .gift-status-icon.is-bought");
  await expect(marker).toHaveCount(1);
  const style = await marker.evaluate((el) => {
    const c = getComputedStyle(el);
    return { color: c.color, bg: c.backgroundColor };
  });
  expect(style).toEqual({
    color: "rgb(35, 122, 80)",
    bg: "rgb(221, 242, 229)",
  });
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector(".focus-card")!;
    const wave = document.querySelector(".focus-wave")!;
    const title = document.querySelector(".focus-title-row h2")!;
    const gift = document.querySelector(".focus-gifts .home-product")!;
    const main = document.querySelector("main")!;
    return {
      mainPaddingTop: getComputedStyle(main).paddingTop,
      heroBackground: getComputedStyle(hero).backgroundColor,
      overlayContent: getComputedStyle(hero, "::before").content,
      waveHeight: wave.getBoundingClientRect().height,
      heroHeight: hero.getBoundingClientRect().height,
      titleLeft: title.getBoundingClientRect().left,
      giftLeft: gift.getBoundingClientRect().left,
    };
  });
  expect(geometry.mainPaddingTop).toBe("0px");
  expect(geometry.heroBackground).toBe("rgba(0, 0, 0, 0)");
  expect(geometry.overlayContent).toBe("none");
  expect(geometry.waveHeight).toBeGreaterThan(geometry.heroHeight);
  expect(Math.abs(geometry.titleLeft - geometry.giftLeft)).toBeLessThan(3);
});

test("selecting an upcoming occasion smoothly aligns that card to the leading edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const track = page.locator(".upcoming-track");
  for (const name of [/Dec 31.*New Year/, /Our anniversary/]) {
    await page.getByRole("button", { name }).click();
    await expect.poll(async () => {
      return track.evaluate((el) => {
        const active = el.querySelector(".occasion-chip.is-selected")!;
        const inset = Number.parseFloat(getComputedStyle(el).paddingLeft) || 0;
        return Math.abs(active.getBoundingClientRect().left -
          el.getBoundingClientRect().left - inset);
      });
    }).toBeLessThan(4);
  }
  await expect(page.locator(".focus-head h2")).toHaveText("Our anniversary");
  await expect(page).toHaveURL(/\/(?:#\/)?$/);
});

test("gift sheet previews its existing image and the replacement before saving", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events/e1");
  await page.getByRole("button", { name: "Edit Scented candle", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const existing = dialog.locator(".photo-upload-preview img");
  await expect(existing).toBeVisible();
  await expect.poll(() => existing.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(dialog.getByText("Current photo")).toBeVisible();
  const saved = await readData(page);
  await dialog.getByLabel("Gift photo").setInputFiles({
    name: "replacement.jpg", mimeType: "image/jpeg",
    buffer: Buffer.from(image("mug").split(",")[1], "base64"),
  });
  await expect(dialog.getByText("New photo selected")).toBeVisible();
  await expect(dialog.getByText("replacement.jpg")).toBeVisible();
  await expect.poll(() => existing.evaluate((img: HTMLImageElement) => img.currentSrc.startsWith("blob:"))).toBe(true);
  await expect.poll(() => existing.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect((await readData(page)).gifts.find((g: {id: string}) => g.id === "g1").image).toBe(
    saved.gifts.find((g: {id: string}) => g.id === "g1").image
  );
  await dialog.getByRole("button", { name: "Close" }).click();
  await page.goto("/#/events/e1");
  await page.getByRole("button", { name: "Edit Scented candle", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Current photo")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("replacement.jpg")).toHaveCount(0);
});
test("demo gift photo appears in the editor rather than a broken image", async ({ page }) => {
  await seed(page);
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Filled", exact: true }).click();
  await page.goto("/#/events/demo-birthday");
  await page.getByRole("button", { name: "Edit Portable pink blender", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator(".photo-upload-preview .demo-product-sprite")).toBeVisible();
});

test("composed Home uses date-first occasion cards, centered logo and single monthly budget card", async ({ page }) => {
  const data = fixture();
  data.events[1].name = "Alexander and Mikhail's wonderful anniversary celebration";
  await seed(page, data);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/");
  await expect(page.locator(".home-wordmark")).toBeVisible();
  await expect(page.locator(".home-wordmark")).toContainText("givvy");
  await expect(page.locator(".home-heading")).not.toContainText("November");
  await expect(page.locator(".home-month-budget-card")).toHaveCount(1);
  await expect(page.locator(".home-month-budget-numbers")).toContainText("7 400 ₽");
  await expect(page.locator(".home-month-budget-track")).toHaveAttribute("aria-label", /planned gift budget/);
  // The date must remain above the event name even for a two-line label.
  const card = page.locator(".occasion-chip").nth(1);
  const geometry = await card.evaluate((el) => {
    const date = el.querySelector(".occ-date")!.getBoundingClientRect();
    const name = el.querySelector(".occ-name")!.getBoundingClientRect();
    const count = el.querySelector(".occ-count")!.getBoundingClientRect();
    const icon = el.querySelector(".occ-thumb")!.getBoundingClientRect();
    const copy = el.querySelector(".occ-copy")!.getBoundingClientRect();
    return {
      dateTop: date.top, dateBottom: date.bottom,
      titleTop: name.top, titleBottom: name.bottom,
      countBottom: count.bottom,
      titleHeight: name.height,
      centerOffset: Math.abs((icon.top + icon.bottom) / 2 - (copy.top + copy.bottom) / 2),
    };
  });
  expect(geometry.dateBottom).toBeLessThan(geometry.titleTop);
  expect(geometry.titleTop - geometry.countBottom).toBeGreaterThan(3);
  expect(geometry.titleHeight).toBeGreaterThan(20);
  expect(geometry.centerOffset).toBeLessThan(19);
  await expect(page.locator(".focus-gifts .product-title")).toHaveCount(0);
  const wavePath = await page.locator(".focus-wave path").getAttribute("d");
  expect(wavePath).toContain("L400 456 C332 477");
  await expect(page.locator(".focus-bottom-wave")).toHaveCount(0);
});

test("Monthly budget displays people across occasions, switches month, and preserves data", async ({ page }) => {
  await seed(page);
  await page.goto("/#/");
  const saved = await readData(page);
  await expect(page.locator(".home-month-budget-month")).toContainText("November 2026");
  await expect(page.locator(".home-month-budget-card")).toContainText("7 400 ₽");
  await expect(page.locator(".home-month-budget-people")).toBeVisible();
  await expect(page.locator(".home-month-budget-person")).toHaveCount(1);
  await expect(page.locator(".home-month-budget-person").first()).toContainText("Anna");
  await expect(page.locator(".home-month-budget-person").first()).toContainText("1 900 ₽ spent");
  await expect(page.locator(".home-month-budget-toggle")).toHaveCount(0);
  await expect(page.locator(".home-month-budget-occasion")).toHaveCount(0);
  await expect(page.locator(".home-month-budget-people"))
    .toHaveCSS("border-top-width", "0px");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".home-month-budget-month")).toContainText("December 2026");
  await expect(page.locator(".home-month-budget-person")).toHaveCount(3);
  const denis = page.locator(".home-month-budget-person").filter({ hasText: "Denis" });
  await expect(denis).toContainText("4 800 ₽");
  await expect(denis).toContainText("5 000 ₽");
  await expect(page.locator(".focus-head h2")).toHaveText("Anna's birthday");
  expect(await readData(page)).toEqual(saved);
  await denis.click();
  await expect(page).toHaveURL(new RegExp("#/people/p2$"));
});

test("Home swipe teaching animation loops gently and respects reduced motion", async ({ page }) => {
  await seed(page);
  await page.goto("/#/");
  const visual = page.locator(".home-inspiration-visual");
  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute("data-played", "true");
  await expect(visual.locator(".home-swipe-card")).toHaveCount(3);
  await expect(visual.locator(".home-swipe-overlay")).toHaveCount(2);
  const snapshots = await visual.locator(".home-swipe-card").evaluateAll(cards =>
    cards.map(card => {
      // Offsets, unlike bounding rects, don't vary with the decorative tilt.
      const image = card.querySelector(".home-swipe-image") as HTMLElement;
      const caption = card.querySelector(".home-swipe-caption") as HTMLElement;
      return {
        imageBottom: image.offsetTop + image.offsetHeight,
        captionTop: caption.offsetTop,
        captionHeight: caption.offsetHeight,
      };
    }),
  );
  expect(snapshots.every(c =>
    Math.abs(c.imageBottom - c.captionTop) <= 1 && c.captionHeight > 0,
  )).toBe(true);
  const overlayWithinImage = await visual.locator(".home-swipe-overlay").evaluateAll(items =>
    items.every(el => {
      const r=el.getBoundingClientRect();
      const image=el.parentElement!.getBoundingClientRect();
      return Math.abs(r.bottom-image.bottom)<1 && Math.abs(r.top-image.top)<1;
    }),
  );
  expect(overlayWithinImage).toBe(true);

  await expect(visual.locator(".home-swipe-like")).toHaveCSS("background-color", /210, 65, 88/);
  const iterations = await visual.locator(".home-swipe-front")
    .evaluate((el) => getComputedStyle(el).animationIterationCount);
  expect(iterations).toBe("infinite");
  await page.evaluate(() => scrollTo(0, 0));
  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute("data-played", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await visual.locator(".home-swipe-front")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(reduced).toBe("none");
  await page.locator(".home-inspiration-link").click();
  await expect(page).toHaveURL(/#\/ideas$/);
});


test("per-event reminder preferences save, reload and turn off independently", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events?mode=reminders");
  await expect(page.getByRole("button", { name: "Reminders", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Choose when to be reminded about each occasion.")).toHaveCount(0);
  await expect(page.getByText(/Reminder preferences are saved/)).toHaveCount(0);

  const anna = page.locator(".reminder-event").filter({
    has: page.getByRole("link", { name: /Anna's birthday/ }),
  });
  await expect(anna).toContainText("No reminder");
  await expect(anna.locator(".reminder-date")).toContainText("NOV");
  const dateBackground = await anna.locator(".reminder-date")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dateBackground).not.toBe("rgba(0, 0, 0, 0)");
  await anna.getByRole("button", { name: "Set reminder for Anna's birthday" }).click();
  const reminderSheet = page.getByRole("dialog", { name: "Remind me" });
  await expect(reminderSheet).toBeVisible();
  await expect(anna.locator(".reminder-options")).toHaveCount(0);
  await reminderSheet.getByRole("button", { name: "7 days before" }).click();
  await expect(reminderSheet).toHaveCount(0);
  await expect(anna).toContainText("7 days before");
  expect((await readData(page)).events.find((e) => e.id === "e1").reminderDays).toBe(7);
  expect((await readData(page)).events.find((e) => e.id === "e2").reminderDays).toBeUndefined();

  await page.reload();
  const savedAnna = page.locator(".reminder-event").filter({
    has: page.getByRole("link", { name: /Anna's birthday/ }),
  });
  await expect(savedAnna).toContainText("7 days before");
  await savedAnna.getByRole("button", { name: "Set reminder for Anna's birthday" }).click();
  await page.getByRole("dialog", { name: "Remind me" })
    .getByRole("button", { name: "Off", exact: true }).click();
  await expect(savedAnna).toContainText("No reminder");
  expect((await readData(page)).events.find((e) => e.id === "e1").reminderDays).toBeNull();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator(".calendar-card")).toBeVisible();
});

test("Home uses the shared brand and a single fully clickable Inspiration CTA", async ({ page }) => {
  await seed(page);
  await page.goto("/#/");
  await expect(page.locator(".home-heading > .home-brandbar")).toHaveCount(1);
  const view = page.getByRole("link", { name: "View calendar" });
  const explore = page.locator(".home-inspiration-link");
  await expect(view).toHaveClass(/section-link/);
  await expect(explore).toHaveClass(/home-inspiration-taparea/);
  await expect(explore.locator(".home-inspiration-cta")).toContainText("Explore ideas");
  await expect(explore.locator(".home-inspiration-copy")).toContainText("every occasion");
  const bounds = await explore.evaluate(el => {
    const link = el.getBoundingClientRect();
    const section = el.parentElement!.getBoundingClientRect();
    return {
      left: Math.abs(link.left-section.left),
      width: Math.abs(link.width-section.width),
    };
  });
  expect(bounds.left).toBeLessThan(1);
  expect(bounds.width).toBeLessThan(1);
});


test("one gift card design separates purchase status and editing on Home and Events", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events/e1");
  const candle = page.locator(".gift-card").filter({
    has: page.getByRole("button", { name: "Edit Scented candle", exact: true }),
  });
  await expect(candle.locator(".gift-status-icon")).toHaveCount(1);
  await expect(candle.locator(".gift-card-edit")).toHaveCount(1);
  await expect(candle.locator(".status-tag, .status-button")).toHaveCount(0);
  await candle.getByRole("button", { name: "Mark Scented candle as To buy" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await readData(page)).gifts.find((g) => g.id === "g1").status).toBe("to_buy");
  await candle.getByRole("button", { name: "Edit gift Scented candle" }).click();
  await expect(page.getByRole("dialog", { name: "Edit gift" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.goto("/#/");
  const homeCandle = page.locator(".focus-gifts .gift-card").filter({
    has: page.getByRole("button", { name: "View gift Scented candle" }),
  });
  await expect(homeCandle.locator(".gift-card-edit")).toHaveCount(0);
  await expect(homeCandle.locator(".gift-card-copy")).toHaveCount(0);
  await expect(homeCandle.locator(".gift-status-icon.is-to-buy")).toHaveCount(1);
  await homeCandle.getByRole("button", { name: "Mark Scented candle as Bought" }).click();
  await expect(homeCandle.locator(".gift-status-icon.is-bought")).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);

  await page.goto("/#/people/p1");
  await expect(page.locator(".person-ideas .gift-card")).toHaveCount(1);
  await expect(page.locator(".person-ideas .gift-status-icon")).toHaveCount(0);
  await expect(page.locator(".person-ideas .gift-card-edit")).toHaveCount(1);
});

test("root page headers omit redundant Givvy overlines and detail pages share a back pattern", async ({ page }) => {
  await seed(page);
  for (const route of ["/people", "/ideas", "/events"]) {
    await page.goto("/#" + route);
    await expect(page.locator("main .root-page-heading, main .events-page-heading")).toHaveCount(1);
    await expect(page.locator("main .page-heading .overline")).toHaveCount(0);
  }
  await page.goto("/#/events/e1");
  await expect(page.locator(".event-hero-back")).toBeVisible();
  await page.goto("/#/people/p1");
  await expect(page.getByRole("link", { name: "Back to People" })).toBeVisible();
  await expect(page.locator(".person-photo-back")).toBeVisible();
});


test("global FAB is the only add entry point on all main and detail pages", async ({ page }) => {
  await seed(page);
  for (const route of ["/", "/people", "/events", "/people/p1", "/events/e1", "/events/e2", "/settings"]) {
    await page.goto("/#" + route);
    await expect(page.getByRole("button", { name: "Create", exact: true })).toBeVisible();
    await expect(page.locator(".people-add, .product-add, .person-add-idea, .event-add-gift, .event-add-recipient")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add your own idea" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add person", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add idea", exact: true })).toHaveCount(0);
  }
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create", exact: true })).toBeVisible();
  // FAB inside a person profile retains the recipient prefill.
  await page.goto("/#/people/p1");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("combobox", { name: "For" })).toHaveValue("p1");
  await page.getByRole("button", { name: "Close" }).click();
});

test("Home gift image is a reminder only, with right-hand status and text fallback for missing photo", async ({page}) => {
  const data = fixture();
  data.gifts[0].image = "";
  await seed(page, data);
  const home = page.locator(".focus-gifts .home-product").filter({
    has: page.getByRole("button",{name:"View gift Scented candle"}),
  });
  await expect(home.locator(".product-title, .product-caption, .gift-card-edit")).toHaveCount(0);
  await expect(home.locator(".home-gift-placeholder-name")).toHaveText("Scented candle");
  const fallbackVisible = await home.locator(".home-gift-placeholder-name")
    .evaluate((el) => getComputedStyle(el).display);
  expect(fallbackVisible).toBe("flex");
  const geometry = await home.evaluate((el) => {
    const image = el.querySelector(".product-visual")!.getBoundingClientRect();
    const status = el.querySelector(".gift-status-icon")!.getBoundingClientRect();
    return { rightGap: image.right - status.right, leftGap: status.left - image.left, size: status.width };
  });
  expect(geometry.rightGap).toBeGreaterThanOrEqual(5);
  expect(geometry.rightGap).toBeLessThanOrEqual(14);
  expect(geometry.leftGap).toBeGreaterThan(80);
  expect(geometry.size).toBeLessThanOrEqual(34);
  await home.getByRole("button",{name:"Mark Scented candle as To buy"}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await home.getByRole("button",{name:"View gift Scented candle"}).click();
  await expect(page).toHaveURL(/#\/events\/e1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Discover exhausts its finite pool and can explicitly revisit dislikes", async ({ page }) => {
  await seed(page);
  await page.goto("/#/ideas");
  for (const title of ["Ceramic mug", "Throw blanket", "Art book", "Scented candle"]) {
    await expect(page.locator(".ideas-discovery-caption")).toHaveText(title);
    await page.getByRole("button", { name: "Dislike idea" }).click();
  }
  await expect(page.getByText("You've seen all the ideas in this selection.")).toBeVisible();
  await expect(page.locator(".ideas-discovery-card")).toHaveCount(0);
  expect((await readData(page)).skipped).toHaveLength(4);
  await page.reload();
  await expect(page.getByText("You've seen all the ideas in this selection.")).toBeVisible();
  await page.getByRole("button", { name: "Review skipped ideas" }).click();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  expect((await readData(page)).skipped).toHaveLength(0);
});

test("FAB-created gift idea is available under Saved → Anyone and remains editable", async ({ page }) => {
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await page.getByLabel("Gift name").fill("A new handmade gift");
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  await page.getByRole("button", { name: "Anyone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit idea A new handmade gift" })).toBeVisible();
  expect((await readData(page)).ideas.find(i => i.name === "A new handmade gift").personId).toBe("");
  await page.getByRole("button", { name: "Edit idea A new handmade gift" }).click();
  await expect(page.getByRole("dialog", { name: "Edit idea" })).toBeVisible();
});

test("Discover supports drag feedback, snap-back and animated swipe outcomes", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/ideas");
  const card = page.locator(".ideas-discovery-card");
  const stage = page.locator(".ideas-swipe-stage");
  await expect(stage.locator(".ideas-stage-wave path")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Create", exact: true })).toHaveCount(0);
  const box = await card.boundingBox();
  if (!box) throw Error("Missing swipe card bounds");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y, { steps: 6 });
  const feedback = await card.evaluate((el) => ({
    direction: el.getAttribute("data-swipe-direction"),
    opacity: Number(getComputedStyle(el.querySelector(".ideas-swipe-overlay")!).opacity),
  }));
  expect(feedback.direction).toBe("right");
  expect(feedback.opacity).toBeGreaterThan(0.1);
  await page.mouse.up();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 140, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("dialog", { name: "Save this idea for who?" })).toBeVisible();
  await page.getByRole("dialog", { name: "Save this idea for who?" })
    .getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  // The card has a 280ms exit/return transition; don't initiate a fresh
  // pointer gesture while the previous card is still animating back.
  await page.waitForTimeout(350);

  // After a long like gesture the card can return with a new transform;
  // use fresh bounds rather than a coordinate captured before the animation.
  const returned = await card.boundingBox();
  if (!returned) throw Error("Missing returned swipe card bounds");
  const finalX = returned.x + returned.width / 2;
  const finalY = returned.y + returned.height / 2;
  await page.mouse.move(finalX, finalY);
  await page.mouse.down();
  await page.mouse.move(finalX - 135, finalY, { steps: 8 });
  await expect(card).toHaveAttribute("data-swipe-direction", "left");
  await page.mouse.up();
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Throw blanket");
  expect((await readData(page)).skipped).toContain("discovery:ceramic-mug");
});

test("Discover filters are exclusive dropdowns; four removable chips preserve individual values", async ({ page }) => {
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Filters" }).click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  const age = dialog.getByRole("combobox", { name: "Age" });
  const relationship = dialog.getByRole("combobox", { name: "Relationship" });
  await age.selectOption("adult");
  await age.selectOption("child");
  await expect(age).toHaveValue("child");
  await relationship.selectOption("colleague");
  await relationship.selectOption("friend");
  await expect(relationship).toHaveValue("friend");
  await dialog.getByRole("combobox", { name: "Category" }).selectOption("home");
  await dialog.getByRole("combobox", { name: "Budget" }).selectOption("over2000");
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(dialog.locator("details")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".ideas-filter-chip")).toHaveCount(4);
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Throw blanket");
  await page.getByRole("button", { name: "Remove Child filter" }).click();
  await expect(page.locator(".ideas-filter-chip")).toHaveCount(3);
  await page.getByRole("button", { name: "Filters" }).click();
  const reopened = page.getByRole("dialog", { name: "Filters" });
  await expect(reopened.getByRole("combobox", { name: "Age" })).toHaveValue("");
  await expect(reopened.getByRole("combobox", { name: "Relationship" })).toHaveValue("friend");
  await reopened.getByRole("button", { name: "Close", exact: true }).click();
});

test("Saved has the FAB and ephemeral save success has no redundant dismiss button", async ({ page }) => {
  await seed(page);
  await page.goto("/#/ideas");
  await expect(page.getByRole("button", { name: "Create", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  await page.getByRole("dialog", { name: "Save this idea for who?" })
    .getByRole("button", { name: /Anyone/ }).click();
  const success = page.locator(".app-toast.toast-success");
  await expect(success).toContainText("Saved to ideas");
  await expect(success.getByRole("button", { name: "Dismiss notification" })).toHaveCount(0);
  // A failure is actionable and stays until manually dismissed.
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create", exact: true })).toBeVisible();
});


test("Home and People share compact 0d badge with urgent red state", async ({page}) => {
  const data = fixture();
  data.people[0].birthday = "1997-11-15";
  data.events[0].date = "2026-11-15";
  await seed(page, data);
  await expect(page.locator(".occasion-chip").first().locator(".countdown-badge")).toHaveText("0d");
  await expect(page.locator(".occasion-chip").first().locator(".countdown-badge"))
    .toHaveClass(/countdown-badge--now/);
  await page.goto("/#/people");
  const badge = page.locator(".person-birthday-countdown").first();
  await expect(badge).toHaveText("0d");
  await expect(badge.locator("svg")).toHaveCount(1);
  await expect(badge).toHaveClass(/countdown-badge--now/);
});

test("Home greeting waves once, collapses after scrolling and returns only on full reload", async ({page}) => {
  await seed(page);
  await expect(page.locator(".home-greeting")).toContainText("Hi, Polina");
  await expect(page.locator(".home-greeting")).not.toHaveClass(/is-dismissed/);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(24);
  await expect(page.locator(".home-greeting")).toHaveClass(/is-dismissed/);
  await page.goto("/#/people");
  await page.goto("/#/");
  await expect(page.locator(".home-greeting")).toHaveClass(/is-dismissed/);
  await page.reload();
  await expect(page.locator(".home-greeting")).not.toHaveClass(/is-dismissed/);
});

test("Home gift gallery displays a simple full-height placeholder for empty occasions", async ({page}) => {
  await seed(page);
  const productHeight = await page.locator(".focus-gifts .home-product").first()
    .evaluate(el => el.getBoundingClientRect().height);
  await page.getByRole("button", {name:/Our anniversary/}).click();
  await expect(page.locator(".focus-head h2")).toHaveText("Our anniversary");
  const empty = page.locator(".home-empty-gifts");
  await expect(empty).toContainText("Add gifts with the + button");
  await expect(page.locator(".focus-gifts .home-product")).toHaveCount(0);
  const emptyHeight = await empty.evaluate(el => el.getBoundingClientRect().height);
  expect(Math.abs(emptyHeight - productHeight)).toBeLessThanOrEqual(2);
  await expect(page.getByRole("button", {name:"Create", exact:true})).toBeVisible();
});

test("Scrolling Coming up chooses the nearest centered occasion without snap-back", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await seed(page);
  const track = page.locator(".upcoming-track");
  const finalScroll = await track.evaluate(el => {
    el.scrollLeft = el.scrollWidth;
    return el.scrollLeft;
  });
  expect(finalScroll).toBeGreaterThan(0);
  await expect(page.locator(".focus-head h2")).toHaveText("Our anniversary");
  const afterSelection = await track.evaluate(el => el.scrollLeft);
  expect(afterSelection).toBeGreaterThanOrEqual(finalScroll - 2);
  // Taps still directly select and bring the chosen tile back into view.
  await page.locator(".occasion-chip").first().click();
  await expect(page.locator(".focus-head h2")).toHaveText("Anna's birthday");
});


test("Event hero shows contextual cover, date, navigation and spent-only budget", async ({page}) => {
  await seed(page);
  await page.goto("/#/events/e1");
  await expect(page.locator(".event-hero img")).toBeVisible();
  await expect(page.locator(".event-hero-date")).toContainText("November");
  await expect(page.locator(".event-identity h1")).toHaveText("Anna's birthday");
  await expect(page.locator(".event-person-summary")).toHaveCount(0);
  await expect(page.locator(".event-single-gifts .event-person-gifts-identity")).toContainText("Anna");
  const budget = page.locator(".event-summary-budget");
  await expect(budget).toContainText("1 900 ₽");
  await expect(budget).toContainText("10 000 ₽");
  const progress = budget.getByRole("progressbar");
  await expect(progress).toHaveAttribute("aria-valuenow","1900");
  await expect(progress).toHaveAttribute("aria-valuemax","10000");
  await page.getByRole("button",{name:"To buy",exact:true}).click();
  await expect(page.locator(".event-single-gifts .event-gift-entry")).toHaveCount(2);
  await page.getByRole("button",{name:"Bought",exact:true}).click();
  await expect(page.locator(".event-single-gifts .event-gift-entry")).toHaveCount(1);
});

test("Multi-person Event filters each recipient independently and scrolls 3+ gifts", async ({page}) => {
  const data = fixture();
  data.gifts.push(
    {...data.gifts[1], id:"g5", eventId:"e2", personId:"p1",name:"Soft blanket"},
    {...data.gifts[2], id:"g6", eventId:"e2", personId:"p1",name:"Another art book"},
    {...data.gifts[1], id:"g7", eventId:"e2", personId:"p1",name:"Warm socks"},
  );
  await seed(page,data);
  await page.goto("/#/events/e2");
  const recipients = page.locator(".event-recipient-group");
  await expect(recipients).toHaveCount(3);
  await expect(page.locator(".event-avatar-stack .event-stack-avatar")).toHaveCount(3);
  const anna = recipients.first();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(3);
  await expect(anna.locator(".event-gift-shelf")).toHaveAttribute("data-scrollable","true");
  const row = anna.locator(".event-gift-shelf");
  const dimensions = await row.evaluate(el=>({
    client:el.clientWidth, content:el.scrollWidth,
    overflow:getComputedStyle(el).overflowX,
  }));
  expect(dimensions.content).toBeGreaterThan(dimensions.client);
  expect(dimensions.overflow).toBe("auto");
  await anna.getByRole("button",{name:"Bought",exact:true}).click();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(0);
  const denis = recipients.nth(1);
  await expect(denis.locator(".event-gift-entry")).toHaveCount(1);
  await anna.getByRole("button",{name:"All",exact:true}).click();
  await expect(anna.locator(".event-gift-entry")).toHaveCount(3);
});

test("Occasion cover presets map holidays, birthdays and other occasions correctly", async ({page}) => {
  const data = fixture();
  data.events[0].image = "";
  data.events[1].image = "";
  data.events[2].image = "";
  await seed(page,data);
  for(const [route,kind] of [["e1","birthday"],["e2","winter"],["e3","romantic"]]) {
    await page.goto(`/#/events/${route}`);
    await expect(page.locator(".event-hero-image")).toHaveAttribute("src",new RegExp(`cover-${kind}.*\\.jpg`));
    await expect(page.locator(".event-hero-image")).toHaveAttribute("data-cover-kind",kind);
    await expect.poll(() => page.locator(".event-hero-image").evaluate((el) =>
      (el as HTMLImageElement).naturalWidth)).toBeGreaterThanOrEqual(1500);
    const cover = await page.locator(".event-hero-image").evaluate((el) => ({
      naturalWidth: (el as HTMLImageElement).naturalWidth,
      naturalHeight: (el as HTMLImageElement).naturalHeight,
      fit: getComputedStyle(el).objectFit,
      transform: getComputedStyle(el).transform,
    }));
    expect(cover.naturalHeight).toBeGreaterThanOrEqual(750);
    expect(cover.fit).toBe("cover");
    expect(cover.transform).toBe("none");
  }
});


test("Event hero uses one overlapping profile-style panel on 390px and 320px screens", async ({page}) => {
  await seed(page);
  for(const width of [390,320]){
    await page.setViewportSize({width,height:780});
    await page.goto("/#/events/e1");
    const geometry=await page.evaluate(()=>{
      const hero=document.querySelector(".event-overview .event-hero")!.getBoundingClientRect();
      const panel=document.querySelector(".event-overview-panel")!.getBoundingClientRect();
      const style=getComputedStyle(document.querySelector(".event-overview .event-hero")!);
      return {heroBottom:hero.bottom,panelTop:panel.top,
        heroLeft:hero.left,panelLeft:panel.left,
        heroRight:hero.right,panelRight:panel.right,
        lowerRadius:style.borderBottomLeftRadius};
    });
    expect(geometry.heroBottom-geometry.panelTop).toBeGreaterThanOrEqual(24);
    expect(geometry.heroBottom-geometry.panelTop).toBeLessThanOrEqual(30);
    expect(Math.abs(geometry.heroLeft-geometry.panelLeft)).toBeLessThan(1);
    expect(Math.abs(geometry.heroRight-geometry.panelRight)).toBeLessThan(1);
    expect(geometry.lowerRadius).toBe("0px");
    const heroTop = await page.locator(".event-overview .event-hero")
      .evaluate(el => el.getBoundingClientRect().top);
    expect(heroTop).toBe(0);
    await expect(page.locator(".event-overview-panel .event-identity-type")).toHaveCount(0);
    await expect(page.locator(".event-overview-panel .event-identity h1")).toHaveText("Anna's birthday");
    await expect(page.locator(".event-overview-panel .event-summary-budget")).toHaveCount(1);
    await expect(page.locator(".event-overview-panel .event-summary-recipients")).toHaveCount(0);
  }
});
test("Multi-recipient event has left-hand count, right-hand avatars and one summary sheet", async ({page})=>{
  await seed(page);
  await page.goto("/#/events/e2");
  const panel=page.locator(".event-overview-panel");
  await expect(panel).toHaveCount(1);
  await expect(panel.locator(".event-recipient-copy")).toContainText("3 recipients");
  await expect(panel.locator(".event-avatar-stack .event-stack-avatar")).toHaveCount(3);
  const horizontal=await panel.locator(".event-recipient-summary").evaluate((el)=>{
    const count=el.querySelector(".event-recipient-copy")!.getBoundingClientRect();
    const avatars=el.querySelector(".event-avatar-stack")!.getBoundingClientRect();
    return {countRight:count.right,avatarLeft:avatars.left};
  });
  expect(horizontal.countRight).toBeLessThanOrEqual(horizontal.avatarLeft+1);
  await expect(panel.locator(".event-summary-budget")).toHaveCount(1);
  await expect(page.locator(".event-recipient-group")).toHaveCount(3);
});


test("Event and People date pills share geometry, centering, and appearance", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events/e1");
  const eventStyle = await page.locator(".event-hero-date").evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cover = document.querySelector(".event-hero")!.getBoundingClientRect();
    const css = getComputedStyle(el);
    return {
      height: rect.height, pillCenter: rect.left + rect.width / 2,
      coverCenter: cover.left + cover.width / 2, background: css.backgroundColor,
      padding: css.padding, radius: css.borderRadius,
      fontSize: css.fontSize, fontWeight: css.fontWeight, bottomGap: cover.bottom - rect.bottom,
    };
  });
  expect(Math.abs(eventStyle.pillCenter - eventStyle.coverCenter)).toBeLessThan(1);
  await page.goto("/#/people/p1");
  const personStyle = await page.locator(".person-profile-birthday").evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cover = document.querySelector(".person-profile-cover")!.getBoundingClientRect();
    const css = getComputedStyle(el);
    return {
      height: rect.height, pillCenter: rect.left + rect.width / 2,
      coverCenter: cover.left + cover.width / 2, background: css.backgroundColor,
      padding: css.padding, radius: css.borderRadius,
      fontSize: css.fontSize, fontWeight: css.fontWeight, bottomGap: cover.bottom - rect.bottom,
    };
  });
  expect(Math.abs(personStyle.pillCenter - personStyle.coverCenter)).toBeLessThan(1);
  for (const key of ["height", "background", "padding", "radius", "fontSize", "fontWeight", "bottomGap"] as const) {
    expect(eventStyle[key], key).toBe(personStyle[key]);
  }
});

test("Multi-recipient headings and avatar portraits open the matching People profile", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events/e2");

  const summary = page.locator(".event-overview-panel");
  await expect(summary.locator(".event-summary-recipients")).toHaveCount(1);
  await expect(summary.locator(".event-stack-link")).toHaveCount(3);
  await expect(summary.locator(".event-recipient-summary")).toContainText("3 recipients");

  const topBorder = await summary.locator(".event-summary-recipients").evaluate(el => getComputedStyle(el).borderTopWidth);
  const budgetBorder = await summary.locator(".event-summary-budget").evaluate(el => getComputedStyle(el).borderTopWidth);
  expect(topBorder).toBe("0px");
  expect(budgetBorder).not.toBe("0px");

  const groupBorders = await page.locator(".event-recipient-group").evaluateAll(
    elements => elements.map(el => getComputedStyle(el).borderBottomWidth),
  );
  expect(groupBorders).toEqual(["0px", "0px", "0px"]);

  await page.locator(".event-stack-link[aria-label=\"Open Denis's profile\"]").click();
  await expect(page).toHaveURL(/#\/people\/p2$/);
  await expect(page.locator(".person-profile-identity h1")).toHaveText("Denis");

  await page.goto("/#/events/e2");
  await page.locator(".event-recipient-group").first().getByRole("link", { name: "Open Anna's profile" }).click();
  await expect(page).toHaveURL(/#\/people\/p1$/);
  await expect(page.locator(".person-profile-identity h1")).toHaveText("Anna");
});

test("Single-recipient occasions show person only beside gifts, not in overview", async ({ page }) => {
  await seed(page);
  for(const id of ["e1", "e3"]) {
    await page.goto(`/#/events/${id}`);
    await expect(page.locator(".event-overview-panel .event-summary-recipients")).toHaveCount(0);
    await expect(page.locator(".event-overview-panel .event-summary-budget")).toHaveCount(1);
    await expect(page.locator(".event-single-gifts .event-person-gifts-identity")).toHaveCount(1);
  }
});


test("Profile and event covers are edge-to-edge rectangles; event pictures fit the 2:1 hero", async ({ page }) => {
  const data = fixture();
  data.events[0].image = "";
  data.events[1].image = "";
  data.events[2].image = "";
  data.events[2].name = "Housewarming party";
  await seed(page, data);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/people/p1");
    const profile = await page.locator(".person-profile-cover").evaluate(el => {
      const rect = el.getBoundingClientRect();
      const shell = document.querySelector(".app-shell")!.getBoundingClientRect();
      return {
        radius: getComputedStyle(el).borderTopLeftRadius,
        left: rect.left - shell.left,
        width: rect.width - shell.width,
      };
    });
    expect(profile.radius).toBe("0px");
    expect(Math.abs(profile.left)).toBeLessThan(1);
    expect(Math.abs(profile.width)).toBeLessThan(1);
    for (const [id, kind] of [["e1","birthday"],["e2","winter"],["e3","celebration"]]) {
      await page.goto(`/#/events/${id}`);
      const cover = page.locator(".event-hero-image");
      await expect(cover).toHaveAttribute("data-cover-kind", kind);
      await expect.poll(() => cover.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBeGreaterThanOrEqual(1500);
      const geometry = await page.locator(".event-hero").evaluate(el => {
        const photo = el.querySelector(".event-hero-image") as HTMLImageElement;
        const rect = el.getBoundingClientRect();
        const shell = document.querySelector(".app-shell")!.getBoundingClientRect();
        return {
          ratio: rect.width / rect.height,
          radius: getComputedStyle(el).borderTopLeftRadius,
          left: rect.left - shell.left,
          width: rect.width - shell.width,
          fit: getComputedStyle(photo).objectFit,
          naturalRatio: photo.naturalWidth / photo.naturalHeight,
        };
      });
      expect(geometry.radius).toBe("0px");
      expect(geometry.ratio).toBeCloseTo(2, 1);
      expect(geometry.naturalRatio).toBeCloseTo(2, 1);
      expect(geometry.fit).toBe("cover");
      expect(Math.abs(geometry.left)).toBeLessThan(1);
      expect(Math.abs(geometry.width)).toBeLessThan(1);
    }
  }
});


test("One FAB gift sheet saves either an independent idea or an occasion gift",async ({page})=>{
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button",{name:"Saved",exact:true}).click();
  await page.getByRole("button",{name:"Create",exact:true}).click();
  await expect(page.locator(".fab-menu button")).toHaveCount(3);
  await page.getByRole("button",{name:"Add gift",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Add gift"})).toBeVisible();
  const saveTo=page.getByRole("combobox",{name:"Save to"});
  await expect(saveTo).toHaveValue("");
  await page.getByLabel("Gift name",{exact:true}).fill("Bamboo notebook");
  await page.getByRole("button",{name:"Save idea",exact:true}).click();
  let current=await readData(page);
  expect(current.ideas.some(i=>i.name==="Bamboo notebook")).toBe(true);
  expect(current.gifts.some(g=>g.name==="Bamboo notebook")).toBe(false);

  await page.getByRole("button",{name:"Create",exact:true}).click();
  await page.getByRole("button",{name:"Add gift",exact:true}).click();
  await page.getByRole("combobox",{name:"Save to"}).selectOption("e2");
  await expect(page.getByRole("combobox",{name:"For"})).toBeVisible();
  await page.getByRole("combobox",{name:"For"}).selectOption("p2");
  await page.getByLabel("Gift name",{exact:true}).fill("Warm scarf");
  await page.getByLabel("Price (₽)").fill("950");
  await page.getByRole("button",{name:"Add to occasion",exact:true}).click();
  current=await readData(page);
  expect(current.gifts.find(g=>g.name==="Warm scarf")).toMatchObject({
    eventId:"e2",personId:"p2",status:"to_buy",price:950
  });
  expect(current.ideas.some(i=>i.name==="Warm scarf")).toBe(false);
});
