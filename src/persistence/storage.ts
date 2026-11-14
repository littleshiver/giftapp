import type { AppData } from "../domain/models";
import { initialData } from "../domain/initial";
export const LEGACY_KEY = "givvy_dashboard_v1";
export const STORAGE_KEY = "givvy_dashboard_v2";
const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const str = (x: unknown): x is string => typeof x === "string";
const money = (x: unknown) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0;
const date = (x: unknown) =>
  str(x) &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  !Number.isNaN(new Date(x + "T12:00:00").valueOf()) &&
  new Date(x + "T12:00:00").toISOString().slice(0, 10) === x;
export function decode(raw: string): AppData {
  const parsed: unknown = JSON.parse(raw);
  if (!record(parsed)) throw Error("Invalid backup");
  if ("version" in parsed && parsed.version !== 2)
    throw Error("Unsupported backup version");
  const d = "version" in parsed ? parsed.data : parsed;
  if (
    !record(d) ||
    !Array.isArray(d.people) ||
    !Array.isArray(d.events) ||
    !Array.isArray(d.gifts)
  )
    throw Error("Invalid backup collections");
  if (
    !d.people.every(
      (p) =>
        record(p) &&
        str(p.id) &&
        str(p.name) &&
        (p.birthday === undefined || p.birthday === "" || date(p.birthday)) &&
        (p.note === undefined || str(p.note)),
    )
  )
    throw Error("Invalid recipient");
  if (
    !d.events.every(
      (e) =>
        record(e) &&
        str(e.id) &&
        str(e.name) &&
        date(e.date) &&
        ["holiday", "birthday"].includes(String(e.kind)) &&
        Array.isArray(e.people) &&
        e.people.every(str) &&
        (e.budgets === undefined ||
          (record(e.budgets) && Object.values(e.budgets).every(money))),
    )
  )
    throw Error("Invalid occasion");
  if (
    !d.gifts.every(
      (g) =>
        record(g) &&
        str(g.id) &&
        str(g.name) &&
        str(g.personId) &&
        str(g.eventId) &&
        money(g.price) &&
        ["idea", "planned", "bought", "given"].includes(String(g.status)) &&
        [g.image, g.note, g.link].every((v) => v === undefined || str(v)),
    )
  )
    throw Error("Invalid gift");
  for (const list of [d.people, d.events, d.gifts])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw Error("Duplicate IDs");
  if (
    d.settings !== undefined &&
    (!record(d.settings) ||
      (d.settings.birthdayBudget !== undefined &&
        !money(d.settings.birthdayBudget)) ||
      [d.settings.christmas, d.settings.hanukkah].some(
        (v) => v !== undefined && typeof v !== "boolean",
      ))
  )
    throw Error("Invalid settings");
  if (
    d.skipped !== undefined &&
    (!Array.isArray(d.skipped) || !d.skipped.every(str))
  )
    throw Error("Invalid skipped ideas");
  // Preserve unknown fields as well as IDs, pictures, disabled flags and zero budgets.
  return {
    ...d,
    people: d.people.map((p) => ({ birthday: "", note: "", ...p })),
    events: d.events.map((e) => ({ enabled: true, budgets: {}, ...e })),
    gifts: d.gifts.map((g) => ({ note: "", image: "", ...g })),
    settings: { birthdayBudget: 10000, ...((d.settings as object) || {}) },
    skipped: d.skipped || [],
  } as AppData;
}
export const encode = (data: AppData) =>
  JSON.stringify({ version: 2, data }, null, 2);
export function load(): { data: AppData; warning: string; blocked: boolean } {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    return {
      data: raw === null ? initialData() : decode(raw),
      warning: "",
      blocked: false,
    };
  } catch {
    return {
      data: {
        people: [],
        events: [],
        gifts: [],
        settings: { birthdayBudget: 10000 },
        skipped: [],
      },
      warning:
        "Stored data could not be read. It has not been overwritten. Import a valid backup in Settings to recover.",
      blocked: true,
    };
  }
}
export function write(data: AppData) {
  localStorage.setItem(STORAGE_KEY, encode(data));
}
export function exportBackup(data: AppData) {
  const url = URL.createObjectURL(
    new Blob([encode(data)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "givvy-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
