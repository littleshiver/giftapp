import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UsersRound, Edit3, Plus, Minus, ChevronLeft, ChevronRight, Cake, CalendarDays } from "lucide-react";
import { birthdayMonthDay } from "../domain/birthdays";
import {
  Empty,
  Product,
  Section,
  Title,
  BudgetBar,
  PersonAvatar,
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
import { Button, Sheet } from "../components/Primitives";

import type { Gift } from "../domain/models";

function EventGift({gift, onEdit}: {gift: Gift; onEdit: () => void}) {
  return <Product item={gift} onClick={onEdit} />;
}

export function EventDetail() {
  const { id } = useParams();
  const { data, openEditor, ui, setUi } = useApp();
  const [giftPersonId, setGiftPersonId] = useState<string | null>(null);
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
  const cost = total(gifts);
  const isGroup = event.people.length > 1;
  const isBirthday = event.kind === "birthday" && event.people.length === 1;
  const giftPickerOpen = ui.giftPickerEventId === event.id;
  const activePersonId = giftPersonId || (
    giftPickerOpen && event.people.length === 1 ? event.people[0] : null
  );
  const selectedPerson = data.people.find((person) => person.id === activePersonId);
  const savedIdeas = data.ideas.filter((idea) => idea.personId === activePersonId);
  const closeGiftPicker = () => {
    setGiftPersonId(null);
    setUi({ giftPickerEventId: "" });
  };
  const renderGifts = (items: Gift[]) => (
    <div className="detail-gifts">
      {items.map((gift) => (
        <div key={gift.id}>
          <EventGift gift={gift}
            onEdit={() => openEditor({type: "gift", id: gift.id})}/>
          {!associationValid(data, gift) && (
            <p className="warning">This gift's recipient is not linked to the occasion. Edit the gift to repair.</p>
          )}
        </div>
      ))}
    </div>
  );
  const unassigned = gifts.filter((gift) => !event.people.includes(gift.personId));

  return (
    <div className="event-detail">
      <Title name={event.name} back="/events" />
      <div className="event-summary">
        <div className="event-summary-top">
          <div>
            <p className="event-summary-kicker">{isBirthday ? "Birthday" : "Occasion"}</p>
            <p className="event-summary-date"><CalendarDays size={17} aria-hidden="true" />{fullDate(event.date)}</p>
          </div>
          <Button data-ph="occasion-edit" variant="outline" onClick={() => openEditor({type: "event", id: event.id})}>
            <Edit3 size={16}/> Edit
          </Button>
        </div>
        {!isGroup && event.people.length === 1 && (() => {
          const person = data.people.find((item) => item.id === event.people[0]);
          return (
            <Link data-ph="occasion-person" className="event-person-summary" to={`/people/${event.people[0]}`}>
              <PersonAvatar person={person} className="event-person-avatar" />
              <span className="item-body">
                <strong>{person?.name || "Unknown person"}</strong>
                <small>{isBirthday ? "Birthday person" : "Recipient"}</small>
              </span>
              <ChevronRight size={17} aria-hidden="true"/>
            </Link>
          );
        })()}
        {isGroup && (
          <p className="event-recipient-count"><UsersRound size={16}/> {event.people.length} recipients</p>
        )}
        <div className="event-summary-budget">
          <div>
            <strong>{currency(cost)}</strong>
            <span> of {currency(budget)} planned</span>
          </div>
          <BudgetBar bought={bought(gifts)} committed={cost} budget={budget}/>
          {cost > budget && <p className="warning">{currency(cost - budget)} over budget</p>}
        </div>
      </div>

      {isGroup ? (
        <section className="section event-recipient-groups">
          <Section title="Gifts by person"/>
          {event.people.map((personId) => {
            const person = data.people.find((item) => item.id === personId);
            const items = giftsFor(data, event.id, personId);
            const limit = event.budgets[personId];
            return (
              <div key={personId} className="event-recipient-group">
                <div className="event-recipient-group-top">
                  <Link data-ph="occasion-recipient" className="icontext event-recipient-name" to={`/people/${personId}`}>
                    <PersonAvatar person={person} className="event-person-avatar" />
                    <span className="item-body">
                      <strong>{person?.name || "Unknown person"}</strong>
                      <small>{items.length} {items.length === 1 ? "gift" : "gifts"}</small>
                    </span>
                  </Link>
                  <span className="event-recipient-budget">{limit === undefined ? "Budget not set" : currency(limit) + " budget"}</span>
                </div>
                {items.length ? renderGifts(items) : <p className="event-empty-gifts">No gifts selected yet.</p>}
              </div>
            );
          })}
        </section>
      ) : event.people.length === 1 ? (
        <section className="section event-single-gifts">
          <Section title="Gifts"/>
          {gifts.filter((gift) => gift.personId === event.people[0]).length
            ? renderGifts(gifts.filter((gift) => gift.personId === event.people[0]))
            : <Empty>No gifts selected yet.</Empty>}
        </section>
      ) : (
        <section className="section">
          <Empty>No recipients yet. Add people to start planning gifts.</Empty>
        </section>
      )}

      {unassigned.length > 0 && (
        <section className="section">
          <Section title="Needs attention"/>
          <p className="section-note">These gifts are not assigned to a current recipient. Edit them to repair their links.</p>
          {renderGifts(unassigned)}
        </section>
      )}

      {giftPickerOpen && !selectedPerson && event.people.length > 1 && (
        <Sheet title="Choose recipient" onClose={closeGiftPicker}>
          <div className="gift-recipient-choices">
            {event.people.map((personId) => {
              const person = data.people.find((candidate) => candidate.id === personId);
              if (!person) return null;
              return (
                <button data-ph="gift-picker-recipient" type="button" className="gift-recipient-option" key={person.id}
                  onClick={() => setGiftPersonId(person.id)}>
                  <PersonAvatar person={person} className="event-person-avatar" />
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
                {savedIdeas.map((idea) => (
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
  const person = data.people.find((candidate) => candidate.id === id);
  if (!person) return <Title name="Person not found" back="/people"/>;
  const ideas = data.ideas.filter((idea) => idea.personId === person.id);
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
          <Link data-ph="person-back" className="person-photo-action person-photo-back" to="/people"
            aria-label="Back to People">
            <ChevronLeft size={20} aria-hidden="true"/>
          </Link>
          <button data-ph="person-edit" type="button" className="person-photo-action person-photo-edit"
            aria-label="Edit person" onClick={() => openEditor({type:"person", id:person.id})}>
            <Edit3 size={18} aria-hidden="true"/>
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
      <section className="section person-ideas" aria-labelledby="person-ideas-heading">
        <div className="section-top">
          <h2 id="person-ideas-heading">Gift ideas</h2>
        </div>
        {ideas.length ? (
          <div className="smallcards-grid">
            {ideas.map((idea) => (
              <Product key={idea.id} item={idea}
                onClick={() => openEditor({ type:"idea", id:idea.id })}/>
            ))}
          </div>
        ) : (
          <Empty>No ideas saved for {person.name} yet.</Empty>
        )}
      </section>
    </div>
  );
}
