import type { Event } from "../domain/models";
import localCovers from "../assets/events/givvy-event-covers.avif";

/** Five event photos generated specifically for Givvy, bundled locally as
 * a single optimized 5-row image (birthday, winter, Hanukkah, romantic,
 * generic). Custom uploaded event pictures always take precedence.
 * All rows have equal height; frame cropping matches the displayed hero. */
export type EventCoverKind = "birthday" | "winter" | "hanukkah" | "romantic" | "celebration";
export function coverKind(event: Pick<Event, "kind" | "name">): EventCoverKind {
  const n = event.name.toLocaleLowerCase();
  if (event.kind === "birthday" || /birthday|день рождения/.test(n)) return "birthday";
  if (/hanukkah|chanukah|ханук/.test(n)) return "hanukkah";
  if (/christmas|xmas|no[eë]l|new\s*year|нов(?:ый|ого)\s+год|рождеств/.test(n)) return "winter";
  if (/anniversary|wedding|valentine|romantic|engagement|годовщин|свадьб|помолв|романтич/.test(n)) return "romantic";
  return "celebration";
}
const offset: Record<EventCoverKind, string> = {
  birthday: "0%",
  winter: "-20%",
  hanukkah: "-40%",
  romantic: "-60%",
  celebration: "-80%",
};
export function EventCover({event}: {event: Event}) {
  const kind = coverKind(event);
  return (
    <span className="event-cover-frame">
      <img className="event-hero-image" src={localCovers} alt="" aria-hidden="true"
        data-cover-kind={kind} style={{transform: `translateY(${offset[kind]})`}}
        decoding="async" loading="eager"/>
    </span>
  );
}
