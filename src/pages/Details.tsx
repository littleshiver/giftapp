import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Plus, Minus, ChevronRight, Cake } from "lucide-react";
import { birthdayMonthDay } from "../domain/birthdays";
import { Empty, Product, Section, Title, PersonAvatar, BackLink } from "../components/UI";
import { EventCoverArt } from "../components/EventCoverArt";
import { useApp } from "../state/AppState";
import { associationValid, bought, eventBudget, giftsFor } from "../domain/selectors";
import { currency, fmtDate, fullDate, today } from "../utils/format";
import { Button, Sheet } from "../components/Primitives";
import type { Gift } from "../domain/models";

type GiftFilter = "all" | "to_buy" | "bought";
const giftFilterOptions: {id: GiftFilter; label: string}[] = [
  {id: "all", label: "All"},
  {id: "to_buy", label: "To buy"},
  {id: "bought", label: "Bought"},
];

export function EventDetail() {
  const { id } = useParams();
  const { data, openEditor, ui, setUi } = useApp();
  const [giftPersonId, setGiftPersonId] = useState<string | null>(null);
  const [giftFilters, setGiftFilters] = useState<Record<string, GiftFilter>>({});
  const event = data.events.find((item) => item.id === id);
  if (!event) {
    return (
      <>
        <Title name="Occasion not found" back="/events"/>
        <Empty>This occasion is unavailable.</Empty>
      </>
    );
  }

  const gifts = giftsFor(data, event.id);
  const budget = eventBudget(event);
  const spent = bought(gifts);
  const isGroup = event.people.length > 1;
  const isBirthday = event.kind === "birthday" && event.people.length === 1;
  const giftPickerOpen = ui.giftPickerEventId === event.id;
  const activePersonId = giftPersonId ||
    (giftPickerOpen && event.people.length === 1 ? event.people[0] : null);
  const selectedPerson = data.people.find((person) => person.id === activePersonId);
  const savedIdeas = data.ideas.filter((idea) => idea.personId === activePersonId);
  const closeGiftPicker = () => {
    setGiftPersonId(null);
    setUi({ giftPickerEventId: "" });
  };

  const filterBar = (recipientId: string) => {
    const chosen = giftFilters[recipientId] ?? "all";
    return (
      <div className="event-gift-filters" role="group"
        aria-label={`Gift status for ${data.people.find(p => p.id === recipientId)?.name || "recipient"}`}>
        {giftFilterOptions.map(({id: status, label}) => (
          <button key={status} type="button" className={`event-gift-filter ${chosen === status ? "is-active" : ""}`}
            data-ph={`event-filter-${status}`}
            aria-pressed={chosen === status}
            onClick={() => setGiftFilters(previous => ({...previous, [recipientId]: status}))}>
            {label}
          </button>
        ))}
      </div>
    );
  };

  const renderGifts = (items: Gift[], recipientId: string, filter = true) => {
    const chosen = filter ? giftFilters[recipientId] ?? "all" : "all";
    const visible = chosen === "all" ? items : items.filter(gift => gift.status === chosen);
    if (!visible.length) return (
      <p className="event-empty-gifts">
        {chosen === "bought" ? "No bought gifts yet." :
          chosen === "to_buy" ? "Nothing left to buy." :
          "No gifts yet. Add one with the + button."}
      </p>
    );
    return (
      <div className={`detail-gifts ${visible.length > 2 ? "is-rail" : "is-grid"}`}
        data-layout={visible.length > 2 ? "scroll" : "grid"}
        aria-label="Gifts" tabIndex={visible.length > 2 ? 0 : undefined}>
        {visible.map(gift => (
          <div key={gift.id} className="event-gift">
            <Product item={gift} onClick={() => openEditor({type: "gift", id: gift.id})}/>
            {!associationValid(data, gift) && (
              <p className="warning">This gift's recipient is not linked to the occasion. Edit to repair.</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const unassigned = gifts.filter(gift => !event.people.includes(gift.personId));
  return (
    <div className="event-detail event-detail-v2">
      <div className="event-summary">
        <section className="event-hero" aria-label="Occasion cover">
          <div className="event-cover">
            <EventCoverArt event={event}/>
            <BackLink to="/events" className="event-cover-control event-cover-back"/>
            <button data-ph="occasion-edit" type="button" className="event-cover-control event-cover-edit"
              aria-label="Edit occasion" onClick={() => openEditor({type: "event", id: event.id})}>
              <Pencil size={18} strokeWidth={2} aria-hidden="true"/>
            </button>
            <span className="event-summary-date">{fullDate(event.date)}</span>
          </div>
          <div className="event-identity-card">
            <span className="event-summary-kicker">{isBirthday ? "Birthday" : "Occasion"}</span>
            <h1 className="title-xl">{event.name}</h1>
          </div>
        </section>

        {event.people.length === 1 ? (() => {
          const person = data.people.find(item => item.id === event.people[0]);
          return (
            <Link data-ph="occasion-person" className="event-person-summary event-people-card"
              to={`/people/${event.people[0]}`}>
              <PersonAvatar person={person} className="event-person-avatar"/>
              <span className="item-body">
                <strong>{person?.name || "Unknown person"}</strong>
                <small>{isBirthday ? "Birthday person" : "Recipient"}</small>
              </span>
              <ChevronRight size={17} aria-hidden="true"/>
            </Link>
          );
        })() : event.people.length > 1 ? (
          <div className="event-people-card event-group-people" aria-label="Event recipients">
            <div className="event-people-stack" aria-hidden="true">
              {event.people.slice(0, 5).map(personId => (
                <PersonAvatar key={personId} person={data.people.find(p => p.id === personId)}
                  className="event-stack-avatar"/>
              ))}
              {event.people.length > 5 && <span className="event-stack-overflow">+{event.people.length - 5}</span>}
            </div>
            <div className="event-people-card-label">
              <strong>{event.people.length} recipients</strong>
              <span>{event.people.slice(0, 3).map(personId =>
                data.people.find(p => p.id === personId)?.name || "Unknown"
              ).join(", ")}{event.people.length > 3 ? " and others" : ""}</span>
            </div>
          </div>
        ) : null}

        <div className="event-summary-budget" aria-label="Occasion budget">
          <div className="event-budget-head">
            <div><span>Spent</span><strong>{currency(spent)}</strong></div>
            <div><span>Budget</span><strong>{currency(budget)}</strong></div>
          </div>
          <div className="event-budget-progress" role="progressbar" aria-label="Occasion budget spent"
            aria-valuemin={0} aria-valuemax={Math.max(budget, spent, 1)} aria-valuenow={spent}>
            <span style={{width: `${budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0}%`}}/>
          </div>
          {spent > budget && <p className="warning">{currency(spent - budget)} spent over budget</p>}
        </div>
      </div>

      {isGroup ? (
        <section className="section event-recipient-groups" aria-label="Gifts by person">
          <Section title="Gifts by person"/>
          {event.people.map(personId => {
            const person = data.people.find(item => item.id === personId);
            const items = giftsFor(data, event.id, personId);
            const limit = event.budgets[personId];
            return (
              <section key={personId} className="event-recipient-group" aria-label={`Gifts for ${person?.name || "recipient"}`}>
                <div className="event-recipient-group-top">
                  <Link data-ph="occasion-recipient" className="icontext event-recipient-name" to={`/people/${personId}`}>
                    <PersonAvatar person={person} className="event-person-avatar"/>
                    <span className="item-body"><strong>{person?.name || "Unknown person"}</strong></span>
                  </Link>
                  <div className="event-recipient-budget">
                    <strong>{currency(bought(items))} spent</strong>
                    <span>{limit === undefined ? "Budget not set" : `of ${currency(limit)}`}</span>
                  </div>
                </div>
                {filterBar(personId)}
                {renderGifts(items, personId)}
              </section>
            );
          })}
        </section>
      ) : event.people.length === 1 ? (
        <section className="section event-single-gifts" aria-label="Gifts">
          <Section title="Gifts"/>
          {filterBar(event.people[0])}
          {renderGifts(gifts.filter(gift => gift.personId === event.people[0]), event.people[0])}
        </section>
      ) : (
        <section className="section"><Empty>No recipients yet. Add people to start planning gifts.</Empty></section>
      )}

      {unassigned.length > 0 && (
        <section className="section" aria-label="Gifts needing attention">
          <Section title="Needs attention"/>
          <p className="section-note">These gifts are not assigned to a current recipient. Edit to repair their links.</p>
          {renderGifts(unassigned, "__unassigned", false)}
        </section>
      )}

      {giftPickerOpen && !selectedPerson && event.people.length > 1 && (
        <Sheet title="Choose recipient" onClose={closeGiftPicker}>
          <div className="gift-recipient-choices">
            {event.people.map(personId => {
              const person = data.people.find(candidate => candidate.id === personId);
              if (!person) return null;
              return (
                <button data-ph="gift-picker-recipient" type="button" className="gift-recipient-option" key={person.id}
                  onClick={() => setGiftPersonId(person.id)}>
                  <PersonAvatar person={person} className="event-person-avatar"/>
                  <span className="item-body"><strong>{person.name}</strong></span>
                  <ChevronRight size={18} aria-hidden="true"/>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
      {giftPickerOpen && selectedPerson && (
        <Sheet title={`Gift for ${selectedPerson.name}`} onClose={closeGiftPicker}>
          {savedIdeas.length ? (
            <>
              <p className="gift-picker-intro">Choose from saved ideas or add something new.</p>
              <div className="gift-picker-ideas">
                {savedIdeas.map(idea => (
                  <Product key={idea.id} item={idea} showEdit={false}
                    actionLabel={`Use idea ${idea.name}`}
                    onClick={() => {
                      closeGiftPicker();
                      openEditor({type: "gift", eventId: event.id, personId: selectedPerson.id, prefill: idea});
                    }}/>
                ))}
              </div>
            </>
          ) : <p className="gift-picker-intro">No ideas saved for {selectedPerson.name} yet. You can add a new gift.</p>}
          <Button data-ph="gift-picker-new" className="button-full gift-picker-new" onClick={() => {
            closeGiftPicker();
            openEditor({type: "gift", eventId: event.id, personId: selectedPerson.id});
          }}>
            <Plus size={16}/> Add a new gift
          </Button>
        </Sheet>
      )}
    </div>
  );
}

export function PersonDetail() {
  const { id } = useParams();
  const { data, openEditor } = useApp();
  const [collection, setCollection] = useState<"ideas" | "gifted">("ideas");
  const person = data.people.find((candidate) => candidate.id === id);
  if (!person) return <Title name="Person not found" back="/people"/>;
  const ideas = data.ideas.filter((idea) => idea.personId === person.id);
  const eventById = new Map(data.events.map((event) => [event.id, event]));
  const gifted = data.gifts
    .filter((gift) => gift.personId === person.id && gift.status === "bought" &&
      (eventById.get(gift.eventId)?.date || "9999-12-31") < today())
    .sort((a, b) => (eventById.get(b.eventId)?.date || "").localeCompare(eventById.get(a.eventId)?.date || ""));
  const birthday = birthdayMonthDay(person.birthday);
  // Existing separate interest tags and free-form wishes both describe
  // what is good to gift; show them together without erasing legacy data.
  const positive = [person.interests?.trim(), person.likes?.trim()].filter(Boolean).join(" · ");
  const negative = person.avoid?.trim() || "";

  return (
    <div className="person-detail">
      <section className="person-profile-hero" aria-label={`Profile of ${person.name}`}>
        <div className="person-profile-cover">
          <PersonAvatar person={person} className="person-profile-photo" />
          <BackLink to="/people" className="person-photo-action person-photo-back" />
          <button data-ph="person-edit" type="button" className="person-photo-action person-photo-edit"
            aria-label="Edit person" onClick={() => openEditor({type:"person", id:person.id})}>
            <Pencil size={16} strokeWidth={2} aria-hidden="true"/>
          </button>
          <p className="person-profile-birthday">
            <Cake size={16} aria-hidden="true"/>
            <span>{birthday ? fmtDate(`2000-${birthday}`) : "Birthday not set"}</span>
          </p>
        </div>
        <div className="person-profile-panel">
          <div className="person-profile-identity">
            <h1 className="title-xl">{person.name}</h1>
          </div>
          {(positive || negative) ? (
            <div className="person-gift-guidance">
              {positive && (
                <div className="person-guidance person-guidance-positive">
                  <div className="person-guidance-heading">
                    <Plus size={16} aria-hidden="true"/>
                    <strong>Good gifts</strong>
                  </div>
                  <p>{positive}</p>
                </div>
              )}
              {negative && (
                <div className="person-guidance person-guidance-negative">
                  <div className="person-guidance-heading">
                    <Minus size={16} aria-hidden="true"/>
                    <strong>Avoid gifting</strong>
                  </div>
                  <p>{negative}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="person-guidance-empty">Add what they love and what to avoid.</p>
          )}
        </div>
      </section>
      {person.note && (
        <p className="person-profile-note">{person.note}</p>
      )}
      <section className="section person-ideas" aria-label="Gift collections">
        <div className="pill-tabs person-collection-tabs" role="group" aria-label="Gift collections">
          <button data-ph="person-tab-ideas" type="button" className={`pill-tab ${collection === "ideas" ? "is-active" : ""}`}
            aria-pressed={collection === "ideas"} onClick={() => setCollection("ideas")}>
            Gift ideas
          </button>
          <button data-ph="person-tab-gifted" type="button" className={`pill-tab ${collection === "gifted" ? "is-active" : ""}`}
            aria-pressed={collection === "gifted"} onClick={() => setCollection("gifted")}>
            Gifted
          </button>
        </div>
        {collection === "ideas" ? (
          ideas.length ? (
            <div className="smallcards-grid person-gift-collection">
              {ideas.map((idea) => (
                <Product key={idea.id} item={idea}
                  onClick={() => openEditor({ type:"idea", id:idea.id })}/>
              ))}
            </div>
          ) : <Empty>No ideas saved for {person.name} yet.</Empty>
        ) : (
          gifted.length ? (
            <div className="smallcards-grid person-gift-collection">
              {gifted.map((gift) => {
                const occasion = eventById.get(gift.eventId)!;
                return (
                  <Product key={gift.id} item={gift} statusReadOnly
                    captionText={`${occasion.name} · ${fmtDate(occasion.date)}, ${occasion.date.slice(0, 4)}`}
                    onClick={() => openEditor({type:"gift", id:gift.id})}/>
                );
              })}
            </div>
          ) : <Empty>No bought gifts from past occasions yet.</Empty>
        )}
      </section>
    </div>
  );
}
