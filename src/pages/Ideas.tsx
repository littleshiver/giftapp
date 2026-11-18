import { useRef } from "react";
import { Check, X } from "lucide-react";
import { Empty, IdeaRow, Section, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { uid } from "../utils/format";
// Inline the approved thumbnails so saved discovery photos survive origin changes/backups.
import artbook from "../assets/discovery/artbook.jpg?inline";
import blanket from "../assets/discovery/blanket.jpg?inline";
import mug from "../assets/discovery/mug.jpg?inline";
import candle from "../assets/discovery/candle.jpg?inline";
const suggestions = [
  {
    name: "A beautiful art book",
    detail: "A thoughtful edition for someone who loves visual stories.",
    image: artbook,
    price: 1800,
  },
  {
    name: "Something cozy",
    detail: "A soft everyday comfort, chosen with care.",
    image: blanket,
    price: 2100,
  },
  {
    name: "Coffee ritual",
    detail: "A little object to make mornings more enjoyable.",
    image: mug,
    price: 1200,
  },
  {
    name: "A quiet evening",
    detail: "Something atmospheric for their favorite space.",
    image: candle,
    price: 900,
  },
];
export function Ideas() {
  const { data, commit, notify, ui, setUi } = useApp(),
    index = ui.suggestionIndex,
    personId = ui.filterPerson,
    start = useRef<number | null>(null),
    item = suggestions[index % suggestions.length];
  const skip = () => setUi({ suggestionIndex: index + 1 }),
    save = () => {
      if (
        commit({
          ...data,
          ideas: [
            ...data.ideas,
            {
              id: uid(),
              name: item.name,
              price: item.price,
              image: item.image,
              note: item.detail,
              link: "",
              personId: personId === "all" ? "" : personId,
            },
          ],
        })
      ) {
        skip();
        notify("Saved to ideas ✓");
      }
    };
  const ideas = data.ideas.filter(
    (i) => personId === "all" || i.personId === personId,
  );
  return (
    <>
      <Title name="Ideas" />
      <section>
        <Section title="Discover" />
        <div
          className="idea-spotlight"
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
          style={{ touchAction: "pan-y" }}
        >
          <p className="overline">
            A little inspiration · {(index % suggestions.length) + 1} /{" "}
            {suggestions.length}
          </p>
          <img className="spot-product" src={item.image} alt={item.name} />
          <h3>{item.name}</h3>
          <p>{item.detail}</p>
          <div className="idea-actions">
            <button
              className="round-action"
              aria-label="Skip idea"
              onClick={skip}
            >
              <X size={20} />
            </button>
            <button
              className="round-action main"
              aria-label="Save idea"
              onClick={save}
            >
              <Check size={21} />
            </button>
          </div>
        </div>
      </section>
      <section className="section">
        <Section title="Saved ideas" />
        <div className="filter-row" aria-label="Filter ideas by person">
          {[{ id: "all", name: "All" }, ...data.people].map((p) => (
            <button
              key={p.id}
              className={`filter-pill ${personId === p.id ? "active" : ""}`}
              aria-pressed={personId === p.id}
              onClick={() => setUi({ filterPerson: p.id })}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="info-list">
          {ideas.length ? (
            ideas.map((i) => <IdeaRow key={i.id} idea={i} />)
          ) : (
            <Empty>
              Save inspiration for later, without assigning an occasion.
            </Empty>
          )}
        </div>
      </section>
    </>
  );
}
