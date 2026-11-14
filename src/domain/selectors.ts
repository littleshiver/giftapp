import type { AppData, Event, EventRecipientBudget, Gift } from "./models";
export const enabledEvents = (d: AppData) =>
  d.events
    .filter((e) => e.enabled !== false)
    .sort((a, b) => a.date.localeCompare(b.date));
export const giftsFor = (d: AppData, eid?: string, pid?: string) =>
  d.gifts.filter(
    (g) => (!eid || g.eventId === eid) && (!pid || g.personId === pid),
  );
export const total = (gs: Gift[]) =>
  gs.filter((g) => g.status !== "idea").reduce((n, g) => n + g.price, 0);
export const bought = (gs: Gift[]) =>
  gs
    .filter((g) => g.status === "bought" || g.status === "given")
    .reduce((n, g) => n + g.price, 0);
export const recipientBudgets = (e: Event): EventRecipientBudget[] =>
  Object.entries(e.budgets).map(([personId, amount]) => ({
    eventId: e.id,
    personId,
    amount,
  }));
export const eventBudget = (e: Event) =>
  recipientBudgets(e).reduce((n, b) => n + b.amount, 0);
