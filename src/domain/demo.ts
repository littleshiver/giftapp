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
  // Four bundled headshots, plus varied real-world demo portraits and
  // deliberately photo-free entries to QA the gallery and fallbacks.
  const people = [
    {id:"demo-mira",name:"Mira",birthday:"1997-11-28",photo:"demo-person:0",
      likes:"Handmade ceramics, art books, warm neutral colors and little home comforts.",
      avoid:"Strong fragrances and synthetic fabrics.",note:""},
    {id:"demo-denis",name:"Denis",birthday:"1993-02-17",photo:"demo-person:1",
      likes:"Useful gadgets, quality coffee tools, headphones and music.",
      avoid:"Novelty mugs, clutter and gimmicky accessories.",note:""},
    {id:"demo-sasha",name:"Sasha",birthday:"1996-06-14",photo:"demo-person:2",
      likes:"Plants, cozy textiles, beautiful stationery and film photography.",
      avoid:"Very bright colors and heavily scented candles.",note:""},
    {id:"demo-alex",name:"Alex",birthday:"1995-12-12",photo:"demo-person:3",
      likes:"Mechanical keyboards, science fiction, board games and sketchbooks.",
      avoid:"Random gaming merch and oversized desk decorations.",note:""},
    {id:"demo-katya",name:"Katya",birthday:"1995-08-13",photo:"",
      likes:"Travel journals, prints, independent bookstores and theater.",
      avoid:"Generic souvenirs.",note:""},
    {id:"demo-elena",name:"Elena",birthday:"1968-05-06",photo:"",
      likes:"Garden plants, tea sets and handmade linens.",
      avoid:"Heavy perfumes.",note:""},
    {id:"demo-nora",name:"Nora",birthday:"1999-01-24",photo:"",
      likes:"Craft kits, watercolor supplies and exhibitions.",
      avoid:"Plastic decorations.",note:""},
    {id:"demo-max",name:"Max",birthday:"1991-03-05",photo:"",
      likes:"Cycling equipment, espresso accessories and podcasts.",
      avoid:"Scented products.",note:""},
    {id:"demo-leo",name:"Leo",birthday:"2001-07-21",photo:"",
      likes:"Vinyl records, music gear and unusual books.",
      avoid:"Clothes without checking the size.",note:""},
    {id:"demo-emma",name:"Emma",birthday:"1992-09-17",photo:"",
      likes:"Cooking classes, fresh flowers and paper goods.",
      avoid:"Strongly perfumed beauty sets.",note:""},
    // Diverse ages and candid, contextual portrait photos for design preview
    // only; URLs are public Unsplash License photographs, not real user data.
    {id:"demo-grandma",name:"Grandma Ruth",birthday:"1950-04-02",
      photo:"https://images.unsplash.com/photo-1768567312002-adbeced8e41c?auto=format&fit=crop&w=540&h=540&q=75",
      likes:"Gardening, handwritten letters, knitting and long walks.",
      avoid:"Heavily perfumed home fragrances.",note:""},
    {id:"demo-grandpa",name:"Grandpa Theo",birthday:"1954-10-21",
      photo:"https://images.unsplash.com/photo-1779126299917-1c1d414dbc26?auto=format&fit=crop&w=540&h=540&q=75",
      likes:"Local history, crosswords and classic films.",
      avoid:"Complicated gadgets.",note:""},
    {id:"demo-lily",name:"Lily",birthday:"2017-04-18",
      photo:"https://images.unsplash.com/photo-1684664886440-9c0357ce3ae4?auto=format&fit=crop&w=540&h=540&q=75",
      likes:"Drawing, building little houses and picture books.",
      avoid:"Loud electronic toys.",note:""},
    {id:"demo-oliver",name:"Oliver",birthday:"2014-12-04",
      photo:"https://images.unsplash.com/photo-1684664887279-98c6c71a6cbd?auto=format&fit=crop&w=540&h=540&q=75",
      likes:"LEGO, nature books and puzzles.",
      avoid:"Too-young toys.",note:""},
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
    {
      id: "demo-march8", name: "March 8", kind: "holiday" as const,
      date: "2027-03-08", enabled: true,
      people: ["demo-mira", "demo-sasha"],
      budgets: { "demo-mira": 2200, "demo-sasha": 1800 }, demo: true,
    },
  ];
  events.push({
    id:"demo-family", name:"Family gathering", kind:"other" as const,
    date:"2027-02-14", enabled:true,
    people:["demo-grandma","demo-grandpa","demo-lily","demo-oliver"],
    budgets:{"demo-grandma":3000,"demo-grandpa":3500,"demo-lily":1800,"demo-oliver":2600},
    demo:true,
  });
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
    { id: "demo-third-mira", name: "Cozy reading blanket", eventId: "demo-newyear",
      personId: "demo-mira", price: 1900, status: "to_buy" as const,
      image: blanketPhoto, note: "", link: "" },
    { id: "demo-grandma-flower", name: "Garden tools", eventId: "demo-family",
      personId: "demo-grandma", price: 1300, status: "bought" as const,
      image: "", note: "", link: "" },
    { id: "demo-oliver-book", name: "Nature book", eventId: "demo-family",
      personId: "demo-oliver", price: 1200, status: "to_buy" as const,
      image: artbookPhoto, note: "", link: "" },
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
