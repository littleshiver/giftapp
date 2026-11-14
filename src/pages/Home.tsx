import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Profile, Section } from "../components/UI";
import { useApp } from "../state/AppState";
import {
  bought,
  enabledEvents,
  eventBudget,
  giftsFor,
} from "../domain/selectors";
import { currency, fmtDate, today } from "../utils/format";
export function Home() {
  const { data, openEditor } = useApp(),
    now = today(),
    upcoming = enabledEvents(data)
      .filter((e) => e.date >= now)
      .slice(0, 5),
    next = upcoming[0];
  const monthEvents = enabledEvents(data).filter(
    (e) => e.date.slice(0, 7) === now.slice(0, 7),
  );
  const monthGifts = data.gifts.filter(
    (g) =>
      data.events.find((e) => e.id === g.eventId)?.date.slice(0, 7) ===
      now.slice(0, 7),
  );
  const prepared = monthGifts.filter((g) =>
    ["bought", "given"].includes(g.status),
  ).length;
  return (
    <>
      <div className="top">
        <div>
          <div className="smallcaps">THE LITTLE THINGS MATTER</div>
          <h1 className="hello">
            Hello there <span style={{ fontSize: 26 }}>✳</span>
          </h1>
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Make room for the thoughtful things.
          </p>
        </div>
        <Profile />
      </div>
      <Section title="Coming up">
        <Link className="linkbtn" to="/events">
          View calendar →
        </Link>
      </Section>
      <div className="chipscroll">
        {upcoming.length ? (
          upcoming.map((e, i) => (
            <Link
              className={`datechip ${["pink", "yellow", "violet"][i % 3]}`}
              to={`/events/${e.id}`}
              key={e.id}
            >
              <div className="d">{fmtDate(e.date)}</div>
              <div className="t">{e.name}</div>
              <div className="m">
                {e.people.length} {e.people.length === 1 ? "person" : "people"}{" "}
                · {giftsFor(data, e.id).length} ideas
              </div>
            </Link>
          ))
        ) : (
          <div className="sub">Add your first occasion to get started.</div>
        )}
        <button
          className="datechip new-event"
          onClick={() => openEditor({ type: "event" })}
        >
          ＋<br />
          <span className="m">New event</span>
        </button>
      </div>
      <Section title="Next occasion">
        <Link className="linkbtn" to="/events">
          All events →
        </Link>
      </Section>
      {next ? (
        <div className="card hero">
          <div className="eyebrow">
            ✦ {fmtDate(next.date)} ·{" "}
            {next.kind === "birthday" ? "Birthday" : "Celebration"}
          </div>
          <h2>{next.name}</h2>
          <p>
            {next.people.length}{" "}
            {next.people.length === 1 ? "person is" : "people are"} on your gift
            list. {giftsFor(data, next.id).length} gift ideas saved.
          </p>
          <div className="herofoot">
            <span className="pill">{currency(eventBudget(next))} budget</span>
            <Link className="action" to={`/events/${next.id}`}>
              Open occasion ↗
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="sub">Your next occasion will show up here.</p>
          <button
            className="action"
            onClick={() => openEditor({ type: "event" })}
          >
            Add an occasion
          </button>
        </div>
      )}
      <Section title="This month">
        <span className="smallcaps">
          {new Date().toLocaleDateString("en-US", { month: "long" })}
        </span>
      </Section>
      <div className="split">
        <div className="card stat blue">
          <div className="smallcaps">Planned budget</div>
          <div className="value">
            {currency(monthEvents.reduce((n, e) => n + eventBudget(e), 0))}
          </div>
          <div className="hint">Across {monthEvents.length} occasions</div>
        </div>
        <div className="card stat mint">
          <div className="smallcaps">Already bought</div>
          <div className="value">{currency(bought(monthGifts))}</div>
          <div className="hint">
            {prepared} of {monthGifts.length} gift ideas
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 17 }}>
        <div className="minirow">
          <b>Gift readiness</b>
          <span className="sub">
            {prepared} / {monthGifts.length} ready
          </span>
        </div>
        <div className="bar">
          <div
            className="fill"
            style={{
              width: `${monthGifts.length ? (prepared / monthGifts.length) * 100 : 0}%`,
            }}
          />
        </div>
        <p className="fineprint" style={{ marginBottom: 0 }}>
          Idea prices don't count as committed spending until you mark them
          planned or bought.
        </p>
      </div>
      <Section title="Need inspiration?" />
      <Link className="card idea-banner" to="/ideas">
        <div className="idea-bubble">
          <Sparkles size={30} />
        </div>
        <div>
          <b>Find their kind of magic</b>
          <p>A little yes-or-no gift explorer, just for fun.</p>
        </div>
        <ArrowUpRight className="arrow" />
      </Link>
    </>
  );
}
