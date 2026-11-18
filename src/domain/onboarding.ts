import type { AppData } from "./models";
import { iso, parseDate, today, uid } from "../utils/format";
export interface SetupDraft {
  holidays: string[];
  name: string;
  birthday: string;
  budget: number;
}
export const holidays = [
  "New Year",
  "Christmas",
  "International Women's Day",
  "Hanukkah",
];
export function nextOccurrence(monthDay: string, from = today()) {
  const [month, day] = monthDay.split("-").map(Number),
    year = Number(from.slice(0, 4));
  for (let y = year; y < year + 9; y++) {
    const date = new Date(y, month - 1, day, 12);
    if (
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      iso(date) >= from
    )
      return iso(date);
  }
  throw Error("Please choose a valid date.");
}
/**
 * Hanukkah follows the Hebrew calendar, so it has no fixed month/day.
 * First full day of each 8-day festival (the candle lighting starts the
 * evening before); extend this list before 2036.
 */
export const hanukkahFirstDays = [
  "2026-12-05",
  "2027-12-25",
  "2028-12-13",
  "2029-12-02",
  "2030-12-21",
  "2031-12-10",
  "2032-11-28",
  "2033-12-17",
  "2034-12-07",
  "2035-12-26",
  "2036-12-14",
];
export function nextHanukkah(from = today()) {
  return hanukkahFirstDays.find((d) => d >= from) ?? "";
}
// Explicitly additive: existing people, plans and recipient budgets are retained.
export function applySetup(
  data: AppData,
  draft: SetupDraft,
  from = today(),
): AppData {
  if (!Number.isFinite(draft.budget) || draft.budget < 0)
    throw Error("Enter a valid birthday budget.");
  const next: AppData = {
    ...data,
    people: [...data.people],
    events: [...data.events],
    settings: {
      ...data.settings,
      holidays: draft.holidays,
      birthdayBudget: draft.budget,
      christmas: draft.holidays.includes("Christmas"),
      hanukkah: draft.holidays.includes("Hanukkah"),
      onboardingComplete: true,
    },
  };
  const name = draft.name.trim();
  if (name) {
    let person = next.people.find(
      (p) => p.name === name && p.birthday === draft.birthday,
    );
    if (!person) {
      person = {
        id: uid(),
        name,
        birthday: draft.birthday,
        note: "",
        likes: "",
      };
      next.people.push(person);
    }
    if (draft.birthday) {
      if (
        Number.isNaN(parseDate(draft.birthday).valueOf()) ||
        iso(parseDate(draft.birthday)) !== draft.birthday
      )
        throw Error("Please choose a valid birthday.");
      const date = nextOccurrence(draft.birthday.slice(5), from);
      if (
        !next.events.some(
          (e) =>
            e.kind === "birthday" &&
            e.people.includes(person.id) &&
            e.date === date,
        )
      )
        next.events.push({
          id: uid(),
          name: `${name}'s birthday`,
          date,
          kind: "birthday",
          birthdayPersonId: person.id,
          people: [person.id],
          budgets: { [person.id]: draft.budget },
          enabled: true,
        });
    }
  }
  const dates: Record<string, string> = {
    "New Year": "12-31",
    Christmas: "12-25",
    "International Women's Day": "03-08",
  };
  for (const holiday of draft.holidays) {
    const date =
      holiday === "Hanukkah"
        ? nextHanukkah(from)
        : dates[holiday] && nextOccurrence(dates[holiday], from);
    if (
      date &&
      !next.events.some((e) => e.name === holiday && e.kind === "holiday")
    )
      next.events.push({
        id: uid(),
        name: holiday,
        date,
        kind: "holiday",
        people: [],
        budgets: {},
        enabled: true,
      });
  }
  return next;
}
