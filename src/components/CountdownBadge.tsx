import type { ReactNode } from "react";
import { parseDate, today } from "../utils/format";

/** One short countdown convention for People and upcoming occasions.
 * Visible labels intentionally never use long words such as Today/aujourd'hui.
 * `unit` allows future localized abbreviations (e.g. French `j`). */
export function daysUntilDate(date: string): number {
  return Math.max(0, Math.round(
    (parseDate(date).getTime() - parseDate(today()).getTime()) / 86400000,
  ));
}

export function CountdownBadge({
  days, icon, className = "", label, unit = "d",
}: {
  days: number;
  icon?: ReactNode;
  className?: string;
  label?: string;
  unit?: string;
}) {
  const remaining = Math.max(0, days);
  const urgency = remaining === 0 ? "now" : remaining <= 7 ? "soon" : "later";
  return (
    <span className={`countdown-badge countdown-badge--${urgency} ${className}`.trim()}
      aria-label={label ?? `${remaining} days remaining`}
      title={label ?? `${remaining} days remaining`}>
      {icon}
      <span>{remaining}{unit}</span>
    </span>
  );
}
