import { t } from "../utils/format";
import { useEffect, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, BellOff, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Empty, Section, Photo } from "../components/UI";
import { Sheet } from "../components/Primitives";
import { OccasionArt } from "../components/OccasionArt";
import { useApp } from "../state/AppState";
import { associationValid, enabledEvents } from "../domain/selectors";
import type { Event, ReminderDays } from "../domain/models";
import {
  fmtDate,
  locale,
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

function MonthEventCard({
  event,
  index,
  highlighted,
}: {
  event: Event;
  index: number;
  highlighted?: boolean;
}) {
  return (
    <Link data-ph="calendar-occasion"
      data-guided-event={highlighted ? "true" : undefined}
      to={`/events/${event.id}`}
      className="calendar-event-card"
      style={occasionTone(index)}
    >
      <span className="calendar-event-art" aria-hidden="true">
        {event.image ? <Photo src={event.image} name={event.name} /> : <OccasionArt event={event} />}
      </span>
      <span className="calendar-event-body">
        <span className="calendar-event-date">{fmtDate(event.date)}</span>
        <strong>{event.name}</strong>
      </span>
      <ChevronRight size={18} strokeWidth={1.9} className="calendar-event-chevron" aria-hidden="true" />
    </Link>
  );
}


const reminderOptions: { value: ReminderDays; label: string }[] = [
  { value: null, label: "Off" },
  { value: 0, label: "On the day" },
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
  { value: 14, label: "14 days before" },
];

function reminderLabel(value: ReminderDays) {
  return reminderOptions.find((option) => option.value === value)?.label ?? "Off";
}

function ReminderEventRow({
  event,
  index,
  onOpen,
}: {
  event: Event;
  index: number;
  onOpen: () => void;
}) {
  const current = event.reminderDays ?? null;
  const active = current !== null;
  const tint = occasionTones[index % occasionTones.length].tint;
  return (
    <article className="reminder-event">
      <div className="reminder-event-main">
        <span
          className="plan-date reminder-date"
          style={{ "--reminder-date-bg": tint } as CSSProperties}
          aria-hidden="true"
        >
          {parseDate(event.date).getDate()}
          <small>
            {parseDate(event.date).toLocaleDateString(locale, { month: "short" }).toUpperCase()}
          </small>
        </span>
        <Link data-ph="reminder-occasion" className="reminder-event-info" to={`/events/${event.id}`}>
          <strong>{event.name}</strong>
          <small className={active ? "is-on" : ""}>
            {active ? reminderLabel(current) : "No reminder"}
          </small>
        </Link>
        <button data-ph="reminder-toggle"
          type="button"
          className={`reminder-toggle ${active ? "is-on" : ""}`}
          aria-label={`Set reminder for ${event.name}`}
          aria-haspopup="dialog"
          onClick={onOpen}
        >
          {active ? <Bell size={19} /> : <BellOff size={19} />}
        </button>
      </div>
    </article>
  );
}

export function Events() {
  const { data, ui, setUi, commit, openEditor, tour } = useApp();
  const [params] = useSearchParams();
  const { mode } = ui;
  const month = parseDate(ui.month);
  const monthKey = iso(new Date(month.getFullYear(), month.getMonth(), 1)).slice(0, 7);
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  const [reminderEventId, setReminderEventId] = useState<string | null>(null);
  const saveReminder = (eventId: string, reminderDays: ReminderDays) =>
    commit({
      ...data,
      events: data.events.map((event) =>
        event.id === eventId ? { ...event, reminderDays } : event,
      ),
    });
  // A date from another month never filters the newly viewed month.
  const activeDate = filteredDate?.slice(0, 7) === monthKey ? filteredDate : null;
  const evs = enabledEvents(data);
  const unlinkedGifts = data.gifts.filter((gift) => !associationValid(data, gift));
  const reminderEvent = evs.find((event) => event.id === reminderEventId);
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
    if (["planning", "reminders"].includes(params.get("mode") ?? "")) {
      setUi({ mode: "reminders" });
    }
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
  // Old birthday plans stay in the calendar/history but should not require
  // reminders in a future year's planning list.
  const upcomingReminders = evs.filter((event) => event.date >= today());
  const groups = upcomingReminders.reduce<Record<string, typeof evs>>((out, e) => {
    (out[e.date.slice(0, 7)] ??= []).push(e);
    return out;
  }, {});

  return (
    <>
      <header className="page-heading events-page-heading">
        <h1 className="title-xl">{t("Events","События")}</h1>
      </header>
      <div className="events-mode-row">
        <div className="pill-tabs" role="group" aria-label="Events view">
          {(["calendar", "reminders"] as const).map((view) => (
            <button data-ph={`events-tab-${view}`}
              key={view}
              type="button"
              className={`pill-tab ${mode === view ? "is-active" : ""}`}
              aria-pressed={mode === view}
              onClick={() => setUi({ mode: view })}
            >
              {view === "calendar" ? t("Calendar","Календарь") : t("Reminders","Напоминания")}
            </button>
          ))}
        </div>
      </div>

      {mode === "calendar" ? (
        <>
          <div className="calendar-card">
            <div className="calendar-top">
              <button data-ph="calendar-prev-month"
                type="button"
                className="cal-arrow"
                aria-label="Previous month"
                onClick={() => move(-1)}
              >
                <ChevronLeft size={19} />
              </button>
              <strong>{monthName(month)}</strong>
              <button data-ph="calendar-next-month"
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
                  <button data-ph="calendar-day"
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
                <button data-ph="calendar-show-all" type="button" className="calendar-show-all" onClick={() => setFilteredDate(null)}>
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
                    index={monthEvents.indexOf(event)}
                    highlighted={tour?.step === "calendar" && tour.eventId === event.id}
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
      ) : (
        <div className="reminders-page">
          {Object.keys(groups).length ? (
            Object.entries(groups).map(([key, events]) => (
              <section className="month-block reminders-month" key={key}>
                <Section title={monthName(parseDate(key + "-01"))} />
                <div className="reminder-event-list">
                  {events.map((event) => (
                    <ReminderEventRow
                      key={event.id}
                      event={event}
                      index={evs.indexOf(event)}
                      onOpen={() => setReminderEventId(event.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <Empty>Add your first occasion to set a reminder.</Empty>
          )}
        </div>
      )}
      {unlinkedGifts.length > 0 && (
        <section className="section event-repair">
          <Section title="Gifts needing attention" />
          <p className="section-note">Some saved gifts have an unavailable occasion or recipient. You can edit them without losing their details.</p>
          {unlinkedGifts.map((gift) => (
            <button data-ph="repair-gift" type="button" key={gift.id} className="event-repair-item"
              onClick={() => openEditor({type: "gift", id: gift.id})}
              aria-label={`Repair ${gift.name}`}>
              <span>{gift.name}</span><ChevronRight size={17}/>
            </button>
          ))}
        </section>
      )}
      {reminderEvent && (
        <Sheet title="Remind me" onClose={() => setReminderEventId(null)}>
          <p className="reminder-sheet-occasion">
            {reminderEvent.name} · {fmtDate(reminderEvent.date)}
          </p>
          <div className="reminder-sheet-options" role="group" aria-label={`Reminder for ${reminderEvent.name}`}>
            {reminderOptions.map((option) => {
              const chosen = (reminderEvent.reminderDays ?? null) === option.value;
              return (
                <button data-ph={`reminder-option-${option.value ?? "off"}`}
                  type="button"
                  key={option.value ?? "off"}
                  className={`reminder-sheet-option ${chosen ? "is-selected" : ""}`}
                  aria-pressed={chosen}
                  onClick={() => {
                    if (saveReminder(reminderEvent.id, option.value)) {
                      setReminderEventId(null);
                    }
                  }}
                >
                  <span>{option.label}</span>
                  {chosen && <Check size={18} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}
