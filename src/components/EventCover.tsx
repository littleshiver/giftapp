import type { Event } from "../domain/models";
import birthdayCover from "../assets/events/cover-birthday.jpg";
import winterCover from "../assets/events/cover-winter.jpg";
import hanukkahCover from "../assets/events/cover-hanukkah.jpg";
import romanticCover from "../assets/events/cover-romantic.jpg";
import celebrationCover from "../assets/events/cover-celebration.jpg";

/** Five high-quality, full-frame event cover photographs packaged locally.
 * Use one independent image per category to preserve a real 2:1 crop with no
 * sprite stretching or artificial pixelation. Custom event photos take precedence. */
export type EventCoverKind = "birthday" | "winter" | "hanukkah" | "romantic" | "celebration";
export function coverKind(event: Pick<Event, "kind" | "name">): EventCoverKind {
  const n = event.name.toLocaleLowerCase();
  if (event.kind === "birthday" || /birthday|день рождения/.test(n)) return "birthday";
  if (/hanukkah|chanukah|ханук/.test(n)) return "hanukkah";
  if (/christmas|xmas|no[eë]l|new\s*year|нов(?:ый|ого)\s+год|рождеств/.test(n)) return "winter";
  if (/anniversary|wedding|valentine|romantic|engagement|годовщин|свадьб|помолв|романтич/.test(n)) return "romantic";
  return "celebration";
}
const coverImages: Record<EventCoverKind, string> = {
  birthday: birthdayCover,
  winter: winterCover,
  hanukkah: hanukkahCover,
  romantic: romanticCover,
  celebration: celebrationCover,
};

export function EventCover({event}: {event: Event}) {
  const kind = coverKind(event);
  return (
    <span className="event-cover-frame">
      <img className="event-hero-image"
        src={coverImages[kind]} alt="" aria-hidden="true"
        data-cover-kind={kind} decoding="async" loading="eager"/>
    </span>
  );
}
