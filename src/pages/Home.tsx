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
import { fmtDate, fullDate, today } from "../utils/format";
import { CountdownBadge, daysUntilDate } from "../components/CountdownBadge";
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
  const { data, ui, setUi, openGiftPreview } = useApp(),
    navigate = useNavigate(),
    upcoming = enabledEvents(data).filter((e) => e.date >= today()),
    selected = upcoming.find((e) => e.id === ui.selectedEvent) || upcoming[0],
    selectedTone = selected ? toneFor(upcoming.indexOf(selected)) : eventTones.peach,
    selectedGifts = selected ? giftsFor(data, selected.id) : [];
  const upcomingRef = useRef<HTMLDivElement>(null);
  const giftsRef = useRef<HTMLDivElement>(null);
  const alignOnSelection = useRef(false);
  const programmaticScroll = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alignTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if ((selected?.id || "") !== ui.selectedEvent)
      setUi({ selectedEvent: selected?.id || "" });
  }, [selected?.id]);

  // A tap may align the selected occasion, but a manual horizontal scroll
  // must never be dragged back by the old auto-centering effect.
  useEffect(() => {
    const track = upcomingRef.current;
    if (!track || !alignOnSelection.current) return;
    alignOnSelection.current = false;
    const active = track.querySelector<HTMLButtonElement>(".occasion-chip.is-selected");
    if (!active) return;
    const inset = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const offset = active.getBoundingClientRect().left - track.getBoundingClientRect().left - inset;
    if (Math.abs(offset) < 2) return;
    programmaticScroll.current = true;
    track.scrollTo({
      left: Math.max(0, track.scrollLeft + offset),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    if (alignTimer.current) clearTimeout(alignTimer.current);
    alignTimer.current = setTimeout(() => { programmaticScroll.current = false; }, 500);
  }, [selected?.id]);

  // The card nearest the visible center becomes selected after the user
  // finishes scrolling. Keep tapping as a separate, equally valid input.
  const upcomingIds = upcoming.map(event => event.id).join("|");
  useEffect(() => {
    const track = upcomingRef.current;
    if (!track) return;
    const handleScroll = () => {
      if (programmaticScroll.current) return;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        const bounds = track.getBoundingClientRect();
        const center = bounds.left + bounds.width / 2;
        const cards = Array.from(track.querySelectorAll<HTMLButtonElement>(".occasion-chip"));
        const nearest = cards.reduce<HTMLButtonElement | null>((best, card) => {
          if (!best) return card;
          const rect = card.getBoundingClientRect();
          const prev = best.getBoundingClientRect();
          return Math.abs(rect.left + rect.width / 2 - center) <
            Math.abs(prev.left + prev.width / 2 - center) ? card : best;
        }, null);
        const id = nearest?.dataset.occasionId;
        if (id && id !== ui.selectedEvent) setUi({ selectedEvent: id });
      }, 130);
    };
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [upcomingIds, ui.selectedEvent]);

  useEffect(() => {
    if (ui.greetingDismissed) return;
    // Scroll restoration and router scrollTo are not user interactions.
    // Dismiss only after a real wheel, touch or keyboard scroll intention.
    let userScrolled = false;
    const onIntent = () => { userScrolled = true; };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "End", "Home"].includes(event.key)) {
        onIntent();
      }
    };
    const dismissOnScroll = () => {
      if (userScrolled && window.scrollY > 24) setUi({ greetingDismissed: true });
    };
    window.addEventListener("wheel", onIntent, { passive: true });
    window.addEventListener("touchmove", onIntent, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", dismissOnScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onIntent);
      window.removeEventListener("touchmove", onIntent);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", dismissOnScroll);
    };
  }, [ui.greetingDismissed]);

  // The greeting is a welcome on first arrival, not on each client-side
  // return to Home. A full browser reload recreates the ephemeral UI state.
  useEffect(() => () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    if (alignTimer.current) clearTimeout(alignTimer.current);
    setUi({ greetingDismissed: true });
  }, []);

  // Every newly selected occasion starts at its first gift. This also avoids
  // inherited scroll offsets from the previous panel's horizontal rail.
  useEffect(() => {
    if (giftsRef.current) giftsRef.current.scrollLeft = 0;
  }, [selected?.id]);
  return (
    <>
      <header className="home-heading">
        <HomeBrand />
        <div className={`home-greeting-wrap ${ui.greetingDismissed ? "is-dismissed" : ""}`}>
          <h1 className={`home-greeting ${ui.greetingDismissed ? "is-dismissed" : ""}`}
            aria-hidden={ui.greetingDismissed}>
            Hi, {data.settings.name?.trim() || "there"}
            <span className="greeting-wave" role="img" aria-label="waving hand">👋</span>
          </h1>
        </div>
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
                data-occasion-id={e.id}
                className={`occasion-chip ${selected?.id === e.id ? "is-selected" : ""}`}
                style={toneStyle(toneFor(index))}
                aria-pressed={selected?.id === e.id}
                onClick={() => {
                  if (selected?.id !== e.id) alignOnSelection.current = true;
                  setUi({ selectedEvent: e.id });
                }}
              >
                <CountdownBadge days={daysUntilDate(e.date)} className="occ-count"/>
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
                  <stop offset="1" stopColor={selectedTone.end} />
                </linearGradient>
              </defs>
              <path
                d={`M0 48 Q0 26 24 20 C97 -6 141 10 209 34 C276 57 332 4 377 23 Q400 31 400 55 L400 456 C332 477 255 497 185 480 C100 462 58 499 0 472 Z`}
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
              {selectedGifts.length ? selectedGifts.map((g) => (
                <Product
                  key={g.id}
                  item={g}
                  person={selected.people.length > 1}
                  home
                  showEdit={false}
                  onClick={() => openGiftPreview(g.id)}
                />
              )) : (
                <div className="home-empty-gifts" role="status">
                  Add gifts with the + button and they’ll appear here.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      <HomeBudgets data={data}/>
      <HomeInspiration />
    </>
  );
}
