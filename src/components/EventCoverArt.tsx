import type { Event } from "../domain/models";
import { Photo } from "./UI";
import sceneSheet from "../assets/demo/event-scenes.webp";

/** Generated visual-only scenes, never interpreted as user data.
 * Mapping by event kind/name leaves custom uploaded event.image untouched.
 * The 3x2 contact sheet: birthday, New Year, Christmas, Hanukkah, romance, other. */
const sceneNames = ["birthday", "newyear", "christmas", "hanukkah", "romantic", "celebration"] as const;
type Scene = typeof sceneNames[number];
const scenePosition: Record<Scene, string> = {
  birthday: "0% 0%",
  newyear: "50% 0%",
  christmas: "100% 0%",
  hanukkah: "0% 100%",
  romantic: "50% 100%",
  celebration: "100% 100%",
};
export function eventScene(event: Event): Scene {
  const name = event.name.toLocaleLowerCase();
  if (event.kind === "birthday") return "birthday";
  if (/hanukkah|chanukah|ханук|hanoucc|חנוכ/.test(name)) return "hanukkah";
  if (/christmas|xmas|рождеств|noël|navidad/.test(name)) return "christmas";
  if (/new year|новый год|новогод|réveillon|silvester/.test(name)) return "newyear";
  if (/anniversar|wedding|valentin|годовщ|свадьб|романтич|romance/.test(name)) return "romantic";
  return "celebration";
}
export function EventCoverArt({event}: {event: Event}) {
  if (event.image) return <Photo src={event.image} name={event.name}/>;
  const scene = eventScene(event);
  return (
    <span className={`event-cover-art preset-${scene}`}
      role="img" aria-label={`Atmospheric ${scene} celebration image`}
      style={{
        backgroundImage: `url("${sceneSheet}")`,
        backgroundPosition: scenePosition[scene],
        backgroundSize: "300% 200%",
      }}/>
  );
}
