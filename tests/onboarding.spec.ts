import { test, expect } from "@playwright/test";
import { fixture, readData, seed } from "./fixtures";
import { applySetup, nextHanukkah, nextOccurrence } from "../src/domain/onboarding";
import { addFirstPerson, saveFirstIdea, planFirstGift, setFirstGiftBought } from "../src/domain/onboardingJourney";
import type { DiscoverySuggestion } from "../src/domain/discoveryTypes";

test("guest onboarding creates one real person, birthday, saved idea and planned gift", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.goto("/");
  await expect(page).toHaveURL(/#\/onboarding$/);
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Great gifts, from first thought/i })).toBeVisible();
  await page.getByRole("button", { name: "Try as guest" }).click();
  await page.getByLabel("Name", { exact: true }).fill("New person");
  await page.getByLabel("Birthday month").selectOption("11");
  await page.getByLabel("Birthday day").fill("28");
  await page.getByRole("button", { name: "Add person" }).click();

  await expect(page.getByRole("heading", { name: "Meet New person." })).toBeVisible();
  let d = await readData(page);
  expect(d.people).toHaveLength(1);
  expect(d.people[0].birthday).toBe("11-28");
  expect(d.events).toHaveLength(1);
  expect(d.events[0]).toMatchObject({
    name: "New person's birthday", date: "2026-11-28", kind: "birthday",
    people: [d.people[0].id],
  });
  expect(Object.values(d.events[0].budgets)).toEqual([0]);

  await page.getByRole("button", { name: "Let's find a gift" }).click();
  await expect(page.getByRole("heading", { name: "An idea for New person." })).toBeVisible();
  await expect(page.locator(".guided-polaroid")).toContainText("Ceramic mug");
  await page.getByRole("button", { name: "Save for New person" }).click();
  d = await readData(page);
  expect(d.ideas).toHaveLength(1);
  expect(d.ideas[0]).toMatchObject({
    name: "Ceramic mug", personId: d.people[0].id,
    sourceDiscoveryId: "discovery:ceramic-mug",
  });
  expect(d.gifts).toHaveLength(0);
  await expect(page.getByRole("heading", { name: "Now make a plan." })).toBeVisible();
  await expect(page.locator(".guided-event-card")).toContainText("New person's birthday");

  await page.getByRole("button", { name: "Plan this gift" }).click();
  d = await readData(page);
  expect(d.gifts).toHaveLength(1);
  expect(d.gifts[0]).toMatchObject({
    eventId: d.events[0].id, personId: d.people[0].id,
    sourceIdeaId: d.ideas[0].id, status: "to_buy",
  });
  await expect(page.locator(".guided-status-chip")).toHaveText(/To buy/);
  await page.getByRole("button", { name: "Mark as bought" }).click();
  expect((await readData(page)).gifts[0].status).toBe("bought");
  await page.getByRole("button", { name: "Move back to To buy" }).click();
  expect((await readData(page)).gifts[0].status).toBe("to_buy");
  await page.getByRole("button", { name: "Finish walkthrough" }).click();
  await expect(page.getByRole("heading", { name: "Everything in its place." })).toBeVisible();
  await page.getByRole("button", { name: "Go to Home" }).click();
  await expect(page).toHaveURL(/#\/$/);
  d = await readData(page);
  expect(d.settings.onboardingComplete).toBe(true);
  expect(d.people).toHaveLength(1);
  expect(d.ideas).toHaveLength(1);
  expect(d.gifts[0].status).toBe("to_buy");
  await page.reload();
  await expect(page).not.toHaveURL(/onboarding/);
});

test("guest can skip immediately with no invented content or account requirement", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/#\/onboarding$/);
  await page.getByRole("button", { name: "Explore the app first" }).click();
  await expect(page.locator(".empty-card")).toContainText("Add your first occasion");
  expect((await readData(page)).people).toEqual([]);
  expect((await readData(page)).settings.onboardingComplete).toBe(true);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
});

test("skipping after adding a person retains only that person and birthday", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try as guest" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Eva");
  await page.getByLabel("Birthday month").selectOption("06");
  await page.getByLabel("Birthday day").fill("03");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  const d = await readData(page);
  expect(d.people).toHaveLength(1);
  expect(d.events).toHaveLength(1);
  expect(d.ideas).toEqual([]);
  expect(d.gifts).toEqual([]);
  expect(d.settings.onboardingComplete).toBe(true);
});

test("onboarding preview can traverse the full journey without changing any personal data", async ({ page }) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.getByRole("link", { name: "Preview onboarding" }).click();
  await page.getByRole("button", { name: "Try as guest" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Preview only");
  await page.getByLabel("Birthday month").selectOption("07");
  await page.getByLabel("Birthday day").fill("14");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByRole("button", { name: "Let's find a gift" }).click();
  await page.getByRole("button", { name: "Save for Preview only" }).click();
  await page.getByRole("button", { name: "Plan this gift" }).click();
  await page.getByRole("button", { name: "Mark as bought" }).click();
  await page.getByRole("button", { name: "Finish walkthrough" }).click();
  await expect(page.getByText(/Nothing was saved to your account or device/)).toBeVisible();
  await page.getByRole("button", { name: "Back to Settings" }).click();
  const after = await readData(page);
  expect(after).toEqual(original);
});

test("onboarding preview exit leaves even partially entered details untouched", async ({ page }) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.getByRole("link", { name: "Preview onboarding" }).click();
  await page.getByRole("button", { name: "Try as guest" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Never saved");
  await page.getByRole("button", { name: "Exit preview" }).click();
  expect(await readData(page)).toEqual(original);
});

test("invalid first birthday does not save partial person or event", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try as guest" }).click();
  await page.getByLabel("Name", { exact: true }).fill("February");
  await page.getByLabel("Birthday month").selectOption("02");
  await page.getByLabel("Birthday day").fill("31");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByRole("alert")).toContainText("valid birthday");
  // An invalid draft must not create even the first local storage record.
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
});

test("onboarding helpers reuse matching records but keep Ideas and Gifts independent", () => {
  const start = fixture();
  const one = addFirstPerson(start, "New arrival", "02-29");
  const two = addFirstPerson(one.data, "New arrival", "02-29");
  expect(two.person.id).toBe(one.person.id);
  expect(two.event.id).toBe(one.event.id);
  const choice: DiscoverySuggestion = {
    id: "discovery:ceramic-mug", name: "Ceramic mug", image: "data:image/png;base64,Zg==",
    price: 1200, note: "Handmade styles and different glazes",
    audiences: ["adult"], relationships: ["friend"], category: "home",
  };
  const liked = saveFirstIdea(two.data, choice, two.person.id);
  const again = saveFirstIdea(liked.data, choice, two.person.id);
  expect(again.idea.id).toBe(liked.idea.id);
  const planned = planFirstGift(again.data, liked.idea.id, two.event.id);
  const plannedAgain = planFirstGift(planned.data, liked.idea.id, two.event.id);
  expect(plannedAgain.gift.id).toBe(planned.gift.id);
  expect(plannedAgain.gift.status).toBe("to_buy");
  const bought = setFirstGiftBought(plannedAgain.data, planned.gift.id, true);
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
