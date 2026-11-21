import { test, expect, type Page } from "@playwright/test";
import { fixture, readData, seed } from "./fixtures";
import { applySetup, nextHanukkah, nextOccurrence } from "../src/domain/onboarding";
import { addFirstPerson, saveFirstIdea, planFirstGift, setFirstGiftBought } from "../src/domain/onboardingJourney";
import type { DiscoverySuggestion } from "../src/domain/discoveryTypes";

const coach = (page: Page) => page.getByRole("region", { name: "Givvy walkthrough" });

async function addPersonViaRealFab(page: Page, name: string, month: string, day: string) {
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add person" })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Month", { exact: true }).selectOption(month);
  await page.getByLabel("Day", { exact: true }).selectOption(day);
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page).toHaveURL(/#\/people\/[^/]+$/);
  await expect(coach(page)).toContainText(`Here's ${name}!`);
}

async function saveIdeaThroughRealDiscover(page: Page, name: string) {
  await coach(page).getByRole("button", { name: "Find a gift idea" }).click();
  await expect(page).toHaveURL(/#\/ideas$/);
  await expect(page.locator(".ideas-discovery-card")).toBeVisible();
  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Save this idea for who?" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name }).click();
  await expect(page).toHaveURL(/#\/events$/);
  await expect(coach(page)).toContainText("Their birthday is in Events");
}

async function planGiftOnRealEvent(page: Page) {
  await page.locator('.calendar-event-card[data-guided-event="true"]').click();
  await expect(page).toHaveURL(/#\/events\/birthday:/);
  await expect(page.locator(".event-overview")).toBeVisible();
  await coach(page).getByRole("button", { name: "Choose saved idea" }).click();
  await expect(page.getByRole("dialog", { name: /^Gift for / })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Use idea Ceramic mug" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(coach(page)).toContainText("Now it's on the shopping list");
}

test("guest learns real Home, FAB, People, Discover, Events and gift status without mandatory account", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.goto("/");
  await expect(page).toHaveURL(/#\/onboarding$/);
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
  await expect(page.getByRole("heading", { name: /Great gifts, from first thought/i })).toBeVisible();
  await page.getByRole("button", { name: "Try in the app" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(coach(page)).toContainText("Let's add your first person");

  await addPersonViaRealFab(page, "New person", "11", "28");
  let data = await readData(page);
  expect(data.people).toHaveLength(1);
  expect(data.people[0].birthday).toBe("11-28");
  expect(data.events).toHaveLength(1);
  expect(data.events[0]).toMatchObject({
    name: "New person's birthday", date: "2026-11-28", kind: "birthday",
    people: [data.people[0].id],
  });
  await expect(page.locator(".person-profile-hero")).toBeVisible();

  await saveIdeaThroughRealDiscover(page, "New person");
  data = await readData(page);
  expect(data.ideas).toHaveLength(1);
  expect(data.ideas[0]).toMatchObject({
    name: "Ceramic mug", personId: data.people[0].id,
    sourceDiscoveryId: "discovery:ceramic-mug",
  });
  expect(data.gifts).toHaveLength(0);
  await planGiftOnRealEvent(page);
  data = await readData(page);
  expect(data.gifts).toHaveLength(1);
  expect(data.gifts[0]).toMatchObject({
    eventId: data.events[0].id, personId: data.people[0].id,
    sourceIdeaId: data.ideas[0].id, status: "to_buy",
  });

  await coach(page).getByRole("button", { name: "Open gift" }).click();
  await expect(page.getByRole("dialog", { name: "Edit gift" })).toBeVisible();
  await page.getByLabel("Status").selectOption("bought");
  await page.getByRole("button", { name: "Save gift" }).click();
  expect((await readData(page)).gifts[0].status).toBe("bought");
  await expect(coach(page)).toContainText("You've got the hang of it!");
  await coach(page).getByRole("button", { name: "Go to Home" }).click();
  await expect(page).toHaveURL(/#\/$/);
  data = await readData(page);
  expect(data.settings.onboardingComplete).toBe(true);
  await page.reload();
  await expect(coach(page)).toHaveCount(0);
});

test("guest can skip from Welcome without creating demo people or gifts", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/#\/onboarding$/);
  await page.getByRole("button", { name: "Explore on my own" }).click();
  await expect(page.locator(".empty-card")).toContainText("Add your first occasion");
  expect((await readData(page)).people).toEqual([]);
  expect((await readData(page)).settings.onboardingComplete).toBe(true);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
});

test("skipping after a real person save keeps that person and their birthday", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try in the app" }).click();
  await addPersonViaRealFab(page, "Eva", "06", "03");
  await coach(page).getByRole("button", { name: "Skip tour" }).click();
  const data = await readData(page);
  expect(data.people).toHaveLength(1);
  expect(data.events).toHaveLength(1);
  expect(data.ideas).toEqual([]);
  expect(data.gifts).toEqual([]);
  expect(data.settings.onboardingComplete).toBe(true);
  await expect(coach(page)).toHaveCount(0);
});

test("in-app walkthrough resumes at the actual profile after browser reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try in the app" }).click();
  await addPersonViaRealFab(page, "Lee", "08", "20");
  await page.reload();
  await expect(coach(page)).toContainText("Here's Lee!");
  await expect(page.locator(".person-profile-hero")).toBeVisible();
  await coach(page).getByRole("button", { name: "Find a gift idea" }).click();
  await expect(page.locator(".ideas-discovery-card")).toBeVisible();
});

test("Settings preview traverses real pages but doesn't touch the user's data", async ({ page }) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.getByRole("link", { name: "Preview onboarding" }).click();
  await page.getByRole("button", { name: "Try in the app" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await addPersonViaRealFab(page, "Preview only", "07", "14");
  await saveIdeaThroughRealDiscover(page, "Preview only");
  await planGiftOnRealEvent(page);
  await coach(page).getByRole("button", { name: "I'll mark it bought later" }).click();
  await expect(coach(page)).toContainText("Your preview stays separate");
  await coach(page).getByRole("button", { name: "Back to Settings" }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  expect(await readData(page)).toEqual(original);
});

test("preview exit returns to Settings even after editing a real sandbox sheet", async ({ page }) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.getByRole("link", { name: "Preview onboarding" }).click();
  await page.getByRole("button", { name: "Try in the app" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("No persist");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await coach(page).getByRole("button", { name: "Exit preview" }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  expect(await readData(page)).toEqual(original);
});

test("in-app tour requires a birthday and prevents partially adding a person", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try in the app" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Date needed");
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page.getByRole("status")).toContainText("please enter a name and birthday");
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
  await page.getByLabel("Month", { exact: true }).selectOption("02");
  await page.getByLabel("Day", { exact: true }).selectOption("31");
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page.getByRole("status")).toContainText("Invalid birthday");
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
});

test("legacy onboarding helper operations remain additive and independent", () => {
  const start = fixture();
  const one = addFirstPerson(start, "New arrival", "02-29");
  const two = addFirstPerson(one.data, "New arrival", "02-29");
  expect(two.person.id).toBe(one.person.id);
  const choice: DiscoverySuggestion = {
    id: "discovery:ceramic-mug", name: "Ceramic mug", image: "data:image/png;base64,Zg==",
    price: 1200, note: "Handmade styles", audiences: ["adult"],
    relationships: ["friend"], category: "home",
  };
  const liked = saveFirstIdea(two.data, choice, two.person.id);
  const again = saveFirstIdea(liked.data, choice, two.person.id);
  expect(again.idea.id).toBe(liked.idea.id);
  const planned = planFirstGift(again.data, liked.idea.id, two.event.id);
  const plannedAgain = planFirstGift(planned.data, liked.idea.id, two.event.id);
  expect(plannedAgain.gift.id).toBe(planned.gift.id);
  const bought = setFirstGiftBought(planned.data, planned.gift.id, true);
  expect(bought.gifts.find(g => g.id === planned.gift.id)?.status).toBe("bought");
  expect(bought.ideas.find(i => i.id === liked.idea.id)).toEqual(liked.idea);
});

test("corrupt storage remains recoverable without onboarding overwrite", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("givvy_dashboard_v3", "{bad"));
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("not been overwritten");
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Should not save");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.locator(".app-toast.toast-error")).toContainText("recovery");
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBe("{bad");
});

test("annual birthday/holiday setup utilities remain additive and preserve existing plans", () => {
  expect(nextOccurrence("11-01", "2026-11-15")).toBe("2027-11-01");
  expect(nextOccurrence("02-29", "2026-11-15")).toBe("2028-02-29");
  expect(nextHanukkah("2026-11-15")).toBe("2026-12-05");
  expect(nextHanukkah("2026-12-06")).toBe("2027-12-25");
  const d = fixture();
  const next = applySetup(d, {
    name: "Anna", birthday: "1997-11-28", holidays: ["New Year"], budget: 0,
  }, "2026-11-15");
  expect(next.people).toEqual(d.people);
  expect(next.events).toEqual(d.events);
  expect(next.gifts).toEqual(d.gifts);
});
