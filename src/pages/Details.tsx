import { t } from "../utils/format";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Minus, Cake, Gift as GiftIcon, UsersRound } from "lucide-react";
import { birthdayMonthDay, ageFromBirthday } from "../domain/birthdays";
import {
  Empty, Product, Section, Title, PersonAvatar, BackLink, Photo,
} from "../components/UI";
import { useApp } from "../state/AppState";
import {
  associationValid, bought, eventBudget, giftsFor,
} from "../domain/selectors";
import { currency, fmtDate, today } from "../utils/format";
import { EmptyState } from "../components/EmptyState";
import { EventCover } from "../components/EventCover";
import type { Gift, Person } from "../domain/models";

type GiftFilter = "all" | "to_buy" | "bought";
const filterOptions: {value: GiftFilter; label: string}[] = [
  {value:"all", label:"All"},
  {value:"to_buy", label:"To buy"},
  {value:"bought", label:"Bought"},
];
function EventGift({gift, onEdit, onView}: {gift: Gift; onEdit: () => void; onView: () => void}) {
  return <Product item={gift} onClick={onView} onEdit={onEdit}/>;
}
function GiftShelf({
  gifts, data, onEdit, onView, emptyLabel,
}: {
  gifts: Gift[];
  data: ReturnType<typeof useApp>["data"];
  onEdit: (gift: Gift) => void;
  onView: (gift: Gift) => void;
  emptyLabel?: string;
}) {
  const { tour } = useApp();
  const scrollable = gifts.length >= 3;
  if (!gifts.length) return <p className="event-empty-gifts">{emptyLabel ?? "No gifts here yet."}</p>;
  return (
    <div className={`detail-gifts event-gift-shelf ${scrollable ? "is-scrollable" : "is-static"}`}
      data-scrollable={scrollable} aria-label="Gifts">
      {gifts.map(gift => (
        <div className="event-gift-entry" key={gift.id} data-tour-gift={gift.id === tour?.giftId ? "true" : undefined}>
          <EventGift gift={gift} onEdit={() => onEdit(gift)} onView={() => onView(gift)}/>
          {!associationValid(data, gift) &&
            <p className="warning">This gift's recipient is not linked to the occasion. Edit the gift to repair.</p>}
        </div>
      ))}
    </div>
  );
}
function GiftGroup({
  person, items, limit, data, onEdit, onView, onChooseIdeas,
}: {
  person: Person | undefined;
  items: Gift[];
  limit: number | undefined;
  data: ReturnType<typeof useApp>["data"];
  onEdit: (gift: Gift) => void;
  onView: (gift: Gift) => void;
  onChooseIdeas: () => void;
}) {
  const {budgetsEnabled}=useApp();
  const [filter,setFilter]=useState<GiftFilter>("all");
  const visible=filter==="all"?items:items.filter(g=>g.status===filter);
  const recipientIdentity=<><PersonAvatar person={person} className="event-person-avatar"/><strong>{person?.name||"Unknown person"}</strong></>;
  return <section className="event-person-gifts event-recipient-group" aria-label={`Gifts for ${person?.name??"recipient"}`}>
    <div className="event-person-gifts-heading">
      {person?<Link to={`/people/${person.id}`} className="event-person-gifts-identity" aria-label={`Open ${person.name}'s profile`}>{recipientIdentity}</Link>
        :<span className="event-person-gifts-identity">{recipientIdentity}</span>}
      {budgetsEnabled&&<span className="event-person-amount"><span>{t("Budget","Бюджет")}</span>
        <span>{limit===undefined?t("Not set","Не задан"):currency(limit)}</span></span>}
    </div>
    {!items.length?
      <EmptyState compact className="event-gift-empty" Icon={GiftIcon}
        title={t("No gifts planned yet","Пока нет подарков")}
        description={t("Choose from your saved ideas or Givvy suggestions.","Выберите из своих идей или предложений Givvy.")}
        action={{label:t("Choose a gift","Выбрать подарок"),onClick:onChooseIdeas}}
        />:
      <>
        <div className="event-gift-filter" role="group" aria-label={`Filter gifts for ${person?.name||"recipient"}`}>
          {filterOptions.map(option=><button type="button" key={option.value}
            className={`event-gift-filter-tab ${filter===option.value?"is-active":""}`}
            aria-pressed={filter===option.value} onClick={()=>setFilter(option.value)}>{option.label}</button>)}
        </div>
        {visible.length?<GiftShelf gifts={visible} data={data} onEdit={onEdit} onView={onView}/>:
          <EmptyState compact Icon={GiftIcon} title={t("Nothing in this filter","В этом фильтре пусто")}
            description={t("Your other gifts are still here.","Остальные подарки никуда не исчезли.")}
            action={{label:t("Show all gifts","Показать все"),onClick:()=>setFilter("all")}}/>}
        <button type="button" data-ph="event-add-another-gift" className="event-add-another-gift" onClick={onChooseIdeas}>
          <Plus size={18}/>{t("Choose another gift","Выбрать ещё подарок")}
        </button>
      </>}
  </section>;
}

export function EventDetail() {
  const { id } = useParams();
  const { data, openEditor, openGiftPreview, setUi, budgetsEnabled, tour } = useApp();
  const navigate=useNavigate();
  const event = data.events.find(item => item.id === id);
  if (!event) return <><Title name="Occasion not found" back="/events"/><Empty>This occasion is unavailable.</Empty></>;

  const gifts = giftsFor(data, event.id);
  const budget = eventBudget(event);
  const spent = bought(gifts);
  const isGroup = event.people.length > 1;
  const unassigned = gifts.filter(gift => !event.people.includes(gift.personId));
  return (
    <div className="event-detail event-detail-v2">
      <section className="event-overview" aria-label="Occasion overview">
        <div className="event-hero" aria-label={`Cover for ${event.name}`}>
          {event.image ? <Photo src={event.image} name={event.name}/> : <EventCover event={event}/>}
          <div className="event-hero-shade" aria-hidden="true"/>
          <BackLink to="/events" className="event-hero-action event-hero-back"/>
          <button data-ph="occasion-edit" type="button" className="event-hero-action event-hero-edit"
            aria-label="Edit" onClick={() => openEditor({type:"event",id:event.id})}>
            <Pencil size={17} aria-hidden="true"/>
          </button>
          <span className="event-hero-date">{fmtDate(event.date)}</span>
        </div>

        <div className="event-overview-panel">
          <header className="event-identity">
            <h1>{event.name}</h1>
          </header>
          {(budgetsEnabled || isGroup || event.people.length === 0) && <div className="event-summary" aria-label="Occasion summary">
            {isGroup && (
              <div className="event-summary-recipients">
                <div className="event-recipient-summary" aria-label={`${event.people.length} recipients`}>
                  <div className="event-recipient-copy">
                    <strong>{event.people.length} recipients</strong>
                    <small>{event.people.map(pid => data.people.find(p=>p.id===pid)?.name||"Unknown").join(", ")}</small>
                  </div>
                  <div className="event-avatar-stack">
                    {event.people.slice(0, 5).map(personId => {
                      const person = data.people.find(p => p.id === personId);
                      return person ? (
                        <Link key={personId} to={`/people/${personId}`}
                          className="event-stack-link" aria-label={`Open ${person.name}'s profile`}
                          title={person.name}>
                          <PersonAvatar person={person} className="event-stack-avatar"/>
                        </Link>
                      ) : <PersonAvatar key={personId} className="event-stack-avatar"/>;
                    })}
                    {event.people.length > 5 && <span className="event-stack-more">+{event.people.length - 5}</span>}
                  </div>
                </div>
              </div>
            )}

            {budgetsEnabled && <div className="event-summary-budget" role="group" aria-label="Occasion budget">
              <div className="event-budget-head">
                <span>{t("Budget","Бюджет")}</span>
                <span><strong>{currency(spent)}</strong> <small>of {currency(budget)} spent</small></span>
              </div>
              <div className="event-budget-track" role="progressbar" aria-label="Budget spent"
                aria-valuemin={0} aria-valuemax={Math.max(budget, 1)}
                aria-valuenow={Math.min(spent,Math.max(budget,1))}>
                <span style={{width:`${budget ? Math.min(100,spent/budget*100) : spent ? 100 : 0}%`}}/>
              </div>
              {spent > budget && <p className="event-budget-warning">{currency(spent-budget)} over budget</p>}
            </div>}
          </div>}
        </div>
      </section>

      {event.people.length ? (
        <div className={isGroup ? "event-gift-groups is-group event-recipient-groups" : "event-gift-groups is-single event-single-gifts"}>
          {isGroup && <h2 className="event-gifts-title">Gifts by person</h2>}
          {event.people.map(personId => (
            <GiftGroup key={personId} person={data.people.find(p => p.id===personId)}
              items={giftsFor(data,event.id,personId)} limit={event.budgets[personId]} data={data}
              onEdit={gift=>openGiftPreview(gift.id)}
              onView={gift=>openGiftPreview(gift.id)}
              onChooseIdeas={()=>setUi({giftPickerEventId:event.id,giftPickerPersonId:personId})}
/>
          ))}
        </div>
      ) : <EmptyState className="event-recipient-prompt" Icon={UsersRound}
        title={t("No recipients yet","Пока нет получателей")}
        description={t("Choose someone to plan gifts for this occasion.","Выберите, кому хотите подготовить подарки к событию.")}
        action={{label:t("Choose recipients","Выбрать получателей"),onClick:()=>setUi({recipientPickerEventId:event.id})}}/>}

      {unassigned.length>0 && (
        <section className="event-needs-attention">
          <h2>Needs attention</h2>
          <p>These gifts are not assigned to a current recipient. Edit them to repair their links.</p>
          <GiftShelf gifts={unassigned} data={data} onEdit={gift=>openGiftPreview(gift.id)} onView={gift=>openGiftPreview(gift.id)}/>
        </section>
      )}

    </div>
  );
}

export function PersonDetail() {
  const { id } = useParams();
  const { data, openEditor, openGiftPreview } = useApp();
  const navigate=useNavigate();
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
  const age=ageFromBirthday(person.birthday);
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
            aria-label={t("Edit person","Редактировать профиль")} onClick={() => openEditor({type:"person", id:person.id})}>
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
            {age!==null&&<span className="person-profile-age">{t(`${age} years old`,`${age} ${age%10===1&&age%100!==11?"год":age%10>=2&&age%10<=4&&!(age%100>=12&&age%100<=14)?"года":"лет"}`)}</span>}
          </div>
          {(positive || negative) ? (
            <div className="person-gift-guidance">
              {positive && (
                <div className="person-guidance person-guidance-positive">
                  <div className="person-guidance-heading">
                    <Plus size={16} aria-hidden="true"/>
                    <strong>{t("Good gifts","Что подарить")}</strong>
                  </div>
                  <p>{positive}</p>
                </div>
              )}
              {negative && (
                <div className="person-guidance person-guidance-negative">
                  <div className="person-guidance-heading">
                    <Minus size={16} aria-hidden="true"/>
                    <strong>{t("Avoid gifting","Что не дарить")}</strong>
                  </div>
                  <p>{negative}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState compact className="person-preferences-prompt" Icon={GiftIcon}
              title={t("What would they love?","Что им понравится?")}
              description={t("Add their interests and things to avoid.","Добавьте предпочтения и то, что лучше не дарить.")}
              action={{label:t("Add preferences","Заполнить предпочтения"),onClick:()=>openEditor({type:"person",id:person.id})}}/>
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
          ) : <EmptyState compact Icon={GiftIcon} title={t("No gift ideas yet","Пока нет идей подарков")}
            description={t("Save something you would love to give them.","Сохраните идею, которую хочется им подарить.")}
            action={{label:t("Add a gift idea","Добавить идею"),onClick:()=>openEditor({type:"idea",personId:person.id})}}/>
        ) : (
          gifted.length ? (
            <div className="smallcards-grid person-gift-collection">
              {gifted.map((gift) => {
                const occasion = eventById.get(gift.eventId)!;
                return (
                  <Product key={gift.id} item={gift}
                    captionText={`${occasion.name} · ${fmtDate(occasion.date)}, ${occasion.date.slice(0, 4)}`}
                    onClick={() => openGiftPreview(gift.id)}/>
                );
              })}
            </div>
          ) : <EmptyState compact Icon={GiftIcon} title={t("No gifted history yet","Пока нет подаренных подарков")}
            description={t("When gifts are bought for past occasions, they will appear here.","Купленные подарки к прошедшим событиям появятся здесь.")}
            action={{label:t("Add a gift idea","Добавить идею"),onClick:()=>openEditor({type:"idea",personId:person.id})}}/>
        )}
      </section>
    </div>
  );
}
