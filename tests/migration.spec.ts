import { test, expect } from "@playwright/test";
import { decodeData } from "../src/persistence/upgrade";
const image = "data:image/png;base64,aGVsbG8=";
const legacy = {
  extra: "keep me",
  people: [{ id: "p", name: "Alex", birthday: "", note: "Preferences" }],
  events: [
    {
      id: "e",
      name: "Holiday",
      date: "2026-12-31",
      kind: "holiday",
      people: ["p"],
      budgets: { p: 0 },
      enabled: false,
    },
  ],
  gifts: ["idea", "planned", "bought", "given"].map((status, i) => ({
    id: "g" + i,
    name: status,
    personId: "p",
    eventId: "e",
    status,
    price: 123,
    note: "Note",
    link: "https://example.com",
    image,
    custom: { nested: true },
  })),
  settings: { birthdayBudget: 0, christmas: true },
  skipped: ["x"],
};
for (const version of [1, 2] as const)
  test(`v${version}: lossless upgrade and version 3 round trip`, () => {
    const raw = JSON.stringify(
        version === 1 ? legacy : { version: 2, data: legacy },
      ),
      data = decodeData(raw);
    expect(data.gifts.map((g) => g.status)).toEqual([
      "to_buy",
      "bought",
      "bought",
    ]);
    expect(data.ideas).toHaveLength(1);
    expect(data.ideas[0].migration?.original).toEqual(legacy.gifts[0]);
    expect(data.migration).toEqual({
      sourceVersion: version,
      original: legacy,
    });
    expect(data.events[0].budgets.p).toBe(0);
    expect(data.settings.birthdayBudget).toBe(0);
    expect(data.events[0].enabled).toBe(false);
    for (const g of [...data.ideas, ...data.gifts]) {
      expect(g.image).toBe(image);
      expect(g.note).toBe("Note");
      expect(g.link).toBe("https://example.com");
      expect(g.custom).toEqual({ nested: true });
    }
    expect(decodeData(JSON.stringify({ version: 3, data }))).toEqual(data);
    expect(JSON.parse(raw)).toEqual(
      version === 1 ? legacy : { version: 2, data: legacy },
    );
  });
test("invalid and unknown backups are rejected; incomplete relationships are preserved", () => {
  expect(() => decodeData("{bad")).toThrow();
  expect(() => decodeData('{"version":4}')).toThrow("Unsupported");
  expect(() =>
    decodeData(
      JSON.stringify({ ...legacy, gifts: [{ ...legacy.gifts[0], price: -1 }] }),
    ),
  ).toThrow("Invalid gift");
  const data = decodeData(
    JSON.stringify({
      ...legacy,
      events: [{ ...legacy.events[0], people: [], budgets: {} }],
    }),
  );
  expect(data.gifts).toHaveLength(3);
  expect(data.events[0].budgets).toEqual({});
  expect(() =>
    decodeData(
      JSON.stringify({
        version: 3,
        data: { ...data, gifts: [{ ...data.gifts[0], status: "given" }] },
      }),
    ),
  ).toThrow("Invalid gift");
});
