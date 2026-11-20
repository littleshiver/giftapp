import type { AppData, Event, Gift, Idea, Person } from "./models";
import type { DiscoverySuggestion } from "./discoveryTypes";
import { ideaFromDiscovery } from "./discoveryTypes";
import { nextBirthdayDate } from "./birthdays";
import { uid } from "../utils/format";

export function addFirstPerson(data: AppData, nameInput: string, monthDay: string):
  { data: AppData; person: Person; event: Event } {
  const name = nameInput.trim();
  if (!name) throw Error("Add a name to continue.");
  const date = nextBirthdayDate(monthDay);
  if (!date) throw Error("Choose a valid birthday month and day.");
  // Safe for revisiting a guided flow: reuse an exact existing person.
  const existing = data.people.find(p => p.name.toLowerCase() === name.toLowerCase() &&
    p.birthday.slice(-5) === monthDay);
  const person: Person = existing || {
    id: uid(), name, birthday: monthDay, note: "", likes: "",
  };
  const event: Event = data.events.find(e => e.kind === "birthday" && e.people.length === 1 &&
    e.people[0] === person.id && e.date === date) || {
    id: uid(), name: `${person.name}'s birthday`,
    kind: "birthday", birthdayPersonId: person.id, date,
    people: [person.id], budgets: { [person.id]: 0 }, enabled: true,
  };
  return {
    data: {
      ...data,
      people: existing ? data.people : [...data.people, person],
      events: data.events.some(e => e.id === event.id) ? data.events : [...data.events, event],
    },
    person, event,
  };
}

export function saveFirstIdea(data: AppData, suggestion: DiscoverySuggestion, personId: string):
  { data: AppData; idea: Idea } {
  if (!data.people.some(p => p.id === personId)) throw Error("Choose a person first.");
  const existing = data.ideas.find(i => i.personId === personId &&
    i.sourceDiscoveryId === suggestion.id);
  const idea = existing || ideaFromDiscovery(suggestion, personId, uid());
  return {
    data: existing ? data : { ...data, ideas: [...data.ideas, idea] },
    idea,
  };
}

export function planFirstGift(data: AppData, ideaId: string, eventId: string):
  { data: AppData; gift: Gift } {
  const idea = data.ideas.find(i => i.id === ideaId);
  const event = data.events.find(e => e.id === eventId);
  if (!idea || !event || !event.people.includes(idea.personId)) {
    throw Error("This idea needs a matching person and occasion.");
  }
  const existing = data.gifts.find(g => g.eventId === eventId && g.sourceIdeaId === ideaId);
  const gift: Gift = existing || {
    ...idea, id: uid(), eventId, status: "to_buy", sourceIdeaId: idea.id,
  };
  return {
    data: existing ? data : { ...data, gifts: [...data.gifts, gift] },
    gift,
  };
}

export function setFirstGiftBought(data: AppData, giftId: string, bought: boolean): AppData {
  if (!data.gifts.some(g => g.id === giftId)) throw Error("Gift not found.");
  return {
    ...data,
    gifts: data.gifts.map(g => g.id === giftId
      ? { ...g, status: bought ? "bought" as const : "to_buy" as const }
      : g),
  };
}
export function finishFirstRun(data: AppData): AppData {
  return { ...data, settings: { ...data.settings, onboardingComplete: true } };
}
