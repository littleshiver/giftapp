import type { CSSProperties } from "react";
import type { Event } from "../domain/models";
import illustrations from "../assets/occasions/illustrations-4x7.webp";

/** The approved illustration atlas has seven occasions across four color rows:
 * peach, green, pink, blue. Image cells are 144px each.
 * It is decorative; the event label beside it provides the accessible name.
 */
const artKinds = {
  birthday: 0,
  wedding: 1,
  newYear: 2,
  hanukkah: 3,
  christmas: 4,
  thanksgiving: 5,
  womensDay: 6,
} as const;

export function occasionArtIndex(event: Event): number {
  const label = event.name.toLowerCase().trim();
  if (event.kind === "birthday" || /birthday|день рождения|др\b/.test(label)) {
    return artKinds.birthday;
  }
  if (/hanukkah|chanukah|ханук/.test(label)) return artKinds.hanukkah;
  if (/christmas|рождеств/.test(label)) return artKinds.christmas;
  if (/thanksgiving|день благодарения/.test(label)) return artKinds.thanksgiving;
  if (/\b8[\s.-]*(?:march|марта)\b|march\s*8\b|international women's day|women.s day|женский день/.test(label)) {
    return artKinds.womensDay;
  }
  if (/anniversary|wedding|годовщин|свадьб/.test(label)) return artKinds.wedding;
  if (/new year|новый год|нового года/.test(label)) return artKinds.newYear;
  // Custom occasions have a neutral celebration motif, not an incorrect
  // religious or national holiday illustration.
  return artKinds.newYear;
}

export function OccasionArt({
  event,
  paletteIndex,
}: {
  event: Event;
  paletteIndex: number;
}) {
  const col = occasionArtIndex(event);
  const row = ((paletteIndex % 4) + 4) % 4;
  return (
    <span
      className="occ-illustration"
      aria-hidden="true"
      style={{
        backgroundImage: `url("${illustrations}")`,
        backgroundPosition: `${(col / 6) * 100}% ${(row / 3) * 100}%`,
      } as CSSProperties}
    />
  );
}
