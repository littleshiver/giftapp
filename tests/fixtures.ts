import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
export const image = (name: string) =>
  "data:image/jpeg;base64," +
  readFileSync(
    ["birthday", "newyear", "flowers"].includes(name)
      ? `tests/fixtures/${name}.jpg`
      : `src/assets/discovery/${name}.jpg`,
  ).toString("base64");
export function fixture() {
  return {
    people: [
      {
        id: "p1",
        name: "Anna",
        birthday: "1997-11-28",
        likes: "Books, cozy things, ceramics",
        note: "Warm neutral colors.",
      },
      {
        id: "p2",
        name: "Denis",
        birthday: "",
        likes: "Technology, coffee",
        note: "",
      },
      { id: "p3", name: "Mira", birthday: "", likes: "Music, art", note: "" },
    ],
    events: [
      {
        id: "e1",
        name: "Anna's birthday",
        date: "2026-11-28",
        kind: "birthday",
        people: ["p1"],
        budgets: { p1: 10000 },
        enabled: true,
        image: image("birthday"),
      },
      {
        id: "e2",
        name: "New Year",
        date: "2026-12-31",
        kind: "holiday",
        people: ["p1", "p2", "p3"],
        budgets: { p1: 2500, p2: 5000, p3: 1500 },
        enabled: true,
        image: image("newyear"),
      },
      {
        id: "e3",
        name: "Our anniversary",
        date: "2027-01-17",
        kind: "other",
        people: ["p2"],
        budgets: { p2: 4500 },
        enabled: true,
        image: image("flowers"),
      },
    ],
    gifts: [
      {
        id: "g1",
        name: "Scented candle",
        eventId: "e1",
        personId: "p1",
        price: 1900,
        status: "bought",
        image: image("candle"),
        note: "Keep the original note",
        link: "https://example.com/candle",
      },
      {
        id: "g2",
        name: "Cozy blanket",
        eventId: "e1",
        personId: "p1",
        price: 3400,
        status: "to_buy",
        image: image("blanket"),
        note: "",
        link: "",
      },
      {
        id: "g3",
        name: "Art book",
        eventId: "e1",
        personId: "p1",
        price: 2100,
        status: "to_buy",
        image: image("artbook"),
        note: "",
        link: "",
      },
      {
        id: "g4",
        name: "Headphones",
        eventId: "e2",
        personId: "p2",
        price: 4800,
        status: "to_buy",
        image: "",
        note: "",
        link: "",
      },
    ],
    ideas: [
      {
        id: "i1",
        name: "Ceramic mug",
        personId: "p1",
        price: 1200,
        image: image("mug"),
        note: "Soft neutral colors",
        link: "https://example.com/mug",
      },
    ],
    settings: {
      name: "Polina",
      birthdayBudget: 10000,
      onboardingComplete: true,
      holidays: ["New Year"],
    },
    skipped: [],
  };
}
export async function seed(page: Page, data: unknown = fixture()) {
  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("test-seeded")) {
      localStorage.setItem(
        "givvy_dashboard_v3",
        JSON.stringify({ version: 3, data }),
      );
      localStorage.setItem("test-seeded", "true");
    }
  }, data);
  await page.goto("/");
}
export const readData = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("givvy_dashboard_v3")!).data,
  );
