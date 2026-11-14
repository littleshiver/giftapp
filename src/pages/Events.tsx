import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Empty, EventRow, Section, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { enabledEvents, eventBudget } from "../domain/selectors";
import {
  currency,
  fmtDate,
  iso,
  monthName,
  parseDate,
  today,
} from "../utils/format";
export function Events() {
  const { data, openEditor, ui, setUi } = useApp(),
    [params] = useSearchParams(),
    { mode, selected } = ui,
    month = parseDate(ui.month),
    evs = enabledEvents(data);
  useEffect(() => {
    if (params.get("mode") === "planning") setUi({ mode: "planning" });
  }, [params]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = (first.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    list = evs.filter((e) => e.date === selected);
  const move = (n: number) => {
    const d = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setUi({ month: iso(d), selected: iso(d) });
  };
  const groups = evs.reduce<Record<string, typeof evs>>((out, e) => {
    (out[e.date.slice(0, 7)] ??= []).push(e);
    return out;
  }, {});
  return (
    <>
      <Title
        name="Events"
        subtitle="Occasions, people and plans in one place."
      />
      <div className="layout-row" style={{ marginBottom: 19 }}>
        <div className="pill-tabs">
          {["calendar", "planning"].map((m) => (
            <button
              key={m}
              className={`pill-tab ${mode === m ? "is-active" : ""}`}
              onClick={() => setUi({ mode: m })}
            >
              {m === "calendar" ? "Calendar" : "Planning"}
            </button>
          ))}
        </div>
        <button
          className="iconbutton"
          aria-label="Add occasion"
          onClick={() => openEditor({ type: "event" })}
        >
          <Plus size={20} />
        </button>
      </div>
      {mode === "calendar" ? (
        <>
          <div className="calendar-card">
            <div className="calendar-top">
              <button
                className="cal-arrow"
                aria-label="Previous month"
                onClick={() => move(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <strong>{monthName(month)}</strong>
              <button
                className="cal-arrow"
                aria-label="Next month"
                onClick={() => move(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="cal-week">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="cal-grid">
              {Array.from(
                { length: Math.ceil((offset + days) / 7) * 7 },
                (_, i) => {
                  const d = new Date(
                      month.getFullYear(),
                      month.getMonth(),
                      i - offset + 1,
                    ),
                    ds = iso(d);
                  return (
                    <button
                      key={ds}
                      aria-label={ds}
                      aria-pressed={selected === ds}
                      className={`cal-day ${d.getMonth() !== month.getMonth() ? "is-out" : ""} ${ds === today() ? "is-today" : ""} ${ds === selected ? "is-selected" : ""}`}
                      onClick={() => setUi({ selected: ds, month: ds })}
                    >
                      {d.getDate()}
                      <span className="cal-dots">
                        {evs
                          .filter((e) => e.date === ds)
                          .slice(0, 3)
                          .map((e) => (
                            <i className="cal-dot" key={e.id} />
                          ))}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
          <section className="section">
            <Section
              title={selected === today() ? "Today" : fmtDate(selected)}
            />
            <div className="info-list">
              {list.length ? (
                list.map((e) => <EventRow key={e.id} event={e} />)
              ) : (
                <Empty>Nothing planned for this day. That's okay.</Empty>
              )}
            </div>
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
