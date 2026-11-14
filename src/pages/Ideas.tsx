import { useRef } from "react";
import { Heart, X } from "lucide-react";
import { AddGift, GiftList, Section, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { uid } from "../utils/format";
const suggestions = [
  [
    "📚",
    "A book they’d actually love",
    "A novel, an art book or a beautiful special edition.",
  ],
  [
    "🕯️",
    "A cosy little ritual",
    "A candle, tea set or something for slow evenings.",
  ],
  ["🎟️", "An experience together", "A show, a workshop or a small adventure."],
  [
    "🧩",
    "Something fun to play with",
    "A playful desk gadget, puzzle or fidget.",
  ],
  [
    "🪴",
    "A little green friend",
    "A cute plant or a lovely pot for their space.",
  ],
  ["🎨", "A creative afternoon", "Something for their favorite hobby."],
  [
    "💌",
    "Something personal",
    "An illustrated photo, a letter or a handmade gift.",
  ],
];
export function Ideas() {
  const { data, commit, notify, ui, setUi } = useApp(),
    index = ui.suggestionIndex,
    personId = ui.filterPerson,
    start = useRef<number | null>(null),
    [emoji, name, description] = suggestions[index % suggestions.length];
  const skip = () => setUi({ suggestionIndex: index + 1 });
  const save = () => {
    if (personId === "all") {
      notify("Choose a person first.");
      return;
    }
    const events = data.events
      .filter((e) => e.people.includes(personId))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!events.length) {
      notify("Add this person to an occasion first.");
      return;
    }
    if (
      commit({
        ...data,
        gifts: [
          ...data.gifts,
          {
            id: uid(),
            personId,
            eventId: events[0].id,
            name,
            price: 0,
            status: "idea",
            note: description,
            image: "",
          },
        ],
      })
    ) {
      skip();
      notify("Added to gift ideas ♡");
    }
  };
  return (
    <>
      <Title name="Gift ideas" subtitle="Find the one that feels just right." />
      <div className="card">
        <div className="smallcaps">
          GIFT EXPLORER · {(index % suggestions.length) + 1} /{" "}
          {suggestions.length}
        </div>
        <div className="field">
          <label htmlFor="suggest-person">Finding ideas for</label>
          <select
            id="suggest-person"
            value={personId}
            onChange={(e) => setUi({ filterPerson: e.target.value })}
          >
            <option value="all">Pick a person…</option>
            {data.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div
          className="suggest"
          style={{ touchAction: "pan-y" }}
          onTouchStart={(e) => {
            start.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (start.current === null) return;
            const dx = e.changedTouches[0].clientX - start.current;
            start.current = null;
            if (dx > 70) save();
            else if (dx < -70) skip();
          }}
          onTouchCancel={() => {
            start.current = null;
          }}
        >
          <div className="suggest-emoji">{emoji}</div>
          <h3>{name}</h3>
          <p>{description}</p>
        </div>
        <div className="suggestactions">
          <button className="roundaction" aria-label="Skip idea" onClick={skip}>
            <X />
          </button>
          <button
            className="roundaction yes"
            aria-label="Save idea"
            onClick={save}
          >
            <Heart />
          </button>
        </div>
        <p className="fineprint" style={{ textAlign: "center" }}>
          Swipe left to skip or right to save. You can also use the buttons.
        </p>
      </div>
      <Section title="Saved ideas">
        <AddGift />
      </Section>
      <GiftList gifts={data.gifts} />
    </>
  );
}
