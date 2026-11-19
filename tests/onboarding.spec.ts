import { test, expect } from "@playwright/test";
import { fixture, readData, seed } from "./fixtures";
import { applySetup, nextHanukkah, nextOccurrence } from "../src/domain/onboarding";
test("new users start empty; onboarding creates explicit plans with zero budgets", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.goto("/");
  await expect(page).toHaveURL(/#\/onboarding$/);
  expect(
    await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3")),
  ).toBeNull();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("New Year", { exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("New person");
  await page.getByLabel("Birthday (optional)").fill("1990-11-28");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Birthday budget").fill("0");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(
    page.getByRole("heading", { name: /Hi, there/i }),
  ).toBeVisible();
  const d = await readData(page);
  expect(d.people).toHaveLength(1);
  expect(d.gifts).toEqual([]);
  expect(d.ideas).toEqual([]);
  expect(d.events.find((e) => e.kind === "birthday").date).toBe("2026-11-28");
  expect(
    Object.values(d.events.find((e) => e.kind === "birthday").budgets),
  ).toEqual([0]);
  expect(d.events.find((e) => e.name === "New Year").people).toEqual([]);
  await page.reload();
  await expect(page).not.toHaveURL(/onboarding/);
});
test("onboarding preview cancel and finish preserve existing plans and images", async ({
  page,
}) => {
  const original = fixture();
  await seed(page, original);
  await page.goto("/#/settings");
  await page.getByRole("link", { name: "Preview onboarding" }).click();
  await page.getByRole("button", { name: "Back to Settings" }).click();
  expect(await readData(page)).toEqual(original);
  await page.getByRole("link", { name: "Preview onboarding" }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  const d = await readData(page);
  expect(d.people).toEqual(original.people);
  expect(d.gifts).toEqual(original.gifts);
  expect(d.events).toEqual(original.events.map((event) =>
    event.kind === "birthday" && event.people.length === 1
      ? { ...event, birthdayPersonId: event.people[0] }
      : event,
  ));
  expect(d.ideas).toEqual(original.ideas);
});
test("exploring first shows real empty states with no placeholder records", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore first" }).click();
  await expect(page.locator(".empty-card")).toContainText(
    "Add your first occasion",
  );
  expect((await readData(page)).people).toEqual([]);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("dialog", { name: "Add gift" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Save to" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Save to" }).locator("option")).toHaveCount(1);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/#/ideas");
  await page.getByRole("button", { name: "Like idea", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Save this idea for who?" })).toBeVisible();
  await page.getByRole("dialog", { name: "Save this idea for who?" })
    .getByRole("button", { name: /Anyone/ }).click();
  expect((await readData(page)).ideas).toHaveLength(1);
});
test("corrupt storage remains recoverable without onboarding overwrite", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("givvy_dashboard_v3", "{bad"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("not been overwritten");
  await page.goto("/#/people");
  await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Should not save");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.locator(".app-toast.toast-error")).toContainText("recovery");
  expect(
    await page.evaluate(() => localStorage.getItem("givvy_dashboard_v3")),
  ).toBe("{bad");
});
test("annual initial dates handle passed birthdays and leap days; setup is additive", () => {
  expect(nextOccurrence("11-01", "2026-11-15")).toBe("2027-11-01");
  expect(nextOccurrence("02-29", "2026-11-15")).toBe("2028-02-29");
  const d = fixture();
  const next = applySetup(
    d,
    {
      name: "Anna",
      birthday: "1997-11-28",
      holidays: ["New Year"],
      budget: 0,
    },
    "2026-11-15",
  );
  expect(next.people).toEqual(d.people);
  expect(next.events).toEqual(d.events);
  expect(next.gifts).toEqual(d.gifts);
});
test("choosing Hanukkah in setup creates its next occasion", () => {
  expect(nextHanukkah("2026-11-15")).toBe("2026-12-05");
  expect(nextHanukkah("2026-12-06")).toBe("2027-12-25");
  const next = applySetup(
    { people: [], events: [], gifts: [], ideas: [], settings: { birthdayBudget: 0 }, skipped: [] },
    { name: "", birthday: "", holidays: ["Hanukkah"], budget: 0 },
    "2026-11-15",
  );
  expect(next.events).toMatchObject([
    { name: "Hanukkah", kind: "holiday", date: "2026-12-05" },
  ]);
});
