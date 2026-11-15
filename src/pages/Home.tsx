import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { Section, Photo, Product, BudgetBar, Empty } from "../components/UI";
import { useApp } from "../state/AppState";
import type { Event } from "../domain/models";
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
    chip: "#FFF1E7", surface: "#FCE2D2",
    start: "#FFC9B2", middle: "#FFE0CA", end: "#FFF9F3",
    edge: "#D9A68D", thumb: "#FFE3CD", count: "#FFF5EC",
  },
  rose: {
    chip: "#FFF0F4", surface: "#F8DBE6",
    start: "#F6C7D7", middle: "#FCE1E9", end: "#FFFAFC",
    edge: "#D6A3B5", thumb: "#F9DFE9", count: "#FFF3F8",
  },
  mint: {
    chip: "#EDF8F2", surface: "#D9F2E7",
    start: "#BDE5D3", middle: "#E0F4E7", end: "#FBFEFC",
    edge: "#9ACAB5", thumb: "#D5F0E1", count: "#F0FAF5",
  },
  butter: {
    chip: "#FFF7E7", surface: "#FFEBC8",
    start: "#F8D9A6", middle: "#FFEDCD", end: "#FFFDF7",
    edge: "#DDBD81", thumb: "#FFF0CF", count: "#FFFAEB",
  },
  sky: {
    chip: "#F0F5FE", surface: "#DEEBFC",
    start: "#C5DBF8", middle: "#E4EEFD", end: "#FBFDFF",
    edge: "#ADC6E5", thumb: "#E1EDFA", count: "#F3F8FF",
  },
};
function toneFor(event: Event, index: number): EventTone {
  if (event.kind === "birthday") return eventTones[index % 2 ? "rose" : "peach"];
  if (event.kind === "holiday") return eventTones[index % 2 ? "mint" : "sky"];
  return eventTones[index % 2 ? "butter" : "rose"];
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
    selectedTone = selected ? toneFor(selected, upcoming.indexOf(selected)) : eventTones.peach,
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
                style={toneStyle(toneFor(e, index))}
                aria-pressed={selected?.id === e.id}
                onClick={() => setUi({ selectedEvent: e.id })}
              >
                <span className="occ-count">{countdown(e.date)}</span>
                <span
                  className="occ-thumb"
                  style={{ background: "var(--event-thumb)" }}
                >
                  <Photo src={e.image} birthday={e.kind === "birthday"} />
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
