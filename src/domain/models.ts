export interface Person {
  id: string;
  name: string;
  birthday: string;
  note: string;
}
export interface Event {
  id: string;
  name: string;
  date: string;
  kind: "birthday" | "holiday";
  people: string[];
  budgets: Record<string, number>;
  enabled: boolean;
  demo?: boolean;
}
// Persisted as Event.budgets for lossless compatibility with the prototype.
export interface EventRecipientBudget {
  eventId: string;
  personId: string;
  amount: number;
}
export type GiftStatus = "idea" | "planned" | "bought" | "given";
export interface Gift {
  id: string;
  personId: string;
  eventId: string;
  name: string;
  price: number;
  status: GiftStatus;
  note: string;
  image: string;
  link?: string;
}
export interface Settings {
  birthdayBudget: number;
  christmas?: boolean;
  hanukkah?: boolean;
}
export interface AppData {
  people: Person[];
  events: Event[];
  gifts: Gift[];
  settings: Settings;
  skipped: string[];
}
export type Editor = {
  type: "person" | "event" | "gift";
  id?: string;
  personId?: string;
  eventId?: string;
};
