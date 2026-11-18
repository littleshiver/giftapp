import { test, expect } from "@playwright/test";
import { fixture, image, readData, seed } from "./fixtures";
import { ensureBirthdayOccasions } from "../src/domain/birthdays";
import type { AppData } from "../src/domain/models";

test("annual birthday plans reuse legacy records and never carry purchased gifts into next year", () => {
  const initial = fixture() as unknown as AppData;
  initial.events[0].reminderDays = 7;
  const current = ensureBirthdayOccasions(initial, "2026-11-15");
  expect(current.events.filter((e) => e.kind === "birthday" && e.people[0] === "p1")).toHaveLength(1);
  expect(current.events.find((e) => e.id === "e1")?.birthdayPersonId).toBe("p1");

  const followingYear = ensureBirthdayOccasions(current, "2026-11-29");
  const birthdayPlans = followingYear.events.filter((e) =>
    e.kind === "birthday" && e.people.length === 1 && e.people[0] === "p1");
  expect(birthdayPlans).toHaveLength(2);
  expect(birthdayPlans.map((e) => e.date).sort()).toEqual(["2026-11-28", "2027-11-28"]);
  expect(birthdayPlans.find((e) => e.date === "2027-11-28")?.reminderDays).toBe(7);
  expect(followingYear.gifts.filter((g) => g.eventId === "e1")).toHaveLength(3);
  expect(followingYear.gifts.filter((g) => g.eventId !== "e1" && birthdayPlans.some((e) => e.id === g.eventId))).toHaveLength(0);
  expect(ensureBirthdayOccasions(followingYear, "2026-11-29").events).toHaveLength(followingYear.events.length);
});

test("person birthday with no birth year generates and updates a single linked occasion", async ({ page }) => {
  await seed(page);
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jamie");
  await page.getByLabel("Month", { exact: true }).selectOption("11");
  await page.getByLabel("Day", { exact: true }).selectOption("29");
  await page.getByRole("button", { name: "Save person" }).click();
  const data = await readData(page);
  const person = data.people.find((p) => p.name === "Jamie");
  expect(person.birthday).toBe("11-29");
  expect(data.events.filter((e) => e.birthdayPersonId === person.id)).toMatchObject([
    { date: "2026-11-29", people: [person.id], kind: "birthday" },
  ]);
  await page.getByRole("link", { name: /Jamie/ }).click();
  await page.getByRole("button", { name: "Edit person" }).click();
  await page.getByLabel("Day", { exact: true }).selectOption("30");
  await page.getByRole("button", { name: "Save person" }).click();
  const updated = await readData(page);
  expect(updated.people.find((p) => p.id === person.id).birthday).toBe("11-30");
  expect(updated.events.filter((e) => e.birthdayPersonId === person.id)).toMatchObject([
    { date: "2026-11-30", people: [person.id] },
  ]);
  await page.reload();
  await expect(page.locator(".person-profile-birthday")).toContainText("Nov 30");
});

test("person portrait, interests and private gift-idea library persist without purchase states", async ({ page }) => {
  await seed(page);
  await page.goto("/#/people/p1");
  await page.getByRole("button", { name: "Edit person" }).click();
  await page.getByLabel("Good gifts").fill("Books, Ceramics");
  await page.getByLabel("Avoid gifting").fill("Strong fragrance");
  await page.getByLabel("Person photo", { exact: true }).setInputFiles({
    name: "anna.jpg", mimeType: "image/jpeg",
    buffer: Buffer.from(image("birthday").split(",")[1], "base64"),
  });
  await page.getByRole("button", { name: "Save person" }).click();
  // Photo processing uses an async image decoder/canvas. Wait until the
  // atomic save has committed before intentionally reloading the document.
  await expect.poll(async () => {
    const saved = await readData(page);
    return saved.people.find((candidate) => candidate.id === "p1")?.photo || "";
  }).toMatch(/^data:image\/jpeg;base64,/);
  await expect(page.getByRole("dialog", { name: "Edit person" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".person-profile-photo img")).toBeVisible();
  await expect(page.locator(".person-guidance-positive")).toContainText("Books, Ceramics");
  await expect(page.locator(".person-guidance-negative")).toContainText("Strong fragrance");
  await expect(page.locator(".person-detail #person-about-heading")).toHaveCount(0);
  await expect(page.getByText("Strong fragrance")).toBeVisible();
  await expect(page.getByText("Ceramic mug", { exact: true })).toBeVisible();
  await expect(page.locator(".person-detail .status-button")).toHaveCount(0);
  await expect(page.locator(".person-detail .status-tag")).toHaveCount(0);
  await expect(page.locator(".person-detail .product-card")).toHaveCount(1);
  const data = await readData(page);
  expect(data.people.find((p) => p.id === "p1").photo).toMatch(/^data:image\/jpeg;base64,/);
  await page.goto("/#/people");
  await expect(page.locator(".person-gallery-portrait img")).toHaveCount(1);
});

test("group occasion copies one person's saved idea to an independent gift snapshot", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events/e2");
  await expect(page.locator(".event-recipient-group")).toHaveCount(3);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift to occasion" }).click();
  const recipientPicker = page.getByRole("dialog", { name: "Choose recipient" });
  await recipientPicker.getByRole("button", { name: "Anna" }).click();
  const picker = page.getByRole("dialog", { name: "Gift for Anna" });
  await expect(picker.getByRole("button", { name: "Use idea Ceramic mug" })).toBeVisible();
  await picker.getByRole("button", { name: "Use idea Ceramic mug" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
  await expect(page.getByLabel("Gift name", { exact: true })).toHaveValue("Ceramic mug");
  await page.getByLabel("Price (₽)").fill("1400");
  await page.getByRole("button", { name: "Save gift" }).click();
  const saved = await readData(page);
  const gift = saved.gifts.find((g) => g.eventId === "e2" && g.name === "Ceramic mug");
  expect(gift).toMatchObject({ personId: "p1", sourceIdeaId: "i1", price: 1400, status: "to_buy" });
  expect(saved.ideas.find((i) => i.id === "i1").price).toBe(1200);
  await page.goto("/#/people/p1");
  await expect(page.locator(".person-ideas .product-card")).toHaveCount(1);
  await expect(page.locator(".person-detail .status-button")).toHaveCount(0);
});

test("single-recipient birthday has no group plan and only accepts the celebrant", async ({ page }) => {
  await seed(page);
  await page.goto("/#/events/e1");
  await expect(page.locator(".event-single-gifts")).toBeVisible();
  await expect(page.locator(".event-recipient-groups")).toHaveCount(0);
  await expect(page.locator(".event-person-summary")).toContainText("Anna");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift to occasion" }).click();
  await expect(page.getByRole("dialog", { name: "Gift for Anna" })).toBeVisible();
  await page.getByRole("button", { name: "Add a new gift" }).click();
  await expect(page.getByRole("combobox", { name: "For" })).toHaveValue("p1");
  await expect(page.getByRole("combobox", { name: "For" }).locator("option")).toHaveCount(2);
});

test("People gallery: high-resolution portraits, birthday-only metadata and empty preview", async ({page}) => {
  await seed(page);
  const personal = await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"));
  await page.goto("/#/settings");
  await page.getByRole("button", {name:"Filled",exact:true}).click();
  await page.goto("/#/people");
  const cards = page.locator(".person-gallery-card");
  await expect(cards).toHaveCount(10);
  const mira = cards.filter({has:page.getByText("Mira",{exact:true})});
  await expect(mira).toContainText("Nov 28");
  await expect(page.locator(".person-gallery-hint")).toHaveCount(0);
  await expect(page.locator(".person-gallery-birthday")).toHaveCount(10);
  await expect(page.locator(".demo-person-sprite")).toHaveCount(4);
  await expect(page.locator(".person-gallery-portrait")).toHaveCount(10);
  await expect(page.locator(".people-search")).toHaveCount(0);
  const portraitDimensions = await page.locator(".demo-person-sprite").first().evaluate(async el => {
    const imageUrl = getComputedStyle(el).backgroundImage.slice(5, -2);
    const img = new Image();
    img.src = imageUrl;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(portraitDimensions).toEqual([1024,1024]);
  await mira.click();
  await expect(page.locator(".person-profile-photo .demo-person-sprite")).toBeVisible();
  await expect(page.locator(".person-guidance-positive")).toContainText("ceramics");
  await expect(page.locator(".person-guidance-negative")).toContainText("fragrances");
  await expect(page.getByRole("heading",{name:"About"})).toHaveCount(0);
  await expect(page.locator(".person-ideas .gift-card")).toHaveCount(1);
  await page.goto("/#/settings");
  await page.getByRole("button", {name:"Empty",exact:true}).click();
  await page.goto("/#/people");
  await expect(page.locator(".person-gallery-card")).toHaveCount(0);
  await expect(page.getByText(/Keep your favorite people/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBe(personal);
});

test("People birthday badge is compact, only for birthdays within 30 days and keeps equal tile heights", async ({page}) => {
  const data = fixture();
  // seed() freezes the browser at 2026-11-15; compute dates against that
  // same clock instead of the runner's actual current date.
  const dates = {near:"11-25",far:"01-04"};
  data.people[0].birthday = dates.near;
  for(const person of data.people.slice(1)) person.birthday = dates.far;
  await page.setViewportSize({width:320,height:844});
  await seed(page,data);
  await page.goto("/#/people");
  const cards = page.locator(".person-gallery-card");
  await expect(cards.first().locator(".person-birthday-countdown")).toContainText("10d");
  await expect(page.locator(".person-birthday-countdown")).toHaveCount(1);
  await expect(page.locator(".person-gallery-hint")).toHaveCount(0);
  const geometry = await page.locator(".people-gallery-grid").evaluate(el => {
    const cards = [...el.querySelectorAll(".person-gallery-card")];
    const rects = cards.map(card => card.getBoundingClientRect());
    return {
      columns:getComputedStyle(el).gridTemplateColumns.split(" ").length,
      heights:rects.map(r=>r.height),
      widths:rects.map(r=>r.width),
      overflow:document.documentElement.scrollWidth-innerWidth,
    };
  });
  expect(geometry.columns).toBe(3);
  expect(Math.max(...geometry.heights)-Math.min(...geometry.heights)).toBeLessThanOrEqual(1);
  expect(Math.max(...geometry.widths)-Math.min(...geometry.widths)).toBeLessThanOrEqual(1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  const alignment = await cards.first().evaluate((card) => {
    const title = card.querySelector(".person-gallery-info > strong")!.getBoundingClientRect();
    const row = card.querySelector(".person-gallery-birthday")!.getBoundingClientRect();
    const icon = card.querySelector(".person-gallery-birthday svg")!.getBoundingClientRect();
    const text = card.querySelector(".person-gallery-birthday > span")!.getBoundingClientRect();
    const badgeIcon = card.querySelector(".person-birthday-countdown svg")!.getBoundingClientRect();
    const badgeText = card.querySelector(".person-birthday-countdown > span")!.getBoundingClientRect();
    const center = (box: DOMRect) => (box.top + box.bottom) / 2;
    return {
      nameToDateGap:row.top-title.bottom,
      dateIconCenterDiff:Math.abs(center(icon)-center(text)),
      badgeIconCenterDiff:Math.abs(center(badgeIcon)-center(badgeText)),
    };
  });
  expect(alignment.nameToDateGap).toBeLessThanOrEqual(5);
  expect(alignment.dateIconCenterDiff).toBeLessThanOrEqual(1.5);
  expect(alignment.badgeIconCenterDiff).toBeLessThanOrEqual(1.5);
});
