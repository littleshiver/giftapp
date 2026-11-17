import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UsersRound, Edit3, Plus, ChevronLeft, ChevronRight, Cake, CalendarDays } from "lucide-react";
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
  const { data, openEditor } = useApp();
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
  const selectedPerson = data.people.find((person) => person.id === giftPersonId);
  const savedIdeas = data.ideas.filter((idea) => idea.personId === giftPersonId);
  const openGift = (personId: string) => setGiftPersonId(personId);
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
          <Button variant="outline" onClick={() => openEditor({type: "event", id: event.id})}>
            <Edit3 size={16}/> Edit
          </Button>
        </div>
        {!isGroup && event.people.length === 1 && (() => {
          const person = data.people.find((item) => item.id === event.people[0]);
          return (
            <Link className="event-person-summary" to={`/people/${event.people[0]}`}>
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
                  <Link className="icontext event-recipient-name" to={`/people/${personId}`}>
                    <PersonAvatar person={person} className="event-person-avatar" />
                    <span className="item-body">
                      <strong>{person?.name || "Unknown person"}</strong>
                      <small>{items.length} {items.length === 1 ? "gift" : "gifts"}</small>
                    </span>
                  </Link>
                  <span className="event-recipient-budget">{limit === undefined ? "Budget not set" : currency(limit) + " budget"}</span>
                </div>
                {items.length ? renderGifts(items) : <p className="event-empty-gifts">No gifts selected yet.</p>}
                {person && (
                  <Button variant="secondary" className="button-full event-add-gift"
                    onClick={() => openGift(personId)}>
                    <Plus size={16}/> Add gift for {person.name}
                  </Button>
                )}
              </div>
            );
          })}
          <Button variant="outline" className="button-full event-add-recipient"
            onClick={() => openEditor({type: "event", id: event.id})}>
            <Plus size={16}/> Add recipient
          </Button>
        </section>
      ) : event.people.length === 1 ? (
        <section className="section event-single-gifts">
          <Section title="Gifts"/>
          {gifts.filter((gift) => gift.personId === event.people[0]).length
            ? renderGifts(gifts.filter((gift) => gift.personId === event.people[0]))
            : <Empty>No gifts selected yet.</Empty>}
          <Button variant="secondary" className="button-full event-add-gift"
            onClick={() => openGift(event.people[0])}>
            <Plus size={16}/> Add gift
          </Button>
        </section>
      ) : (
        <section className="section">
          <Empty>No recipients yet. Add people to start planning gifts.</Empty>
          <Button variant="secondary" className="button-full event-add-recipient"
            onClick={() => openEditor({type: "event", id: event.id})}>
            <Plus size={16}/> Add recipient
          </Button>
        </section>
      )}

      {unassigned.length > 0 && (
        <section className="section">
          <Section title="Needs attention"/>
          <p className="section-note">These gifts are not assigned to a current recipient. Edit them to repair their links.</p>
          {renderGifts(unassigned)}
        </section>
      )}

      {selectedPerson && (
        <Sheet title={`Gift for ${selectedPerson.name}`} onClose={() => setGiftPersonId(null)}>
          {savedIdeas.length ? (
            <>
              <p className="gift-picker-intro">Choose from saved ideas or add something new.</p>
              <div className="gift-picker-ideas">
                {savedIdeas.map((idea) => (
                  <Product key={idea.id} item={idea} showEdit={false}
                    actionLabel={`Use idea ${idea.name}`}
                    onClick={() => {
                      setGiftPersonId(null);
                      openEditor({type: "gift", eventId: event.id, personId: selectedPerson.id, prefill: idea});
                    }}/>
                ))}
              </div>
            </>
          ) : <p className="gift-picker-intro">No ideas saved for {selectedPerson.name} yet. You can add a new gift.</p>}
          <Button className="button-full gift-picker-new" onClick={() => {
            setGiftPersonId(null);
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
        <PersonAvatar person={person} className="person-profile-photo" />
        <div className="person-profile-info">
          <h1 className="title-xl">{person.name}</h1>
          {birthday ? (
            <p className="person-profile-birthday">
              <Cake size={15} aria-hidden="true"/>
              Birthday · {fmtDate(`2000-${birthday}`)}
            </p>
          ) : <p className="person-profile-birthday">Birthday not set</p>}
        </div>
        <Button variant="outline" className="person-edit-button" aria-label="Edit person"
          onClick={() => openEditor({ type: "person", id: person.id })}>
          <Edit3 size={16} /> <span>Edit person</span>
        </Button>
      </div>
      <section className="section person-preferences" aria-labelledby="person-about-heading">
        <div className="section-top">
          <h2 id="person-about-heading">About</h2>
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

      </section>
    </div>
  );
}
