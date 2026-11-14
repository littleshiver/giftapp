import type { AppData, Event, EventRecipientBudget, Gift } from "./models";
export const enabledEvents = (d: AppData) =>
  d.events
    .filter((e) => e.enabled !== false)
    .sort((a, b) => a.date.localeCompare(b.date));
export const giftsFor = (d: AppData, eid?: string, pid?: string) =>
  d.gifts.filter(
    (g) => (!eid || g.eventId === eid) && (!pid || g.personId === pid),
  );
export const total = (gs: Gift[]) => gs.reduce((n, g) => n + g.price, 0);
export const bought = (gs: Gift[]) =>
  total(gs.filter((g) => g.status === "bought"));
export const recipientBudgets = (e: Event): EventRecipientBudget[] =>
  e.people
    .filter((pid) => Object.hasOwn(e.budgets, pid))
    .map((personId) => ({
      eventId: e.id,
      personId,
      amount: e.budgets[personId],
    }));
export const eventBudget = (e: Event) =>
  recipientBudgets(e).reduce((n, b) => n + b.amount, 0);
export const associationValid = (d: AppData, g: Gift) =>
  d.people.some((p) => p.id === g.personId) &&
  d.events.some((e) => e.id === g.eventId && e.people.includes(g.personId));
export function monthSummary(d: AppData, month: string) {
  const events = enabledEvents(d).filter((e) => e.date.slice(0, 7) === month),
    ids = new Set(events.map((e) => e.id)),
    gifts = d.gifts.filter((g) => ids.has(g.eventId));
  return {
    events,
    budget: events.reduce((n, e) => n + eventBudget(e), 0),
    committed: total(gifts),
    bought: bought(gifts),
  };
}
