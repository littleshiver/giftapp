import { Link, useParams } from "react-router-dom";
import { UsersRound, Check, Clock, Edit3, Plus, ChevronLeft, Cake } from "lucide-react";
import { birthdayMonthDay } from "../domain/birthdays";
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
        <Section title="Gifts" />
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
        <Button
          variant="secondary"
          className="button-full"
          style={{ marginTop: 16 }}
          onClick={() => openEditor({ type: "gift", eventId: e.id })}
        >
          <Plus size={16} />
          Add gift
        </Button>
      </section>
    </>
  );
}
export function PersonDetail() {
  const { id } = useParams();
  const { data, openEditor } = useApp();
  const person = data.people.find((candidate) => candidate.id === id);
  if (!person) return <Title name="Person not found" back="/people" />;
  const ideas = data.ideas.filter((idea) => idea.personId === person.id);
  const interests = (person.interests || "").split(",").map((item) => item.trim()).filter(Boolean);
  const birthday = birthdayMonthDay(person.birthday);
  const hasPreferences = interests.length || person.likes || person.avoid || person.note;

  return (
    <div className="person-detail">
      <Link className="ghostbutton back-link person-back" to="/people">
        <ChevronLeft size={16} aria-hidden="true"/> People
      </Link>
      <div className="person-profile-hero">
        <span className="person-profile-photo" aria-hidden="true">
          {person.photo ? <img src={person.photo} alt="" /> : person.name[0]?.toUpperCase()}
        </span>
        <div className="person-profile-info">
          <h1 className="title-xl">{person.name}</h1>
          {birthday ? (
            <p className="person-profile-birthday">
              <Cake size={15} aria-hidden="true"/>
              Birthday · {fmtDate(`2000-${birthday}`)}
            </p>
          ) : <p className="person-profile-birthday">Birthday not set</p>}
        </div>
        <Button variant="outline" className="person-edit-button"
          onClick={() => openEditor({ type: "person", id: person.id })}>
          <Edit3 size={16} /> <span>Edit person</span>
        </Button>
      </div>
      <section className="section person-preferences" aria-labelledby="person-about-heading">
        <div className="section-top">
          <h2 id="person-about-heading">About {person.name}</h2>
        </div>
        <div className="person-preferences-card">
          {hasPreferences ? (
            <>
              {interests.length > 0 && (
                <div className="person-preference">
                  <h3>Interests</h3>
                  <div className="person-interest-tags">
                    {interests.map((interest, i) => (
                      <span className="person-interest-tag" key={i}>{interest}</span>
                    ))}
                  </div>
                </div>
              )}
              {person.likes && (
                <div className="person-preference">
                  <h3>Wishes & preferences</h3>
                  <p>{person.likes}</p>
                </div>
              )}
              {person.avoid && (
                <div className="person-preference">
                  <h3>Things to avoid</h3>
                  <p>{person.avoid}</p>
                </div>
              )}
              {person.note && (
                <div className="person-preference">
                  <h3>Notes</h3>
                  <p>{person.note}</p>
                </div>
              )}
            </>
          ) : (
            <p className="person-preferences-empty">What do they love? Add interests, wishes or little things to remember.</p>
          )}
        </div>
      </section>
      <section className="section person-ideas" aria-labelledby="person-ideas-heading">
        <div className="section-top">
          <h2 id="person-ideas-heading">Gift ideas</h2>
          <button className="section-link" type="button"
            onClick={() => openEditor({ type: "idea", personId: person.id })}>
            <Plus size={16} /> Add idea
          </button>
        </div>
        {ideas.length ? (
          <div className="smallcards-grid">
            {ideas.map((idea) => (
              <Product key={idea.id} item={idea}
                onClick={() => openEditor({ type: "idea", id: idea.id })} />
            ))}
          </div>
        ) : (
          <Empty>No ideas saved for {person.name} yet.</Empty>
        )}
        <Button variant="secondary" className="button-full person-add-idea"
          onClick={() => openEditor({ type: "idea", personId: person.id })}>
          <Plus size={16} /> Save a gift idea
        </Button>
      </section>
    </div>
  );
}
