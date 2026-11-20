import type { Idea } from "./models";
// The discovery catalog is shared by the main Ideas experience and the
// interactive first-run guide. Keep one source for IDs, images and copy.
import artbook from "../assets/discovery/artbook-hires.jpg?inline";
import blanket from "../assets/discovery/blanket-hires.jpg?inline";
import mug from "../assets/discovery/mug-hires.jpg?inline";
import candle from "../assets/discovery/candle-hires.jpg?inline";

export type Audience = "adult" | "child";
export type Relationship = "close" | "friend" | "colleague" | "acquaintance";
export type Category = "home" | "books";
export interface DiscoverySuggestion {
  id: string;
  name: string;
  image: string;
  price: number;
  note: string;
  audiences: Audience[];
  relationships: Relationship[];
  category: Category;
}

export const discoverySuggestions: DiscoverySuggestion[] = [
  { id: "discovery:ceramic-mug", name: "Ceramic mug", image: mug, price: 1200,
    note: "Handmade styles and different glazes",
    audiences: ["adult"], relationships: ["close", "friend", "colleague", "acquaintance"], category: "home" },
  { id: "discovery:throw-blanket", name: "Throw blanket", image: blanket, price: 2100,
    note: "Soft textures and cozy corners",
    audiences: ["adult", "child"], relationships: ["close", "friend"], category: "home" },
  { id: "discovery:art-book", name: "Art book", image: artbook, price: 1800,
    note: "Art, photography and illustration",
    audiences: ["adult"], relationships: ["close", "friend", "acquaintance"], category: "books" },
  { id: "discovery:scented-candle", name: "Scented candle", image: candle, price: 900,
    note: "Atmospheric gifts for the home",
    audiences: ["adult"], relationships: ["close", "friend", "colleague", "acquaintance"], category: "home" },
];

export function ideaFromDiscovery(
  suggestion: DiscoverySuggestion, personId: string, id: string,
): Idea {
  return {
    id, name: suggestion.name, personId, price: suggestion.price,
    image: suggestion.image, note: suggestion.note, link: "",
    sourceDiscoveryId: suggestion.id,
  };
}
