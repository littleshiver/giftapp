import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { Section, Photo, Product, BudgetBar, Empty } from "../components/UI";
import { useApp } from "../state/AppState";
import { OccasionArt } from "../components/OccasionArt";
import { enabledEvents, giftsFor, monthSummary } from "../domain/selectors";
import {
  countdown,
  currency,
  fmtDate,
  fullDate,
  today,
} from "../utils/format";
type EventTone = {
  chip: string;
  surface: string;
  start: string;
  middle: string;
  end: string;
  edge: string;
  thumb: string;
  count: string;
};
const eventTones: Record<string, EventTone> = {
  peach: {
    chip: "#FFF0E6", surface: "#FFDAC5",
    start: "#FFD0B5", middle: "#FFE3D1", end: "#FFF9F4",
    edge: "#D7A78C", thumb: "#FFFFFF", count: "#FFFFFF",
  },
  mint: {
    chip: "#EDF9F1", surface: "#D2F0E0",
    start: "#BFE9D2", middle: "#DFF5E8", end: "#FBFEFC",
    edge: "#9BCDB4", thumb: "#FFFFFF", count: "#FFFFFF",
  },
  rose: {
    chip: "#FFF0F5", surface: "#F9D9E5",
    start: "#F5CBDD", middle: "#FBE2EA", end: "#FFF9FC",
    edge: "#D9A9BF", thumb: "#FFFFFF", count: "#FFFFFF",
  },
  sky: {
    chip: "#EFF5FF", surface: "#D9E8FF",
    start: "#C6DCFA", middle: "#E2EFFF", end: "#FAFCFF",
    edge: "#A9C3E7", thumb: "#FFFFFF", count: "#FFFFFF",
  },
};
const paletteOrder = ["peach", "mint", "rose", "sky"] as const;
/** Palette repeats by the card's chronological position, never by occasion type. */
function toneFor(index: number): EventTone {
  return eventTones[paletteOrder[((index % 4) + 4) % 4]];
}
function toneStyle(t: EventTone): CSSProperties {
  return {
    "--event-chip": t.chip,
    "--event-surface": t.surface,
    "--event-start": t.start,
    "--event-middle": t.middle,
    "--event-end": t.end,
    "--event-edge": t.edge,
    "--event-thumb": t.thumb,
    "--event-count": t.count,
  } as CSSProperties;
}
export function Home() {
  const { data, ui, setUi, openEditor } = useApp(),
    navigate = useNavigate(),
    upcoming = enabledEvents(data).filter((e) => e.date >= today()),
    selected = upcoming.find((e) => e.id === ui.selectedEvent) || upcoming[0],
    selectedTone = selected ? toneFor(upcoming.indexOf(selected)) : eventTones.peach,
    month = monthSummary(data, today().slice(0, 7));
  useEffect(() => {
    if ((selected?.id || "") !== ui.selectedEvent)
      setUi({ selectedEvent: selected?.id || "" });
  }, [selected?.id]);
  return (
    <>
      <header className="home-heading">
        <h1 className="home-greeting">
          Hi, {data.settings.name?.trim() || "there"}
          <span className="greeting-wave" role="img" aria-label="waving hand">👋</span>
        </h1>
        <p className="header-month">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>
      <section>
        <Section title="Coming up">
          <Link className="section-link" to="/events">
            View calendar
            <ArrowRight size={16} />
          </Link>
        </Section>
        {upcoming.length ? (
          <div
            className="hscroll upcoming-track"
            aria-label="Upcoming occasions"
          >
            {upcoming.map((e, index) => (
              <button
                key={e.id}
                className={`occasion-chip ${selected?.id === e.id ? "is-selected" : ""}`}
                style={toneStyle(toneFor(index))}
                aria-pressed={selected?.id === e.id}
                onClick={() => setUi({ selectedEvent: e.id })}
              >
                <span className="occ-count">{countdown(e.date)}</span>
                <span className="occ-thumb">
                  {e.image ? (
                    <Photo src={e.image} name={e.name} />
                  ) : (
                    <OccasionArt event={e} />
                  )}
                </span>
                <span>
                  <span className="occ-name">{e.name}</span>
                  <span className="occ-date">{fmtDate(e.date)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty>Add your first occasion to start planning.</Empty>
        )}
      </section>
      {selected && (
        <section style={{ marginTop: 5 }}>
          <div
            key={selected.id}
            className="focus-card"
            style={toneStyle(selectedTone)}
            role="link"
            tabIndex={0}
            aria-label={`Open ${selected.name}`}
            onClick={() => navigate(`/events/${selected.id}`)}
            onKeyDown={(e) => {
              if (
                e.target === e.currentTarget &&
                (e.key === "Enter" || e.key === " ")
              ) {
                e.preventDefault();
                navigate(`/events/${selected.id}`);
              }
            }}
          >
            <svg className="focus-wave" viewBox="0 0 400 185" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="givvy-focus-wave" x1="0" y1="0" x2="1" y2="0.45">
                  <stop offset="0" stopColor={selectedTone.start} />
                  <stop offset=".53" stopColor={selectedTone.middle} />
                  <stop offset="1" stopColor={selectedTone.end} />
                </linearGradient>
              </defs>
              <path
                d="M0 49 Q0 26 24 20 C97 -6 141 10 209 34 C276 57 332 4 377 23 Q400 31 400 55 L400 185 L0 185 Z"
                fill="url(#givvy-focus-wave)"
              />
            </svg>
            <div className="focus-head">
              <div className="focus-date">
                <CalendarDays size={14} />
                {fullDate(selected.date)}
              </div>
              <h2>{selected.name}</h2>
            </div>
            <div className="focus-gifts">
              {giftsFor(data, selected.id).map((g) => (
                <Product
                  key={g.id}
                  item={g}
                  person={selected.people.length > 1}
                  home
                />
              ))}
              <div className="product-add">
                <button
                  aria-label={`Add gift to ${selected.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditor({ type: "gift", eventId: selected.id });
                  }}
                >
                  <Plus size={25} />
                </button>
                <span className="product-caption">Add a gift</span>
              </div>
            </div>
          </div>
        </section>
      )}
      {month.events.length > 0 && (
        <section className="section">
        <Link className="compact-budget budget-link" to="/events?mode=planning">
          <div className="budget-head">
            <strong>Gift plans</strong>
            <span className="budget-value">
              {currency(month.committed)}{" "}
              <span className="muted">/ {currency(month.budget)}</span>
            </span>
          </div>
          <BudgetBar
            bought={month.bought}
            committed={month.committed}
            budget={month.budget}
          />
          <div className="budget-sub">
            <span>
              {month.events.length}{" "}
              {month.events.length === 1 ? "occasion" : "occasions"} this month
            </span>
            <span className={month.committed > month.budget ? "warning" : ""}>
              {month.committed > month.budget
                ? `${currency(month.committed - month.budget)} over budget`
                : `${currency(month.bought)} bought`}
            </span>
          </div>
        </Link>
        </section>
      )}
      <section className="section">
        <Link className="inspiration" to="/ideas">
          <span>
            <strong>Need inspiration?</strong>
            <p>Discover ideas for any occasion.</p>
          </span>
          <span className="inspire-icon">
            <ArrowRight size={20} />
          </span>
        </Link>
      </section>
    </>
  );
}
