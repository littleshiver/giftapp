import type { AppData, Gift, Idea } from "../domain/v3";
import { decode as legacyDecode } from "./legacy";
import { iso } from "../utils/format";
const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === "string";
const money = (x: unknown) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0;
const date = (x: unknown) =>
  text(x) &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  !Number.isNaN(new Date(x + "T12:00:00").valueOf()) &&
  iso(new Date(x + "T12:00:00")) === x;
const optionalText = (...values: unknown[]) =>
  values.every((v) => v === undefined || text(v));
function validate(d: unknown): AppData {
  if (
    !record(d) ||
    ![d.people, d.events, d.gifts, d.ideas].every(Array.isArray)
  )
    throw Error("Invalid backup collections");
  const { people, events, gifts, ideas } = d as unknown as AppData;
  if (
    !people.every(
      (p) =>
        record(p) &&
        text(p.id) &&
        text(p.name) &&
        (p.birthday === "" || date(p.birthday)) &&
        text(p.note) &&
        optionalText(p.likes),
    )
  )
    throw Error("Invalid recipient");
  if (
    !events.every(
      (e) =>
        record(e) &&
        text(e.id) &&
        text(e.name) &&
        date(e.date) &&
        ["holiday", "birthday", "other"].includes(e.kind) &&
        typeof e.enabled === "boolean" &&
        Array.isArray(e.people) &&
        e.people.every(text) &&
        record(e.budgets) &&
        Object.values(e.budgets).every(money) &&
        optionalText(e.image),
    )
  )
    throw Error("Invalid occasion");
  const item = (g: Idea) =>
    record(g) &&
    text(g.id) &&
    text(g.name) &&
    text(g.personId) &&
    money(g.price) &&
    text(g.note) &&
    text(g.image) &&
    optionalText(g.link);
  if (!ideas.every(item)) throw Error("Invalid idea");
  if (
    !gifts.every(
      (g) =>
        item(g) && text(g.eventId) && ["to_buy", "bought"].includes(g.status),
    )
  )
    throw Error("Invalid gift");
  for (const list of [people, events, gifts, ideas])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw Error("Duplicate IDs");
  if (
    !record(d.settings) ||
    !money(d.settings.birthdayBudget) ||
    !optionalText(d.settings.name) ||
    (d.settings.holidays !== undefined &&
      (!Array.isArray(d.settings.holidays) ||
        !d.settings.holidays.every(text))) ||
    [
      d.settings.christmas,
      d.settings.hanukkah,
      d.settings.onboardingComplete,
    ].some((v) => v !== undefined && typeof v !== "boolean")
  )
    throw Error("Invalid settings");
  if (!Array.isArray(d.skipped) || !d.skipped.every(text))
    throw Error("Invalid skipped ideas");
  if (
    d.migration !== undefined &&
    (!record(d.migration) ||
      ![1, 2].includes(Number(d.migration.sourceVersion)) ||
      !record(d.migration.original))
  )
    throw Error("Invalid migration history");
  for (const g of [...gifts, ...ideas])
    if (
      g.migration !== undefined &&
      (!record(g.migration) || !record(g.migration.original))
    )
      throw Error("Invalid item history");
  return d as unknown as AppData;
}
// Pure conversion: never reads or mutates browser storage. Original source is retained.
export function decodeData(raw: string): AppData {
  const parsed: unknown = JSON.parse(raw);
  if (!record(parsed)) throw Error("Invalid backup");
  if (parsed.version === 3) return validate(parsed.data);
  if ("version" in parsed && parsed.version !== 2)
    throw Error("Unsupported backup version");
  const old = legacyDecode(raw),
    source = ("version" in parsed ? parsed.data : parsed) as Record<
      string,
      unknown
    >;
  const ideas: Idea[] = [],
    gifts: Gift[] = [];
  for (const g of old.gifts) {
    const original = (source.gifts as Record<string, unknown>[]).find(
      (x) => x.id === g.id,
    )!;
    const { eventId, status, ...fields } = g;
    const base = {
      ...fields,
      migration: { original: structuredClone(original) },
    };
    if (status === "idea") ideas.push(base);
    else
      gifts.push({
        ...base,
        eventId,
        status: status === "planned" ? "to_buy" : "bought",
      });
  }
  return validate({
    ...old,
    gifts,
    ideas,
    settings: { ...old.settings, onboardingComplete: true },
    migration: {
      sourceVersion: parsed.version === 2 ? 2 : 1,
      original: structuredClone(source),
    },
  });
}
