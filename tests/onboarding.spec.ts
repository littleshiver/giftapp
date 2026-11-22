import { test, expect, type Page } from "@playwright/test";
import { fixture, readData, seed } from "./fixtures";
import { applySetup, nextHanukkah, nextOccurrence } from "../src/domain/onboarding";
import { addFirstPerson, saveFirstIdea, planFirstGift, setFirstGiftBought } from "../src/domain/onboardingJourney";
import type { DiscoverySuggestion } from "../src/domain/discoveryTypes";

const coach = (page: Page) => page.getByRole("region", { name: "Givvy walkthrough" });
const finishing = (page: Page) => page.getByRole("dialog", { name: "Tutorial complete" });
test.beforeEach(async ({page}) => { page.setDefaultTimeout(7000); });

async function addPersonViaRealFab(page: Page, name: string, month: string, day: string) {
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(coach(page)).toContainText("Now choose Add person");
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add person" })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Month", { exact: true }).selectOption(month);
  await page.getByLabel("Day", { exact: true }).selectOption(day);
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page).toHaveURL(/#\/people\/[^/]+$/);
  await expect(coach(page)).toContainText(`Here's ${name}`);
}
async function saveIdeaThroughRealDiscover(page: Page, name: string) {
  await coach(page).getByRole("button", { name: "Let's find an idea" }).click();
  await expect(page).toHaveURL(/#\/ideas$/);
  await expect(coach(page)).toContainText("First, try swiping left");
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Ceramic mug");
  await page.getByRole("button", { name: "Dislike idea", exact: true }).click();
  await expect(coach(page)).toContainText("Now swipe right");
  await expect(page.locator(".ideas-discovery-caption")).toHaveText("Throw blanket");
  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Save this idea for who?" })).toBeVisible();
  await expect(page.getByText("Great! Now choose who to save")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name }).click();
  await expect(page).toHaveURL(/#\/events$/);
  await expect(coach(page)).toContainText("Birthday added!");
}
async function planGiftOnRealEvent(page: Page) {
  await page.locator('.calendar-event-card[data-guided-event="true"]').click();
  await expect(page).toHaveURL(/#\/events\/birthday:/);
  await expect(page.locator(".event-overview")).toBeVisible();
  await expect(page.locator(".event-gift-empty")).toContainText("No gifts planned yet");
  await page.locator(".event-gift-empty").getByRole("button",{name:"Choose a gift"}).click();
  await expect(page.getByRole("dialog", { name: /^Gift for / })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Use idea Throw blanket" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(coach(page)).toContainText("Here's your gift");
}

test("Welcome is compact and does not show tester-only preview exit", async ({page}) => {
  await page.goto("/#/onboarding?preview=1");
  await expect(page.getByRole("heading", { name: "Your first gift plan starts here." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start guided tour" })).toBeVisible();
  await expect(page.getByText("Exit preview")).toHaveCount(0);
  await expect(page.getByText("Gifting made lighter")).toHaveCount(0);
  await expect(page.locator(".guided-intro-flow, .guided-intro-steps")).toHaveCount(0);
});

test("guest uses real Home/FAB, People, swipe gestures, Events and read-only gift preview", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/#\/onboarding$/);
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(coach(page)).toContainText("I'll show you around");

  await addPersonViaRealFab(page, "New person", "11", "28");
  let d = await readData(page);
  expect(d.people).toHaveLength(1);
  expect(d.people[0].birthday).toBe("11-28");
  expect(d.events).toHaveLength(1);
  expect(d.events[0]).toMatchObject({
    name: "New person's birthday", kind: "birthday", people: [d.people[0].id],
  });
  await expect(page.locator(".person-profile-hero")).toBeVisible();

  await saveIdeaThroughRealDiscover(page, "New person");
  d = await readData(page);
  expect(d.ideas).toHaveLength(1);
  expect(d.ideas[0]).toMatchObject({
    name: "Throw blanket", personId: d.people[0].id,
    sourceDiscoveryId: "discovery:throw-blanket",
  });
  expect(d.gifts).toHaveLength(0);
  await planGiftOnRealEvent(page);
  d = await readData(page);
  expect(d.gifts).toHaveLength(1);
  expect(d.gifts[0]).toMatchObject({
    eventId: d.events[0].id, personId: d.people[0].id,
    sourceIdeaId: d.ideas[0].id, status: "to_buy",
  });

  await page.locator('[data-tour-gift="true"] .product-open').click();
  const preview = page.getByRole("dialog", { name: "Gift details" });
  await expect(preview).toContainText("Throw blanket");
  await expect(preview).toContainText("New person's birthday");
  await expect(preview.getByRole("button", { name: "Edit gift" })).toBeVisible();
  await preview.getByRole("button", { name: "Mark as bought" }).click();
  expect((await readData(page)).gifts[0].status).toBe("bought");
  await expect(finishing(page)).toContainText("You've got this!");
  await expect(finishing(page)).toContainText("Your plans are saved to your account");
  await finishing(page).getByRole("button", { name: /Go to Home/ }).click();
  await expect(page).toHaveURL(/#\/$/);
  d = await readData(page);
  expect(d.settings.onboardingComplete).toBe(true);
  await page.reload();
  await expect(coach(page)).toHaveCount(0);
});

test("first-run can finish without pretending the present was purchased", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await addPersonViaRealFab(page, "Eva", "07", "14");
  await saveIdeaThroughRealDiscover(page, "Eva");
  await planGiftOnRealEvent(page);
  await coach(page).getByRole("button", { name: "View gift" }).click();
  await page.getByRole("dialog", { name: "Gift details" })
    .getByRole("button", { name: "I'll buy it later — finish tour" }).click();
  await expect(finishing(page)).toBeVisible();
  expect((await readData(page)).gifts[0].status).toBe("to_buy");
});

test("guest can skip Welcome and contextual hints without invented content", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore on my own" }).click();
  await expect(page.getByRole("heading",{name:"No upcoming occasions"})).toBeVisible();
  expect((await readData(page)).people).toEqual([]);
  expect((await readData(page)).settings.onboardingComplete).toBe(true);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
});

test("skipping after real person save retains only that person and birthday", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await addPersonViaRealFab(page, "Eva", "06", "03");
  await coach(page).getByRole("button", { name: "Skip tutorial" }).click();
  const d = await readData(page);
  expect(d.people).toHaveLength(1);
  expect(d.events).toHaveLength(1);
  expect(d.ideas).toEqual([]);
  expect(d.gifts).toEqual([]);
  expect(d.settings.onboardingComplete).toBe(true);
  await expect(coach(page)).toHaveCount(0);
});

test("tour remembers the real profile after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await addPersonViaRealFab(page, "Lee", "08", "20");
  await page.reload();
  await expect(coach(page)).toContainText("Here's Lee");
  await coach(page).getByRole("button", { name: "Let's find an idea" }).click();
  await expect(page.locator(".ideas-discovery-card")).toBeVisible();
});

test("step controls let the guest move on even when no gift was bought", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await addPersonViaRealFab(page, "Mira", "09", "10");
  await coach(page).getByRole("button", { name: "Let's find an idea" }).click();
  await coach(page).getByRole("button", { name: "Next tour step" }).click();
  await expect(coach(page)).toContainText("Now swipe right");
  await coach(page).getByRole("button", { name: "Previous tour step" }).click();
  await expect(coach(page)).toContainText("First, try swiping left");
  await coach(page).getByRole("button", { name: "Next tour step" }).click();
  await coach(page).getByRole("button", { name: "Next tour step" }).click();
  await expect(page).toHaveURL(/#\/events$/);
  await coach(page).getByRole("button", { name: "Next tour step" }).click();
  await expect(page).toHaveURL(/#\/events\/birthday:/);
  await coach(page).getByRole("button", { name: "Next tour step" }).click();
  await expect(finishing(page)).toBeVisible();
});

test("Settings preview traverses real app but never mutates personal data", async ({ page }) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.goto("/#/settings/developer");
  await page.goto("/#/onboarding?preview=1");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await addPersonViaRealFab(page, "Preview only", "07", "14");
  await saveIdeaThroughRealDiscover(page, "Preview only");
  await planGiftOnRealEvent(page);
  await coach(page).getByRole("button", { name: "View gift" }).click();
  await page.getByRole("dialog", { name: "Gift details" })
    .getByRole("button", { name: "I'll buy it later — finish tour" }).click();
  await expect(finishing(page)).toBeVisible();
  await finishing(page).getByRole("button", { name: /Go to Home/ }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  expect(await readData(page)).toEqual(original);
});

test("preview exit leaves an unfinished real editor uncommitted", async ({ page }) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.goto("/#/settings/developer");
  await page.goto("/#/onboarding?preview=1");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("No persist");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await coach(page).getByRole("button", { name: "Exit tutorial preview" }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  expect(await readData(page)).toEqual(original);
});

test("tour requires a valid first birthday and does not partially save", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Date needed");
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page.getByRole("status")).toContainText("please enter a name and birthday");
  expect(await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3"))).toBeNull();
  await page.getByLabel("Month", { exact: true }).selectOption("02");
  await page.getByLabel("Day", { exact: true }).selectOption("31");
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page.getByRole("status")).toContainText("Enter a valid birthday.");
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


test("spotlight exposes actual actions and Discover keeps its normal geometry", async ({page}) => {
  await page.setViewportSize({width:390,height:740});
  await page.goto("/");
  await page.getByRole("button", {name:"Start guided tour"}).click();
  await expect(page.locator(".tour-spotlight-cutout")).toBeVisible();
  await addPersonViaRealFab(page,"Test person","12","15");
  await coach(page).getByRole("button",{name:"Let's find an idea"}).click();
  const card = page.locator(".ideas-discovery-card");
  await expect(card).toBeVisible();
  const guided = await card.boundingBox();
  await coach(page).getByRole("button",{name:"Skip tutorial"}).click();
  await expect(page.locator(".tour-spotlight-layer")).toHaveCount(0);
  const ordinary = await card.boundingBox();
  expect(guided).not.toBeNull();
  expect(ordinary).not.toBeNull();
  expect(Math.abs(guided!.width-ordinary!.width)).toBeLessThan(2);
  expect(Math.abs(guided!.height-ordinary!.height)).toBeLessThan(2);
});

test("an empty occasion guides people to saved ideas, then a gift opens on its own page",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:"Start guided tour"}).click();
  await addPersonViaRealFab(page,"Ada","12","15");
  await saveIdeaThroughRealDiscover(page,"Ada");
  await page.locator('[data-guided-event="true"]').click();
  await coach(page).getByRole("button",{name:"Skip tutorial"}).click();
  const group=page.locator(".event-recipient-group");
  await expect(group.locator(".event-gift-empty")).toContainText("No gifts planned yet");
  await group.locator(".event-gift-empty").getByRole("button",{name:"Choose a gift"}).click();
  const picker=page.getByRole("dialog",{name:/^Gift for /});
  await expect(picker.getByRole("button",{name:/Saved ideas/})).toBeVisible();
  await expect(picker.getByRole("button",{name:/From Givvy/})).toBeVisible();
  await picker.getByRole("button",{name:"Use idea Throw blanket"}).click();
  await page.getByRole("button",{name:"Save gift"}).click();
  await expect(page).toHaveURL(/#\/gifts\//);
  await expect(page.locator(".gift-preview-page")).toContainText("Throw blanket");
  await expect(page.locator(".gift-preview-page input,.gift-preview-page select,.gift-preview-page textarea")).toHaveCount(0);
  const status=page.locator(".gift-preview-top-status");
  await expect(status).toBeVisible();
  await status.getByRole("button",{name:/Mark Throw blanket as Bought/}).click();
  await expect(status.locator(".gift-status-icon.is-bought")).toBeVisible();
  await expect(page.locator(".gift-preview-page").getByRole("button",{name:"Edit gift"})).toBeVisible();
});
