import { test, expect } from "@playwright/test";
import { fixture, image, seed, readData } from "./fixtures";
test("approved Home selection, five tabs, focus navigation and prefilled add tile", async ({
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
  await page.getByRole("button", { name: /New Year.*Dec 31/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".focus-head h2")).toHaveText("New Year");
  await page
    .getByRole("button", { name: "Add gift to New Year", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Occasion", exact: true }),
  ).toHaveValue("e2");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "Open New Year", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/events\/e2$/);
  expect(errors).toEqual([]);
});
test("FAB actions; gift photo/status, membership validation and independent idea conversion", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page
    .getByRole("button", { name: "Add gift idea", exact: true })
    .click();
  await page.getByLabel("Idea name", { exact: true }).fill("A photo idea");
  await page.getByLabel("Estimated price").fill("800");
  await page.getByLabel("Notes", { exact: true }).fill("Important note");
  await page.getByLabel("Product link").fill("https://example.com");
  await page.getByLabel("Idea photo").setInputFiles({
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
  await page.getByRole("button", { name: /A photo idea.*Saved idea/ }).click();
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
  await expect(page.locator(".status-tag.bought")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mark Scented candle as Bought", exact: true })
    .click();
  await expect(page.locator(".status-tag.bought")).toHaveCount(1);
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
test("recipient budgets, zero/overspending, missing budgets and month accounting", async ({
  page,
}) => {
  const data = fixture();
  data.events[0].budgets.p1 = 0;
  await seed(page, data);
  await expect(page.locator(".compact-budget")).toContainText("7 400 ₽");
  await expect(page.locator(".compact-budget")).toContainText(
    "7 400 ₽ over budget",
  );
  await page.goto("/#/events/e1");
  await expect(page.locator(".person-budget-row")).toContainText("0 ₽");
  await expect(page.locator(".person-budget-row")).toContainText(
    "7 400 ₽ over budget",
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Include Anna").uncheck();
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Reassign or delete");
  await page.getByLabel("Include Anna").check();
  await page.getByLabel("Budget for Anna").fill("");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.locator(".person-budget-row")).toContainText("Not set");
  expect((await readData(page)).events[0].budgets).toEqual({});
});
test("calendar, planning, people editing and contextual gift/idea creation", async ({
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
  await page.getByRole("button", { name: "Planning", exact: true }).click();
  await expect(page.locator(".month-block")).toHaveCount(3);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "People", exact: true })
    .click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jamie");
  await page.getByLabel("What they like").fill("Books");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.getByRole("link", { name: /Jamie/ }).click();
  await expect(page.getByText("Books", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit person" }).click();
  await page.getByLabel("Notes", { exact: true }).fill("A note");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.reload();
  await expect(page.getByText("A note", { exact: true })).toBeVisible();
});
test("suggestions save without a person or occasion and filters persist across tabs", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  expect((await readData(page)).ideas.at(-1).personId).toBe("");
  expect((await readData(page)).ideas.at(-1).image).toMatch(
    /^data:image\/jpeg/,
  );
  await page.getByRole("button", { name: "Skip idea", exact: true }).click();
  await expect(page.locator(".idea-spotlight h3")).toHaveText("Coffee ritual");
  await page.getByRole("button", { name: "Anna", exact: true }).click();
  await expect(page.locator(".idea-list-item")).toHaveCount(1);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ideas", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Anna", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
  await expect(
    page.getByRole("button", { name: /Original idea/ }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: /Ceramic mug.*Saved idea/ }).click();
  await page.getByLabel("Idea name", { exact: true }).fill("Unsaved");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save idea", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Changes were not saved");
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
  await expect(page.locator(".status-tag")).toHaveCount(3);
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
  await page.getByRole("button", { name: "Add gift to occasion" }).click();
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
  await page.goto("/#/people/p1");
  await page
    .getByRole("button", { name: "Edit Scented candle", exact: true })
    .click();
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
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift to occasion" }).click();
  await expect(page.getByRole("combobox", { name: "Occasion" })).toHaveValue("");
  await page.getByRole("combobox", { name: "Occasion" }).selectOption("e2");
  const personSelector = page.getByRole("combobox", { name: "For", exact: true });
  await expect(personSelector).toContainText("Jamie new");
  await personSelector.selectOption(created.id);
  await page.getByLabel("Gift name", { exact: true }).fill("Board game");
  await page.getByLabel("Price (₽)").fill("1200");
  await page.getByRole("button", { name: "Save gift", exact: true }).click();

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

test("gift editor can explicitly add a person to an occasion without inventing a budget", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Rory new");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  const created = (await readData(page)).people.find((p) => p.name === "Rory new");
  expect(created).toBeTruthy();

  await page.goto("/#/events/e1");
  await page.getByRole("button", { name: "Add gift", exact: true }).click();
  await page.getByRole("combobox", { name: "For", exact: true })
    .selectOption(created.id);
  await expect(page.locator('.section-note[role="status"]')).toContainText(
    "Saving this gift will also add Rory new"
  );
  await page.getByLabel("Gift name", { exact: true }).fill("Tea set");
  await page.getByLabel("Price (₽)").fill("850");
  await page.getByRole("button", { name: "Save gift", exact: true }).click();

  const saved = await readData(page);
  const occasion = saved.events.find((e) => e.id === "e1");
  expect(occasion.people).toContain(created.id);
  expect(Object.hasOwn(occasion.budgets, created.id)).toBe(false);
  expect(saved.gifts.find((g) => g.name === "Tea set")).toMatchObject({
    eventId: "e1",
    personId: created.id,
    status: "to_buy",
  });
  await page.reload();
  expect((await readData(page)).events.find((e) => e.id === "e1").people)
    .toContain(created.id);
});

test("empty and filled previews never overwrite personal storage or photo data", async ({ page }) => {
  await seed(page);
  const savedBefore = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: "My data" })).toHaveAttribute("aria-pressed", "true");
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
  await page.getByRole("button", { name: "My data", exact: true }).click();
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
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Temporary tester");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByText("Temporary tester")).toBeVisible();

  await page.goto("/#/settings");
  await expect(page.getByRole("button", { name: "Import JSON" })).toBeDisabled();
  await page.getByRole("button", { name: "My data", exact: true }).click();
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
  await expect(page.locator(".calendar-event-card")).toContainText("2 gifts to buy");
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
  await expect(page.locator(".calendar-event-card")).toContainText("1 gift to buy");
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
  await expect(page.getByRole("link", { name: /Tea meetup/ })).toContainText("No gifts planned yet");

  await page.getByRole("button", { name: "2026-11-28" }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Little celebration/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Show all" }).click();
  await expect(page.locator(".calendar-event-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Planning", exact: true }).click();
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
