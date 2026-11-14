import type { AppData } from "../domain/models";
import { initialData } from "../domain/initial";
import { decodeData } from "./upgrade";
export const LEGACY_KEY = "givvy_dashboard_v1",
  PREVIOUS_KEY = "givvy_dashboard_v2",
  STORAGE_KEY = "givvy_dashboard_v3";
export const decode = decodeData;
export const encode = (data: AppData) =>
  JSON.stringify({ version: 3, data }, null, 2);
export function load() {
  try {
    const current = localStorage.getItem(STORAGE_KEY),
      raw =
        current ??
        localStorage.getItem(PREVIOUS_KEY) ??
        localStorage.getItem(LEGACY_KEY);
    return {
      data: raw === null ? initialData() : decode(raw),
      warning: "",
      blocked: false,
      upgraded: current === null && raw !== null,
    };
  } catch {
    return {
      data: initialData(),
      warning:
        "Stored data could not be read. It has not been overwritten. Import a valid backup in Settings to recover.",
      blocked: true,
      upgraded: false,
    };
  }
}
export function write(data: AppData) {
  localStorage.setItem(STORAGE_KEY, encode(data));
}
export function exportBackup(data: AppData) {
  downloadJson(encode(data), "givvy-backup.json");
}
export function downloadJson(raw: string, name: string) {
  const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
