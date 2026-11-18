import type { Event } from "../domain/models";

/** Editorial fallback photographs for event headers; a user's uploaded
 * occasion image always wins. These are fixed Unsplash License photo URLs,
 * not random API endpoints. Keep image/source provenance in docs.
 * Future asset-bundling can replace the URLs without changing the component.
 */
export type EventCoverKind = "birthday" | "winter" | "hanukkah" | "romantic" | "celebration";
export function coverKind(event: Pick<Event, "kind" | "name">): EventCoverKind {
  const n = event.name.toLocaleLowerCase();
  if (event.kind === "birthday" || /birthday|день рождения/.test(n)) return "birthday";
  if (/hanukkah|chanukah|ханук/.test(n)) return "hanukkah";
  if (/christmas|xmas|no[eë]l|new\s*year|нов(?:ый|ого)\s+год|рождеств/.test(n)) return "winter";
  if (/anniversary|wedding|valentine|romantic|engagement|годовщин|свадьб|помолв|романтич/.test(n)) return "romantic";
  return "celebration";
}
const photo: Record<EventCoverKind, string> = {
  birthday: "https://images.unsplash.com/photo-1511348398635-8efff213a280?auto=format&fit=crop&w=1100&q=75",
  winter: "https://images.unsplash.com/photo-1766393030565-12f744515335?auto=format&fit=crop&w=1100&q=75",
  hanukkah: "https://images.unsplash.com/photo-1765731401421-cae4930d250b?auto=format&fit=crop&w=1100&q=75",
  romantic: "https://images.unsplash.com/photo-1721775999121-7be73ba0e29f?auto=format&fit=crop&w=1100&q=75",
  celebration: "https://images.unsplash.com/photo-1727178757622-26389a0538f5?auto=format&fit=crop&w=1100&q=75",
};
export function EventCover({event}: {event: Event}) {
  return <img className="event-hero-image" src={photo[coverKind(event)]}
    alt="" aria-hidden="true" decoding="async"/>;
}
