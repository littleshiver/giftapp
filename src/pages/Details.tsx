import { Link, useParams } from "react-router-dom";
import { UsersRound, Check, Clock, Edit3, Plus } from "lucide-react";
import {
  AddGift,
  Empty,
  EventRow,
  Product,
  IdeaRow,
  Section,
  Title,
  BudgetBar,
} from "../components/UI";
import { useApp } from "../state/AppState";
import {
  associationValid,
  bought,
  eventBudget,
  giftsFor,
  total,
} from "../domain/selectors";
import { currency, fmtDate, fullDate } from "../utils/format";
import { Button } from "../components/Primitives";
export function EventDetail() {
  const { id } = useParams(),
    { data, openEditor, commit } = useApp(),
    e = data.events.find((e) => e.id === id);
  if (!e)
    return (
      <>
        <Title name="Occasion not found" back="/events" />
        <Empty>This occasion is unavailable.</Empty>
      </>
    );
  const gs = giftsFor(data, e.id),
    budget = eventBudget(e),
    cost = total(gs);
  return (
    <>
      <Title name={e.name} back="/events" />
      <div className="detail-hero">
        <div className="overline">
          {e.kind === "birthday" ? "Birthday" : "Occasion"}
        </div>
        <h2 className="title-lg">{fullDate(e.date)}</h2>
        <div className="detail-mini">
          <UsersRound size={15} />
          {e.people.length} {e.people.length === 1 ? "recipient" : "recipients"}
        </div>
        <div className="hero-actions">
          <span className="hero-budget">
            {currency(cost)}{" "}
            <span style={{ fontWeight: 400 }}>
              of {currency(budget)} selected
            </span>
          </span>
          <Button
            variant="outline"
            onClick={() => openEditor({ type: "event", id: e.id })}
          >
            <Edit3 size={16} />
            Edit
          </Button>
        </div>
        <BudgetBar bought={bought(gs)} committed={cost} budget={budget} />
        {cost > budget && (
          <p className="warning">{currency(cost - budget)} over budget</p>
        )}
      </div>
      <section className="section">
        <Section title="People & budgets" />
        {e.people.length ? (
          e.people.map((pid) => {
            const p = data.people.find((p) => p.id === pid),
              items = giftsFor(data, e.id, pid),
              n = total(items),
              limit = e.budgets[pid];
            return (
              <div className="person-budget-row" key={pid}>
                <div className="toprow">
                  <Link className="icontext" to={`/people/${pid}`}>
                    <span className="avatar-bubble">{p?.name[0] || "?"}</span>
                    <span className="item-body">
                      <strong>{p?.name || "Unknown recipient"}</strong>
                      <small>{items.length} gifts selected</small>
                    </span>
                  </Link>
                  <strong className="text-sm">
                    {limit === undefined ? "Not set" : currency(limit)}
                  </strong>
                </div>
                <BudgetBar
                  bought={bought(items)}
                  committed={n}
                  budget={limit ?? 0}
                />
                <div
                  className={`budget-numbers ${limit !== undefined && n > limit ? "warning" : ""}`}
                >
                  {currency(n)} committed ·{" "}
                  {limit === undefined
                    ? "Budget not set"
                    : n > limit
                      ? `${currency(n - limit)} over budget`
                      : `${currency(limit - n)} available`}
                </div>
              </div>
            );
          })
        ) : (
          <Empty>Add recipients in Edit occasion.</Empty>
        )}
      </section>
      <section className="section">
        <Section title="Gifts">
          <AddGift eventId={e.id} />
        </Section>
        {gs.length ? (
          <div className="detail-gifts">
            {gs.map((g) => (
              <div key={g.id}>
                <Product
                  item={g}
                  person={e.people.length > 1}
                  onClick={() => openEditor({ type: "gift", id: g.id })}
                />
                <div className="gift-actions">
                  <button
                    className={`status-button ${g.status === "bought" ? "is-bought" : ""}`}
                    aria-label={`Mark ${g.name} as ${g.status === "bought" ? "To buy" : "Bought"}`}
                    onClick={() =>
                      commit({
                        ...data,
                        gifts: data.gifts.map((x) =>
                          x.id === g.id
                            ? {
                                ...x,
                                status:
                                  x.status === "bought" ? "to_buy" : "bought",
                              }
                            : x,
                        ),
                      })
                    }
                  >
                    {g.status === "bought" ? (
                      <Check size={13} />
                    ) : (
                      <Clock size={13} />
                    )}{" "}
                    {g.status === "bought" ? "Bought" : "To buy"}
                  </button>
                </div>
                {!associationValid(data, g) && (
                  <p className="warning">
                    Recipient is not assigned to this occasion. Edit the
                    occasion or gift to repair.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty>No gifts selected yet. Add your first gift.</Empty>
        )}
      </section>
    </>
  );
}
export function PersonDetail() {
  const { id } = useParams(),
    { data, openEditor } = useApp(),
    p = data.people.find((p) => p.id === id);
  if (!p) return <Title name="Person not found" back="/people" />;
  const events = data.events.filter((e) => e.people.includes(p.id)),
    gs = giftsFor(data, undefined, p.id),
    ideas = data.ideas.filter((i) => i.personId === p.id);
  return (
    <>
      <Title name={p.name} back="/people" />
      <div className="detail-hero">
        <div className="overline">Your person</div>
        <h2 className="title-lg">{p.name}</h2>
        <p className="detail-mini">
          {p.birthday
            ? "Birthday · " + fullDate(p.birthday)
            : "Birthday not set"}
        </p>
        <div className="hero-actions">
          <span className="text-sm muted">Their little details</span>
          <Button
            variant="outline"
            onClick={() => openEditor({ type: "person", id: p.id })}
          >
            <Edit3 size={15} />
            Edit person
          </Button>
        </div>
      </div>
      <section className="section">
        <Section title="What they like" />
        <div className="data-card" style={{ marginTop: 0 }}>
          <p>{p.likes || "Add interests, wishes and favorite things."}</p>
          {p.note && <p style={{ marginTop: 9 }}>{p.note}</p>}
        </div>
      </section>
      <section className="section">
        <Section title="Their occasions" />
        <div className="info-list">
          {events.length ? (
            events.map((e) => <EventRow event={e} key={e.id} />)
          ) : (
            <Empty>No occasions linked to this person yet.</Empty>
          )}
        </div>
      </section>
      <section className="section">
        <Section title="Their gifts & ideas" />
        {gs.length || ideas.length ? (
          <div className="smallcards-grid">
            {gs.map((g) => (
              <Product
                key={g.id}
                item={g}
                onClick={() => openEditor({ type: "gift", id: g.id })}
              />
            ))}
            {ideas.map((i) => (
              <Product
                key={"idea-" + i.id}
                item={i}
                onClick={() => openEditor({ type: "idea", id: i.id })}
              />
            ))}
          </div>
        ) : (
          <Empty>No gifts or ideas saved yet.</Empty>
        )}
        <Button
          variant="secondary"
          className="button-full"
          style={{ marginTop: 17 }}
          onClick={() => openEditor({ type: "idea", personId: p.id })}
        >
          <Plus size={16} />
          Save a gift idea
        </Button>
      </section>
    </>
  );
}
