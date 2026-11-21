export interface Person {
  id: string;
  name: string;
  birthday: string;
  note: string;
  likes?: string;
  interests?: string;
  avoid?: string;
  photo?: string;
  [key: string]: unknown;
}
export type ReminderDays = 0 | 1 | 3 | 7 | 14 | null;

export interface Event {
  id: string;
  name: string;
  date: string;
  kind: "birthday" | "holiday" | "other";
  /** For birthday events, only this person is the celebrant. */
  birthdayPersonId?: string;
  people: string[];
  budgets: Record<string, number>;
  enabled: boolean;
  image?: string;
  reminderDays?: ReminderDays;
  demo?: boolean;
  [key: string]: unknown;
}
export interface EventRecipientBudget {
  eventId: string;
  personId: string;
  amount: number;
}
export type GiftStatus = "to_buy" | "bought";
export interface Idea {
  id: string;
  name: string;
  personId: string;
  price: number;
  note: string;
  image: string;
  link?: string;
  /** Stable catalog origin for a discovery idea; never required for manual ideas. */
  sourceDiscoveryId?: string;
  migration?: { original: Record<string, unknown> };
  [key: string]: unknown;
}
export interface Gift extends Idea {
  eventId: string;
  status: GiftStatus;
  /** Optional link back to a saved idea. Gift data is an independent snapshot. */
  sourceIdeaId?: string;
}
export interface Settings {
  birthdayBudget: number;
  occasionBudget?: number;
  language?: "en" | "ru";
  currency?: string;
  name?: string;
  holidays?: string[];
  onboardingComplete?: boolean;
  christmas?: boolean;
  hanukkah?: boolean;
  [key: string]: unknown;
}
export interface AppData {
  people: Person[];
  events: Event[];
  gifts: Gift[];
  ideas: Idea[];
  settings: Settings;
  skipped: string[];
  migration?: { sourceVersion: 1 | 2; original: Record<string, unknown> };
  [key: string]: unknown;
}
export type Editor = {
  type: "person" | "event" | "gift" | "idea";
  id?: string;
  personId?: string;
  eventId?: string;
  prefill?: Idea;
};
