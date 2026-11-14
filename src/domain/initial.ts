import type { AppData } from "./models";
export const initialData = (): AppData => ({
  people: [],
  events: [],
  gifts: [],
  ideas: [],
  settings: { birthdayBudget: 10000, holidays: [] },
  skipped: [],
});
