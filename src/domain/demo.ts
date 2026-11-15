import type { AppData, Event } from "./models";
import { initialData } from "./initial";
import blanketPhoto from "../assets/discovery/blanket.jpg";
import artbookPhoto from "../assets/discovery/artbook.jpg";

/**
 * Visual-QA-only records, never merged into personal saved data.
 *
 * These are the exact ten product images from the neighbor Gifts App project
 * conversation, compressed to a tiny 5x2 WebP sheet for visual testing.
 * Demo image references are never written to persistent personal data.
 */
export const demoPhotoManifest = [
  { file: "image-gen-1.png", name: "Wireless headphones" },
  { file: "image-gen-2.png", name: "Espresso machine" },
  { file: "image-gen-3.png", name: "Portable pink blender" },
  { file: "image-gen-4.png", name: "Beige trainers" },
  { file: "image-gen-5.png", name: "Ceramic Christmas cat ornament" },
  { file: "image-gen-6.png", name: "Ceramic brush rest" },
  { file: "image-gen-7.png", name: "Handmade pink mug" },
  { file: "image-gen-8.png", name: "Scented candle" },
  { file: "image-gen-9.png", name: "Custom mechanical keyboard" },
  { file: "image-gen-10.png", name: "Pink skincare serum" },
] as const;

export function emptyDemo(): AppData {
  return {
    ...initialData(),
    settings: {
      birthdayBudget: 10000,
      name: "Alex",
      holidays: [],
      onboardingComplete: true,
    },
  };
}
export function filledDemo(): AppData {
  const people = [
    { id: "demo-mira", name: "Mira", birthday: "1997-11-28", note: "Loves handmade ceramics", likes: "Ceramics, books, warm colors" },
    { id: "demo-denis", name: "Denis", birthday: "1993-02-17", note: "Interested in useful gadgets", likes: "Tech, coffee, music" },
    { id: "demo-sasha", name: "Sasha", birthday: "1996-06-14", note: "", likes: "Home decor and small thoughtful gifts" },
    { id: "demo-alex", name: "Alex", birthday: "", note: "", likes: "Computers and stationery" },
  ];
  const events: Event[] = [
    {
      id: "demo-birthday", name: "Mira's birthday", kind: "birthday" as const,
      date: "2026-11-28", enabled: true,
      people: ["demo-mira"], budgets: { "demo-mira": 10000 }, demo: true,
    },
    {
      id: "demo-newyear", name: "New Year", kind: "holiday" as const,
      date: "2026-12-31", enabled: true,
      people: ["demo-mira", "demo-denis", "demo-sasha", "demo-alex"],
      budgets: { "demo-mira": 4000, "demo-denis": 12000, "demo-sasha": 3000, "demo-alex": 4500 },
      demo: true,
    },
    {
      id: "demo-anniversary", name: "Our anniversary", kind: "other" as const,
      date: "2027-01-17", enabled: true,
      people: ["demo-denis"], budgets: { "demo-denis": 7000 }, demo: true,
    },
  ];
  const specs = [
    ["Wireless headphones", "demo-newyear", "demo-denis", 6900, "to_buy"],
    ["Espresso machine", "demo-anniversary", "demo-denis", 8900, "to_buy"],
    ["Portable pink blender", "demo-birthday", "demo-mira", 2400, "bought"],
    ["Beige trainers", "demo-birthday", "demo-mira", 4300, "to_buy"],
    ["Christmas cat ornament", "demo-newyear", "demo-sasha", 850, "bought"],
    ["Ceramic brush rest", "demo-newyear", "demo-sasha", 1600, "to_buy"],
    ["Handmade pink mug", "demo-birthday", "demo-mira", 1450, "bought"],
    ["Scented candle", "demo-newyear", "demo-mira", 1700, "to_buy"],
    ["Custom keyboard", "demo-newyear", "demo-alex", 4900, "to_buy"],
    ["Pink skincare serum", "demo-newyear", "demo-mira", 1200, "bought"],
  ] as const;
  const gifts = [
    ...specs.map(([name, eventId, personId, price, status], i) => ({
      id: `demo-gift-${i + 1}`,
      name, eventId, personId, price, status,
      image: `demo-photo:${i}`, note: "", link: "",
      demoPhotoReference: demoPhotoManifest[i].file,
    })),
    { id: "demo-no-image", name: "A gift without a photo", eventId: "demo-newyear",
      personId: "demo-alex", price: 500, status: "to_buy" as const,
      image: "", note: "Check the empty photo fallback", link: "" },
  ];
  // Include a few additional existing legitimate product photographs to
  // exercise visual density without pretending they are the 10 source photos.
  const ideas = [
    { id: "demo-idea-1", name: "Cozy blanket", personId: "demo-mira", price: 2900, image: blanketPhoto, note: "", link: "" },
    { id: "demo-idea-2", name: "Illustrated art book", personId: "demo-alex", price: 2100, image: artbookPhoto, note: "", link: "" },
  ];
  return {
    people, events, gifts, ideas, skipped: [],
    settings: {
      name: "Alex", birthdayBudget: 10000,
      holidays: ["New Year"], onboardingComplete: true,
    },
  };
}
