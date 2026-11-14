export const locale = "en-US";
export const iso = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
export const today = () => iso(new Date());
export const parseDate = (d: string) => new Date(`${d}T12:00:00`);
export const fmtDate = (d: string) =>
  parseDate(d).toLocaleDateString(locale, { month: "short", day: "numeric" });
export const fullDate = (d: string) =>
  parseDate(d).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
export const monthName = (d: Date) =>
  d.toLocaleDateString(locale, { month: "long", year: "numeric" });
export const currency = (n = 0) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
export const uid = () => crypto.randomUUID();
export function countdown(date: string) {
  const n = Math.round(
    (parseDate(date).valueOf() - parseDate(today()).valueOf()) / 86400000,
  );
  return n === 0
    ? "Today"
    : n === 1
      ? "Tomorrow"
      : n < 0
        ? `${-n} days ago`
        : `in ${n} days`;
}
