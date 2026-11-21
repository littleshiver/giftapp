export let locale = "en-US";
export const supportedCurrencies = ["RUB", "USD", "EUR", "GBP", "VND", "THB", "KZT", "CAD", "AUD", "CHF", "JPY", "SGD", "CNY", "INR", "AED", "TRY", "ILS", "PLN", "GEL"] as const;
export let currencyCode = "RUB";
export let language: "en" | "ru" = "en";
export function setFormatPreferences(settings: {language?: "en" | "ru"; currency?: string}) {
  language = settings.language === "ru" ? "ru" : "en";
  locale = language === "ru" ? "ru-RU" : "en-US";
  currencyCode = supportedCurrencies.some(code => code === settings.currency) ? settings.currency! : "RUB";
}
export const t = (english: string, russian: string) => language === "ru" ? russian : english;
export const currencyUnit = () => currencyCode === "RUB" ? "₽" : currencyCode;
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
export const currency = (n = 0) => currencyCode === "RUB"
  ? `${n.toLocaleString("ru-RU", {maximumFractionDigits: 2})} ₽`
  : new Intl.NumberFormat(locale, {style:"currency", currency:currencyCode, currencyDisplay:"narrowSymbol", minimumFractionDigits:0, maximumFractionDigits:["VND","JPY"].includes(currencyCode) ? 0 : 2}).format(n);
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
