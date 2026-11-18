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
