import { Link, useParams } from "react-router-dom";
import { AddGift, Empty, EventRow, GiftList, Section } from "../components/UI";
import { useApp } from "../state/AppState";
import { bought, eventBudget, giftsFor, total } from "../domain/selectors";
import { currency, fmtDate } from "../utils/format";
export function EventDetail() {
  const { id } = useParams(),
    { data, openEditor } = useApp(),
    e = data.events.find((e) => e.id === id);
  if (!e)
    return (
      <>
        <Link to="/events">All events</Link>
        <Empty>Occasion not found.</Empty>
      </>
    );
  const gs = giftsFor(data, e.id);
  return (
    <>
      <Link className="back" to="/events">
        ‹ All events
      </Link>
      <div className="detailtop">
        <div className="smallcaps">
          {e.kind === "birthday" ? "BIRTHDAY" : "OCCASION"} · {fmtDate(e.date)}
        </div>
        <h2>{e.name}</h2>
        <p>
          {e.people.length} recipients · {currency(eventBudget(e))} total budget
        </p>
        <button
          className="action ghost"
          onClick={() => openEditor({ type: "event", id: e.id })}
        >
          Edit occasion
        </button>
      </div>
      <Section title="People & budgets" />
      <div className="card">
        {e.people.length ? (
          e.people.map((pid) => {
            const p = data.people.find((p) => p.id === pid);
            return (
              <Link className="friend" key={pid} to={`/people/${pid}`}>
                <div className="face">{p?.name[0] || "?"}</div>
                <div className="fbody">
                  <b>{p?.name || "Unknown"}</b>
                  <p>
                    {giftsFor(data, e.id, pid).length} ideas ·{" "}
                    {currency(total(giftsFor(data, e.id, pid)))} planned
                  </p>
                </div>
                <span className="tag">{currency(e.budgets[pid])}</span>
              </Link>
            );
          })
        ) : (
          <Empty>Add recipients in Edit occasion.</Empty>
        )}
      </div>
      <Section title="Gift plan">
        <AddGift eventId={e.id} />
      </Section>
      <GiftList gifts={gs} />
      <div className="card">
        {[
          ["Planned gifts", total(gs)],
          ["Already bought", bought(gs)],
          ["Budget", eventBudget(e)],
        ].map(([label, value]) => (
          <div className="minirow summary-row" key={label}>
            <span className="sub">{label}</span>
            <b>{currency(Number(value))}</b>
          </div>
        ))}
      </div>
    </>
  );
}
export function PersonDetail() {
  const { id } = useParams(),
    { data, openEditor } = useApp(),
    p = data.people.find((p) => p.id === id);
  if (!p)
    return (
      <>
        <Link to="/people">All people</Link>
        <Empty>Person not found.</Empty>
      </>
    );
  const es = data.events.filter((e) => e.people.includes(p.id));
  return (
    <>
      <Link className="back" to="/people">
        ‹ All people
      </Link>
      <div className="detailtop">
        <div className="smallcaps">GIFT RECIPIENT</div>
        <h2>{p.name}</h2>
        <p>
          {p.birthday
            ? "Birthday · " + fmtDate(p.birthday)
            : "Birthday not set"}
        </p>
        <button
          className="action ghost"
          onClick={() => openEditor({ type: "person", id: p.id })}
        >
          Edit person
        </button>
      </div>
      <Section title="Their occasions" />
      <div className="card">
        {es.length ? (
          es.map((e) => <EventRow event={e} key={e.id} />)
        ) : (
          <Empty>No occasions yet.</Empty>
        )}
      </div>
      <Section title="Gift ideas">
        <AddGift personId={p.id} />
      </Section>
      <GiftList gifts={giftsFor(data, undefined, p.id)} />
    </>
  );
}
