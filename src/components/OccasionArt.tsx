import type { Event } from "../domain/models";
import cupcake from "../assets/occasions/birthday-cupcake.png";
import heart from "../assets/occasions/romantic-heart.png";
import partyHat from "../assets/occasions/celebration-hat.png";
import tree from "../assets/occasions/new-year-tree.png";

/** Fixed approved icon artwork. Event palette colors only the surrounding card,
 * never an illustration. One independent image per symbol; no CSS sprite.
 */
export type OccasionArtKind = "birthday" | "romantic" | "new-year" | "celebration";

export function occasionArtKind(event: Pick<Event, "kind" | "name">): OccasionArtKind {
  const name = event.name.toLocaleLowerCase().trim();
  if (event.kind === "birthday" || /birthday|день рождения|д\.?\s*р\.?$/i.test(name))
    return "birthday";
  if (/new\s*year|нов(?:ый|ого|ому)\s+год|новогод/i.test(name))
    return "new-year";
  if (
    /anniversary|wedding|valentine|romantic|engagement|love|date\s*night|годовщин|свадьб|венчан|помолв|романтич|влюбл|день\s+(?:всех\s+)?влюбленн|14\s+феврал/i.test(name)
  )
    return "romantic";
  return "celebration";
}

const icons: Record<OccasionArtKind, string> = {
  birthday: cupcake,
  romantic: heart,
  "new-year": tree,
  celebration: partyHat,
};

export function OccasionArt({ event }: { event: Event }) {
  const kind = occasionArtKind(event);
  return (
    <img
      className="occ-illustration"
      src={icons[kind]}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      loading="eager"
      data-art-kind={kind}
    />
  );
}
