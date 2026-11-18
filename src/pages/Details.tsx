import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Plus, Minus, ChevronRight, Cake } from "lucide-react";
import { birthdayMonthDay } from "../domain/birthdays";
import {
  Empty, Product, Section, Title, PersonAvatar, BackLink, Photo,
} from "../components/UI";
import { useApp } from "../state/AppState";
import {
  associationValid, bought, eventBudget, giftsFor,
} from "../domain/selectors";
import { currency, fmtDate, fullDate, today } from "../utils/format";
import { Button, Sheet } from "../components/Primitives";
import { EventCover } from "../components/EventCover";
import type { Gift, Person } from "../domain/models";

type GiftFilter = "all" | "to_buy" | "bought";
const filterOptions: {value: GiftFilter; label: string}[] = [
  {value:"all", label:"All"},
  {value:"to_buy", label:"To buy"},
  {value:"bought", label:"Bought"},
];
function EventGift({gift, onEdit}: {gift: Gift; onEdit: () => void}) {
  return <Product item={gift} onClick={onEdit}/>;
}
function GiftShelf({
  gifts, data, onEdit, emptyLabel,
}: {
  gifts: Gift[];
  data: ReturnType<typeof useApp>["data"];
  onEdit: (gift: Gift) => void;
  emptyLabel?: string;
}) {
  const scrollable = gifts.length >= 3;
  if (!gifts.length) return <p className="event-empty-gifts">{emptyLabel ?? "No gifts here yet."}</p>;
  return (
    <div className={`detail-gifts event-gift-shelf ${scrollable ? "is-scrollable" : "is-static"}`}
      data-scrollable={scrollable} aria-label="Gifts">
      {gifts.map(gift => (
        <div className="event-gift-entry" key={gift.id}>
          <EventGift gift={gift} onEdit={() => onEdit(gift)}/>
          {!associationValid(data, gift) &&
            <p className="warning">This gift's recipient is not linked to the occasion. Edit the gift to repair.</p>}
        </div>
      ))}
    </div>
  );
}
function GiftGroup({
  person, items, limit, data, onEdit,
}: {
  person: Person | undefined;
  items: Gift[];
  limit: number | undefined;
  data: ReturnType<typeof useApp>["data"];
  onEdit: (gift: Gift) => void;
}) {
  const [filter, setFilter] = useState<GiftFilter>("all");
  const visible = filter === "all" ? items : items.filter(g => g.status === filter);
  const spent = bought(items);
  return (
    <section className="event-person-gifts" aria-label={`Gifts for ${person?.name ?? "recipient"}`}>
      <div className="event-person-gifts-heading">
        <span className="event-person-gifts-identity">
          <PersonAvatar person={person} className="event-person-avatar"/>
          <strong>{person?.name || "Unknown person"}</strong>
        </span>
        <span className="event-person-amount">
          <strong>{currency(spent)}</strong>
          {limit !== undefined && <span> / {currency(limit)}</span>}
        </span>
      </div>
      <div className="event-gift-filter" role="group" aria-label={`Filter gifts for ${person?.name || "recipient"}`}>
        {filterOptions.map(option => (
          <button type="button" key={option.value}
            className={`event-gift-filter-tab ${filter===option.value?"is-active":""}`}
            aria-pressed={filter===option.value}
            onClick={() => setFilter(option.value)}>{option.label}</button>
        ))}
      </div>
      <GiftShelf gifts={visible} data={data} onEdit={onEdit}
        emptyLabel={filter==="all" ? "Add gifts using the + button below." : `No ${filter === "bought" ? "bought" : "to-buy"} gifts yet.`}/>
    </section>
  );
}

export function EventDetail() {
  const { id } = useParams();
  const { data, openEditor, ui, setUi } = useApp();
  const [giftPersonId, setGiftPersonId] = useState<string | null>(null);
  const event = data.events.find(item => item.id === id);
  if (!event) return <><Title name="Occasion not found" back="/events"/><Empty>This occasion is unavailable.</Empty></>;

  const gifts = giftsFor(data, event.id);
  const budget = eventBudget(event);
  const spent = bought(gifts);
  const isGroup = event.people.length > 1;
  const isBirthday = event.kind === "birthday" && event.people.length === 1;
  const giftPickerOpen = ui.giftPickerEventId === event.id;
  const activePersonId = giftPersonId || (
    giftPickerOpen && event.people.length === 1 ? event.people[0] : null
  );
  const selectedPerson = data.people.find(person => person.id === activePersonId);
  const savedIdeas = data.ideas.filter(idea => idea.personId === activePersonId);
  const closeGiftPicker = () => {
    setGiftPersonId(null);
    setUi({giftPickerEventId:""});
  };
  const unassigned = gifts.filter(gift => !event.people.includes(gift.personId));
  return (
    <div className="event-detail event-detail-v2">
      <section className="event-hero" aria-label={`Cover for ${event.name}`}>
        {event.image ? <Photo src={event.image} name={event.name}/> : <EventCover event={event}/>}
        <div className="event-hero-shade" aria-hidden="true"/>
        <BackLink to="/events" className="event-hero-action event-hero-back"/>
        <button data-ph="occasion-edit" type="button" className="event-hero-action event-hero-edit"
          aria-label="Edit occasion" onClick={() => openEditor({type:"event",id:event.id})}>
          <Pencil size={17} aria-hidden="true"/>
        </button>
        <span className="event-hero-date">{fullDate(event.date)}</span>
      </section>
      <section className="event-identity">
        <p className="event-identity-type">{isBirthday ? "Birthday" : "Occasion"}</p>
        <h1>{event.name}</h1>
      </section>
      <section className="event-summary" aria-label="Occasion summary">
        <div className="event-summary-recipients">
          {event.people.length === 1 ? (() => {
            const person = data.people.find(p => p.id === event.people[0]);
            return (
              <Link className="event-person-summary" data-ph="occasion-person"
                to={`/people/${event.people[0]}`}>
                <PersonAvatar person={person} className="event-person-avatar"/>
                <span className="item-body"><strong>{person?.name || "Unknown person"}</strong>
                  <small>{isBirthday ? "Birthday person" : "Recipient"}</small></span>
                <ChevronRight size={17} aria-hidden="true"/>
              </Link>
            );
          })() : event.people.length > 1 ? (
            <div className="event-recipient-summary" aria-label={`${event.people.length} recipients`}>
              <div className="event-avatar-stack">
                {event.people.slice(0, 5).map(personId => (
                  <PersonAvatar key={personId} person={data.people.find(p => p.id === personId)}
                    className="event-stack-avatar"/>
                ))}
                {event.people.length > 5 && <span className="event-stack-more">+{event.people.length - 5}</span>}
              </div>
              <div><strong>Recipients</strong><small>{event.people.map(pid => data.people.find(p=>p.id===pid)?.name||"Unknown").join(", ")}</small></div>
            </div>
          ) : <p className="event-recipient-empty">Add recipients to this occasion to start planning gifts.</p>}
        </div>
        <div className="event-summary-budget" role="group" aria-label="Occasion budget">
          <div className="event-budget-head">
            <span>Budget</span>
            <span><strong>{currency(spent)}</strong> <small>of {currency(budget)} spent</small></span>
          </div>
          <div className="event-budget-track" role="progressbar" aria-label="Budget spent"
            aria-valuemin={0} aria-valuemax={Math.max(budget, 1)} aria-valuenow={Math.min(spent,Math.max(budget,1))}>
            <span style={{width:`${budget ? Math.min(100,spent/budget*100) : spent ? 100 : 0}%`}}/>
          </div>
          {spent > budget && <p className="event-budget-warning">{currency(spent-budget)} over budget</p>}
        </div>
      </section>

      {event.people.length ? (
        <div className={`event-gift-groups ${isGroup ? "is-group" : "is-single"}`}>
          {isGroup && <h2 className="event-gifts-title">Gifts by person</h2>}
          {event.people.map(personId => (
            <GiftGroup key={personId} person={data.people.find(p => p.id===personId)}
              items={giftsFor(data,event.id,personId)} limit={event.budgets[personId]} data={data}
              onEdit={gift => openEditor({type:"gift",id:gift.id})}/>
          ))}
        </div>
      ) : <div className="event-recipient-empty">No recipients yet. Add people to start planning gifts.</div>}

      {unassigned.length>0 && (
        <section className="event-needs-attention">
          <h2>Needs attention</h2>
          <p>These gifts are not assigned to a current recipient. Edit them to repair their links.</p>
          <GiftShelf gifts={unassigned} data={data} onEdit={gift=>openEditor({type:"gift",id:gift.id})}/>
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
                      openEditor({type:"gift",eventId:event.id,personId:selectedPerson.id,prefill:idea});
                    }}/>
                ))}
              </div>
            </>
          ) : <p className="gift-picker-intro">No ideas saved for {selectedPerson.name} yet. You can add a new gift.</p>}
          <Button data-ph="gift-picker-new" className="button-full gift-picker-new" onClick={() => {
            closeGiftPicker();
            openEditor({type:"gift",eventId:event.id,personId:selectedPerson.id});
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
