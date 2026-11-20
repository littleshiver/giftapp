import type { Idea } from "./models";

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
/** Pure snapshot conversion: testable without importing web image assets. */
export function ideaFromDiscovery(suggestion: DiscoverySuggestion, personId: string, id: string): Idea {
  return {
    id, name: suggestion.name, personId, price: suggestion.price,
    image: suggestion.image, note: suggestion.note, link: "",
    sourceDiscoveryId: suggestion.id,
  };
}
