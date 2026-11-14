import type { AppData } from "./models";
import { iso } from "../utils/format";
// Stage 1 retains the prototype's explicit demo data; onboarding replaces it later.
export function initialData(): AppData {
  const now = new Date(),
    birthday = new Date(now);
  birthday.setDate(now.getDate() + 14);
  return {
    people: [
      {
        id: "p1",
        name: "Friend A",
        birthday: "",
        note: "Sample recipient — rename me",
      },
      {
        id: "p2",
        name: "Friend B",
        birthday: "",
        note: "Sample recipient — rename me",
      },
    ],
    events: [
      {
        id: "ny",
        name: "New Year",
        date: `${now.getFullYear()}-12-31`,
        kind: "holiday",
        people: ["p1", "p2"],
        budgets: { p1: 3000, p2: 1000 },
        enabled: true,
      },
      {
        id: "bd-demo",
        name: "Sample birthday",
        date: iso(birthday),
        kind: "birthday",
        people: ["p1"],
        budgets: { p1: 10000 },
        enabled: true,
        demo: true,
      },
    ],
    gifts: [
      {
        id: "g1",
        personId: "p1",
        eventId: "ny",
        name: "A thoughtful little surprise",
        price: 1200,
        status: "idea",
        note: "Demo gift — edit or remove",
        image: "",
      },
    ],
    settings: { birthdayBudget: 10000, christmas: false, hanukkah: false },
    skipped: [],
  };
}
