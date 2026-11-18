import { useEffect, useRef, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { Section, Photo, Product, Empty } from "../components/UI";
import { HomeBrand } from "../components/HomeBrand";
import { HomeBudgets } from "../components/HomeBudgets";
import { HomeInspiration } from "../components/HomeInspiration";
import { useApp } from "../state/AppState";
import { OccasionArt } from "../components/OccasionArt";
import { enabledEvents, giftsFor } from "../domain/selectors";
import {
  countdown,
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
  const { data, ui, setUi } = useApp(),
    navigate = useNavigate(),
    upcoming = enabledEvents(data).filter((e) => e.date >= today()),
    selected = upcoming.find((e) => e.id === ui.selectedEvent) || upcoming[0],
    selectedTone = selected ? toneFor(upcoming.indexOf(selected)) : eventTones.peach;
  const upcomingRef = useRef<HTMLDivElement>(null);
  const giftsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((selected?.id || "") !== ui.selectedEvent)
      setUi({ selectedEvent: selected?.id || "" });
  }, [selected?.id]);

  // When selecting an upcoming occasion, align its leading edge with the
  // viewport's left inset. Never jump the document scroll position.
  useEffect(() => {
    const track = upcomingRef.current;
    const active = track?.querySelector<HTMLButtonElement>(".occasion-chip.is-selected");
    if (!track || !active) return;
    const inset = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const offset = active.getBoundingClientRect().left - track.getBoundingClientRect().left - inset;
    if (Math.abs(offset) < 2) return;
    track.scrollTo({
      left: Math.max(0, track.scrollLeft + offset),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [selected?.id]);
  // Every newly selected occasion starts at its first gift. This also avoids
  // inherited scroll offsets from the previous panel's horizontal rail.
  useEffect(() => {
    if (giftsRef.current) giftsRef.current.scrollLeft = 0;
  }, [selected?.id]);
  return (
    <>
      <header className="home-heading">
        <HomeBrand />
        <h1 className="home-greeting">
          Hi, {data.settings.name?.trim() || "there"}
          <span className="greeting-wave" role="img" aria-label="waving hand">👋</span>
        </h1>
      </header>
      <section>
        <Section title="Coming up">
          <Link data-ph="home-view-calendar" className="section-link" to="/events">
            View calendar
            <ArrowRight size={16} />
          </Link>
        </Section>
        {upcoming.length ? (
          <div
            className="hscroll upcoming-track"
            aria-label="Upcoming occasions"
            ref={upcomingRef}
          >
            {upcoming.map((e, index) => (
              <button data-ph="home-occasion-chip"
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
                <span className="occ-copy">
                  <span className="occ-date">{fmtDate(e.date)}</span>
                  <span className="occ-name">{e.name}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty>Add your first occasion to start planning.</Empty>
        )}
      </section>
      {selected && (
        <section className="home-featured-section">
          <div
            key={selected.id}
            className="focus-card"
            style={toneStyle(selectedTone)}
            aria-label={`Gifts for ${selected.name}`}
          >
            <svg className="focus-wave" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="givvy-focus-wave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={selectedTone.start} />
                  <stop offset=".32" stopColor={selectedTone.middle} />
                  <stop offset=".70" stopColor={selectedTone.end} />
                  <stop offset="1" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              <path
                d="M0 48 Q0 26 24 20 C97 -6 141 10 209 34 C276 57 332 4 377 23 Q400 31 400 55 L400 500 L0 500 Z"
                fill="url(#givvy-focus-wave)"
              />
            </svg>
            <div className="focus-head">
              <div className="focus-date">
                <CalendarDays size={14} />
                {fullDate(selected.date)}
              </div>
              <div className="focus-title-row">
                <h2>{selected.name}</h2>
                <Link data-ph="home-open-occasion"
                  className="focus-event-link"
                  to={`/events/${selected.id}`}
                  aria-label={`Open ${selected.name} occasion`}
                >
                  <ArrowUpRight size={19} strokeWidth={2.2} />
                </Link>
              </div>
            </div>
            <div className="focus-gifts" ref={giftsRef}>
              {giftsFor(data, selected.id).map((g) => (
                <Product
                  key={g.id}
                  item={g}
                  person={selected.people.length > 1}
                  home
                  showEdit={false}
                  onClick={() => navigate(`/events/${selected.id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      <HomeBudgets data={data} selected={selected}/>
      <HomeInspiration />
    </>
  );
}
