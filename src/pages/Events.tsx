import { ChevronLeft, ChevronRight } from "lucide-react";
import { Empty, EventRow, Section, Title } from "../components/UI";
import { useApp } from "../state/AppState";
import { enabledEvents } from "../domain/selectors";
import { fmtDate, iso, monthName, parseDate, today } from "../utils/format";
export function Events() {
  const { data, openEditor, ui, setUi } = useApp(),
    { mode, selected } = ui,
    month = parseDate(ui.month);
  const setMode = (mode: string) => setUi({ mode });
  const setSelected = (selected: string) => setUi({ selected });
  const setMonth = (date: Date) => setUi({ month: iso(date) });
  const evs = enabledEvents(data),
    first = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = (first.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const list =
    mode === "calendar" ? evs.filter((e) => e.date === selected) : evs;
  const changeMonth = (n: number) => {
    const d = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonth(d);
    setSelected(iso(d));
  };
  return (
    <>
      <Title
        name="Events"
        subtitle="Every reason to celebrate, in one place."
      />
      <div className="toolbar">
        <div className="seg">
          {["calendar", "list"].map((m) => (
            <button
              key={m}
              className={mode === m ? "active" : ""}
              onClick={() => setMode(m)}
            >
              {m === "calendar" ? "Calendar" : "List"}
            </button>
          ))}
        </div>
        <button
          className="floating"
          onClick={() => openEditor({ type: "event" })}
        >
          ＋ Event
        </button>
      </div>
      {mode === "calendar" && (
        <div className="card calendar">
          <div className="calhead">
            <button
              className="iconbtn"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft />
            </button>
            <strong>{monthName(month)}</strong>
            <button
              className="iconbtn"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="weekgrid">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div className="weekday" key={i}>
                {d}
              </div>
            ))}
          </div>
          <div className="daysgrid">
            {Array.from(
              { length: Math.ceil((offset + days) / 7) * 7 },
              (_, i) => {
                const d = new Date(
                    month.getFullYear(),
                    month.getMonth(),
                    i - offset + 1,
                  ),
                  ds = iso(d),
                  hits = evs.filter((e) => e.date === ds);
                return (
                  <button
                    key={ds}
                    aria-label={ds}
                    aria-pressed={selected === ds}
                    className={`day ${d.getMonth() !== month.getMonth() ? "dim" : ""} ${ds === today() ? "today" : ""} ${ds === selected ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(ds);
                      setMonth(d);
                    }}
                  >
                    {d.getDate()}
                    <span className="dots">
                      {hits.slice(0, 3).map((e, k) => (
                        <span
                          key={e.id}
                          className={`dot ${["p", "v", "y"][k]}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
      <Section
        title={
          mode === "calendar"
            ? selected === today()
              ? "Today"
              : fmtDate(selected)
            : "All occasions"
        }
      >
        <span className="sub">{list.length} events</span>
      </Section>
      <div className="card">
        {list.length ? (
          list.map((e) => <EventRow key={e.id} event={e} />)
        ) : (
          <Empty>
            {mode === "calendar"
              ? "Nothing planned for this day. A little breathing room."
              : "No occasions yet. Add your first celebration."}
          </Empty>
        )}
      </div>
      <p className="fineprint">
        Tap a date to see its occasions. The calendar also displays birthdays
        and celebrations you add yourself.
      </p>
    </>
  );
}
