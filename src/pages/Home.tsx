import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { Section, Photo, Product, BudgetBar, Empty } from "../components/UI";
import { useApp } from "../state/AppState";
import { enabledEvents, giftsFor, monthSummary } from "../domain/selectors";
import {
  countdown,
  currency,
  fmtDate,
  fullDate,
  monthName,
  today,
} from "../utils/format";
export function Home() {
  const { data, ui, setUi, openEditor } = useApp(),
    navigate = useNavigate(),
    upcoming = enabledEvents(data).filter((e) => e.date >= today()),
    selected = upcoming.find((e) => e.id === ui.selectedEvent) || upcoming[0],
    month = monthSummary(data, today().slice(0, 7));
  useEffect(() => {
    if ((selected?.id || "") !== ui.selectedEvent)
      setUi({ selectedEvent: selected?.id || "" });
  }, [selected?.id]);
  return (
    <>
      <header className="home-heading">
        <p className="header-month">
          <CalendarDays size={15} aria-hidden="true" />
          {monthName(new Date())}
        </p>
        <h1 className="home-greeting">
          Hi, {data.settings.name?.trim() || "there"}
          <span className="greeting-wave" role="img" aria-label="waving hand">👋</span>
        </h1>
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
            {upcoming.map((e) => (
              <button
                key={e.id}
                className={`occasion-chip ${selected?.id === e.id ? "is-selected" : ""}`}
                aria-pressed={selected?.id === e.id}
                onClick={() => setUi({ selectedEvent: e.id })}
              >
                <span className="occ-count">{countdown(e.date)}</span>
                <span
                  className="occ-thumb"
                  style={{
                    background:
                      e.kind === "birthday" ? "var(--butter)" : "var(--mint)",
                  }}
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
                  <stop offset="0" stopColor="#FFF3E6" />
                  <stop offset=".54" stopColor="#FBF8F1" />
                  <stop offset="1" stopColor="#EAF3EA" />
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
