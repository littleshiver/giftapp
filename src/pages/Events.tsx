import { useEffect, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Empty, Section, Photo } from "../components/UI";
import { OccasionArt } from "../components/OccasionArt";
import { useApp } from "../state/AppState";
import { enabledEvents, eventBudget } from "../domain/selectors";
import type { AppData, Event } from "../domain/models";
import {
  currency,
  fmtDate,
  iso,
  monthName,
  parseDate,
  today,
} from "../utils/format";

/** Pastel rotation is decorative and follows event order, not the event type. */
const occasionTones = [
  { tint: "#FFF0E6", accent: "#D19A78", dot: "#D98B67" },
  { tint: "#ECF8F1", accent: "#91BDA7", dot: "#70B899" },
  { tint: "#FFF0F5", accent: "#D7A6BC", dot: "#CD88AB" },
  { tint: "#EFF5FF", accent: "#A5BEDF", dot: "#82ABE1" },
] as const;

function occasionTone(index: number): CSSProperties {
  const tone = occasionTones[index % occasionTones.length];
  return {
    "--calendar-event-tint": tone.tint,
    "--calendar-event-accent": tone.accent,
    "--calendar-event-dot": tone.dot,
  } as CSSProperties;
}

function giftStatus(data: AppData, event: Event): string {
  const gifts = data.gifts.filter((g) => g.eventId === event.id);
  if (!gifts.length) return "No gifts planned yet";
  const remaining = gifts.filter((g) => g.status !== "bought").length;
  if (!remaining) return "All gifts bought";
  return `${remaining} ${remaining === 1 ? "gift" : "gifts"} to buy`;
}

function MonthEventCard({
  event,
  data,
  index,
}: {
  event: Event;
  data: AppData;
  index: number;
}) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="calendar-event-card"
      style={occasionTone(index)}
    >
      <span className="calendar-event-art" aria-hidden="true">
        {event.image ? <Photo src={event.image} name={event.name} /> : <OccasionArt event={event} />}
      </span>
      <span className="calendar-event-body">
        <strong>{event.name}</strong>
        <span className="calendar-event-date">{fmtDate(event.date)}</span>
        <span className="calendar-event-status">{giftStatus(data, event)}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.9} className="calendar-event-chevron" aria-hidden="true" />
    </Link>
  );
}

export function Events() {
  const { data, ui, setUi } = useApp();
  const [params] = useSearchParams();
  const { mode } = ui;
  const month = parseDate(ui.month);
  const monthKey = iso(new Date(month.getFullYear(), month.getMonth(), 1)).slice(0, 7);
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  // A date from another month never filters the newly viewed month.
  const activeDate = filteredDate?.slice(0, 7) === monthKey ? filteredDate : null;
  const evs = enabledEvents(data);
  const monthEvents = evs.filter((e) => e.date.slice(0, 7) === monthKey);
  const displayedEvents = activeDate
    ? monthEvents.filter((e) => e.date === activeDate)
    : monthEvents;

  // Use the exact same index for a date marker and its corresponding list card.
  const byDate = new Map<string, { event: Event; index: number }[]>();
  const perMonthIndex = new Map<string, number>();
  evs.forEach((event) => {
    const ym = event.date.slice(0, 7);
    const index = perMonthIndex.get(ym) ?? 0;
    perMonthIndex.set(ym, index + 1);
    const existing = byDate.get(event.date) ?? [];
    existing.push({ event, index });
    byDate.set(event.date, existing);
  });

  useEffect(() => {
    if (params.get("mode") === "planning") setUi({ mode: "planning" });
  }, [params]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const gridLength = Math.ceil((offset + days) / 7) * 7;
  const move = (n: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setFilteredDate(null);
    setUi({ month: iso(next), selected: iso(next) });
  };
  const selectDate = (ds: string) => {
    setUi({ selected: ds, month: ds });
    setFilteredDate(ds);
  };
  const groups = evs.reduce<Record<string, typeof evs>>((out, e) => {
    (out[e.date.slice(0, 7)] ??= []).push(e);
    return out;
  }, {});

  return (
    <>
      <header className="page-heading events-page-heading">
        <h1 className="title-xl">Events</h1>
      </header>
      <div className="events-mode-row">
        <div className="pill-tabs" role="group" aria-label="Events view">
          {(["calendar", "planning"] as const).map((view) => (
            <button
              key={view}
              type="button"
              className={`pill-tab ${mode === view ? "is-active" : ""}`}
              aria-pressed={mode === view}
              onClick={() => setUi({ mode: view })}
            >
              {view === "calendar" ? "Calendar" : "Planning"}
            </button>
          ))}
        </div>
      </div>

      {mode === "calendar" ? (
        <>
          <div className="calendar-card">
            <div className="calendar-top">
              <button
                type="button"
                className="cal-arrow"
                aria-label="Previous month"
                onClick={() => move(-1)}
              >
                <ChevronLeft size={19} />
              </button>
              <strong>{monthName(month)}</strong>
              <button
                type="button"
                className="cal-arrow"
                aria-label="Next month"
                onClick={() => move(1)}
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <div className="cal-week" aria-hidden="true">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="cal-grid" aria-label={`Calendar for ${monthName(month)}`}>
              {Array.from({ length: gridLength }, (_, i) => {
                const date = new Date(
                  month.getFullYear(),
                  month.getMonth(),
                  i - offset + 1,
                );
                const ds = iso(date);
                const marks = byDate.get(ds) ?? [];
                return (
                  <button
                    type="button"
                    key={ds}
                    aria-label={ds}
                    aria-pressed={activeDate === ds}
                    className={`cal-day ${date.getMonth() !== month.getMonth() ? "is-out" : ""} ${ds === today() ? "is-today" : ""} ${ds === activeDate ? "is-selected" : ""} ${marks.length ? "has-events" : ""}`}
                    onClick={() => selectDate(ds)}
                  >
                    <span className="cal-day-number">{date.getDate()}</span>
                    <span className="cal-dots" aria-hidden="true">
                      {marks.slice(0, 3).map(({ event, index }) => (
                        <i
                          className="cal-dot"
                          style={occasionTone(index)}
                          key={event.id}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <section className="calendar-agenda" aria-live="polite">
            <div className="calendar-agenda-heading">
              <div>
                <h2>{activeDate ? fmtDate(activeDate) : `${monthName(month).split(" ")[0]} events`}</h2>
                <p className="calendar-agenda-count">
                  {displayedEvents.length} {displayedEvents.length === 1 ? "occasion" : "occasions"}
                </p>
              </div>
              {activeDate && (
                <button type="button" className="calendar-show-all" onClick={() => setFilteredDate(null)}>
                  Show all
                </button>
              )}
            </div>
            {displayedEvents.length ? (
              <div className="calendar-event-list">
                {displayedEvents.map((event) => (
                  <MonthEventCard
                    key={event.id}
                    event={event}
                    data={data}
                    index={monthEvents.indexOf(event)}
                  />
                ))}
              </div>
            ) : (
              <div className="calendar-agenda-empty">
                <p className="calendar-empty-message">
                  {activeDate
                    ? "Nothing planned for this day. Choose another date or show the whole month."
                    : "No occasions this month. Browse another month to see what's coming."}
                </p>
              </div>
            )}
          </section>
        </>
      ) : Object.keys(groups).length ? (
        Object.entries(groups).map(([key, events]) => (
          <section className="month-block" key={key}>
            <Section title={monthName(parseDate(key + "-01"))} />
            <p className="section-note" style={{ marginBottom: 11 }}>
              {currency(events.reduce((n, e) => n + eventBudget(e), 0))}{" "}
              allocated · {events.length} occasions
            </p>
            {events.map((e) => (
              <Link className="plan-event" key={e.id} to={`/events/${e.id}`}>
                <span className="plan-date">
                  {parseDate(e.date).getDate()}
                  <small>
                    {parseDate(e.date)
                      .toLocaleDateString("en-US", { month: "short" })
                      .toUpperCase()}
                  </small>
                </span>
                <span className="item-body">
                  <strong>{e.name}</strong>
                  <small>{e.people.length} recipients</small>
                </span>
                <strong className="text-sm nowrap">
                  {currency(eventBudget(e))}
                </strong>
                <ChevronRight size={16} />
              </Link>
            ))}
          </section>
        ))
      ) : (
        <Empty>Add your first occasion to start planning.</Empty>
      )}
    </>
  );
}
