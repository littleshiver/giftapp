import type { AppData, Event } from "./models";
import { iso, today } from "../utils/format";

/** Accept legacy YYYY-MM-DD birthdays and the new month/day-only profile format. */
export function birthdayMonthDay(birthday: string): string {
  const parts = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(birthday);
  if (!parts) return "";
  const month = Number(parts[1]), day = Number(parts[2]);
  // Leap-year reference permits February 29 without assuming a birth year.
  const reference = new Date(2000, month - 1, day, 12);
  return reference.getMonth() === month - 1 && reference.getDate() === day
    ? `${parts[1]}-${parts[2]}` : "";
}

export function nextBirthdayDate(birthday: string, from = today()): string {
  const monthDay = birthdayMonthDay(birthday);
  if (!monthDay) return "";
  const [month, day] = monthDay.split("-").map(Number);
  const firstYear = Number(from.slice(0, 4));
  for (let year = firstYear; year < firstYear + 9; year++) {
    const candidate = new Date(year, month - 1, day, 12);
    if (candidate.getMonth() === month - 1 && candidate.getDate() === day) {
      const date = iso(candidate);
      if (date >= from) return date;
    }
  }
  return "";
}

/**
 * Materialize only the next birthday plan. Earlier years and their gifts stay
 * untouched, so last year's Bought statuses never belong to a new occasion.
 * Existing single-recipient birthday plans are reused rather than duplicated.
 */
export function ensureBirthdayOccasions(data: AppData, from = today()): AppData {
  const events: Event[] = [...data.events];
  let changed = false;
  for (const person of data.people) {
    const next = nextBirthdayDate(person.birthday, from);
    if (!next) continue;
    const year = next.slice(0, 4);
    const eligible = (event: Event) =>
      event.kind === "birthday" && event.people.length === 1 &&
      event.people[0] === person.id && event.date.slice(0, 4) === year;
    // Explicitly linked future plan wins; next match reuses legacy records.
    const index = events.findIndex((e) => eligible(e) && e.birthdayPersonId === person.id && e.date >= from);
    const exact = events.findIndex((e) => eligible(e) && e.date === next);
    const found = index >= 0 ? index : exact;
    if (found >= 0) {
      const prior = events[found];
      const canonicalName = `${person.name}'s birthday`;
      const updated = {
        ...prior, birthdayPersonId: person.id, date: next,
        name: canonicalName,
      };
      if (prior.birthdayPersonId !== updated.birthdayPersonId ||
          prior.date !== updated.date || prior.name !== updated.name) {
        events[found] = updated;
        changed = true;
      }
    } else {
      events.push({
        id: `birthday:${person.id}:${year}`,
        name: `${person.name}'s birthday`,
        date: next,
        kind: "birthday",
        birthdayPersonId: person.id,
        people: [person.id],
        budgets: { [person.id]: data.settings.birthdayBudget },
        enabled: true,
      });
      changed = true;
    }
  }
  return changed ? { ...data, events } : data;
}

/** Keeps the person's birthday as the source of truth for newly edited profiles. */
export function birthdayFromParts(month: string, day: string, year: string): string {
  if (!month && !day && !year) return "";
  if (!month || !day) throw Error("Choose both the birthday month and day.");
  const mm = month.padStart(2, "0"), dd = day.padStart(2, "0");
  if (!birthdayMonthDay(`${mm}-${dd}`)) throw Error("Enter a valid birthday.");
  if (!year) return `${mm}-${dd}`;
  if (!/^\d{4}$/.test(year) || +year < 1900 || +year > new Date().getFullYear()) {
    throw Error("Enter a valid birth year or leave it blank.");
  }
  const full = `${year}-${mm}-${dd}`;
  const date = new Date(`${full}T12:00:00`);
  if (Number.isNaN(date.valueOf()) || iso(date) !== full) {
    throw Error("That day does not exist in the selected birth year.");
  }
  return full;
}
