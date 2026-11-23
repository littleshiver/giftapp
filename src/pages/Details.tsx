import { t } from "../utils/format";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Plus, Minus, Cake, Gift as GiftIcon, UsersRound, ChevronDown, AlertCircle } from "lucide-react";
import { birthdayMonthDay, ageFromBirthday } from "../domain/birthdays";
import {
  Empty, Product, Section, Title, PersonAvatar, BackLink, Photo,
} from "../components/UI";
import { useApp } from "../state/AppState";
import {
  associationValid, bought, eventBudget, giftsFor, total,
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
function GiftShelf({
  gifts,data,onView,emptyLabel,
}:{
  gifts:Gift[];data:ReturnType<typeof useApp>["data"];
  onView:(gift:Gift)=>void;emptyLabel?:string;
}){
  const {tour}=useApp();
  if(!gifts.length)return <p className="event-empty-gifts">{emptyLabel??t("No gifts yet","Подарков пока нет")}</p>;
  return <div className="detail-gifts event-gift-shelf" data-scrollable="false" aria-label={t("Gifts","Подарки")}>
    {gifts.map(gift=><div className="event-gift-entry" key={gift.id} data-tour-gift={gift.id===tour?.giftId?"true":undefined}>
      <Product item={gift} onClick={()=>onView(gift)}/>
      {!associationValid(data,gift)&&<p className="warning">{t("Recipient is not linked to this occasion. Open the gift to edit.","Получатель не привязан к событию. Откройте подарок для исправления.")}</p>}
    </div>)}
  </div>;
}
function GiftGroup({
  person,items,limit,data,onView,onChooseIdeas,
}:{
  person:Person|undefined;items:Gift[];limit:number|undefined;
  data:ReturnType<typeof useApp>["data"];
  onView:(gift:Gift)=>void;onChooseIdeas:()=>void;
}){
  const {budgetsEnabled}=useApp();
  const [filter,setFilter]=useState<GiftFilter>("all");
  const [expanded,setExpanded]=useState(true);
  const [showAll,setShowAll]=useState(false);
  const visible=filter==="all"?items:items.filter(g=>g.status===filter);
  const shown=showAll?visible:visible.slice(0,4);
  const planned=total(items),paid=bought(items);
  const over=limit!==undefined && planned>limit;
  const remaining=limit===undefined?null:limit-planned;
  const groupId=`recipient-gifts-${person?.id||"unknown"}`;
  return <section className={`event-person-gifts event-recipient-group ${expanded?"is-expanded":"is-collapsed"}`} aria-label={`Gifts for ${person?.name??"recipient"}`}>
    <div className="recipient-group-top">
      {person?<Link to={`/people/${person.id}`} className="recipient-profile-link" aria-label={`Open ${person.name}'s profile`}>
        <PersonAvatar person={person} className="event-person-avatar"/>
      </Link>:<span className="recipient-profile-link"><PersonAvatar className="event-person-avatar"/></span>}
      <button type="button" className="recipient-accordion-toggle event-person-gifts-identity" aria-expanded={expanded} aria-controls={groupId}
        aria-label={`${expanded?t("Collapse","Свернуть"):t("Expand","Развернуть")} ${person?.name||"recipient"}`}
        onClick={()=>setExpanded(current=>!current)}>
        <span className="recipient-group-name">
          <strong>{person?.name||t("Unknown person","Получатель не найден")}</strong>
          <small>{items.length} {t(items.length===1?"gift":"gifts",items.length===1?"подарок":"подарков")}</small>
        </span>
        <ChevronDown size={21} strokeWidth={2.5} className="recipient-collapse-chevron" aria-hidden="true"/>
      </button>
      <button type="button" className="recipient-quick-add" onClick={onChooseIdeas}
        aria-label={`Choose a gift for ${person?.name||"recipient"}`}>
        <Plus size={18} strokeWidth={2.5} aria-hidden="true"/>
        <span>{t("Add gift","Подарок")}</span>
      </button>
    </div>
    {budgetsEnabled&&<div className={`recipient-budget-summary ${over?"is-over-budget":""}`} aria-label={`Planning summary for ${person?.name||"recipient"}`}>
      <div className="recipient-budget-stats">
        <div><span>{t("Planned","Запланировано")}</span><strong>{currency(planned)}</strong></div>
        <div><span>{t("Bought","Куплено")}</span><strong>{currency(paid)}</strong></div>
        <div><span>{t("Limit","Лимит")}</span><strong>{limit===undefined?t("Not set","Не задан"):currency(limit)}</strong></div>
      </div>
      {limit!==undefined&&<div className="recipient-budget-track" role="progressbar"
        aria-label={`Planned for ${person?.name||"recipient"}`} aria-valuemin={0}
        aria-valuemax={Math.max(limit,1)} aria-valuenow={Math.min(planned,Math.max(limit,1))}>
        <span className="recipient-budget-paid" style={{width:`${Math.min(100,paid/Math.max(planned,limit,1)*100)}%`}}/>
        <span className="recipient-budget-unpaid" style={{width:`${Math.min(100,Math.max(0,planned-paid)/Math.max(planned,limit,1)*100)}%`}}/>
      </div>}
      {remaining!==null&&<p className="recipient-budget-footnote">
        {over?<><AlertCircle size={14}/>{t("Over the limit by","Сверх лимита на")} {currency(-remaining)}</>:
        t(`${currency(remaining)} left to plan`,`Можно запланировать ещё ${currency(remaining)}`)}
      </p>}
    </div>}
    {expanded&&<div className="recipient-group-body" id={groupId}>
      {!items.length?<p className="recipient-gifts-empty">{t("No gifts yet. Add the first idea for this person.","Пока нет подарков. Добавьте первую идею для этого человека.")}</p>:
      <>
        <div className="event-gift-filter" role="group" aria-label={`Filter gifts for ${person?.name||"recipient"}`}>
          {filterOptions.map(option=><button type="button" key={option.value}
            className={`event-gift-filter-tab ${filter===option.value?"is-active":""}`}
            aria-pressed={filter===option.value} onClick={()=>{setFilter(option.value);setShowAll(false);}}>
            {t(option.label,option.value==="all"?"Все":option.value==="to_buy"?"Купить":"Куплено")}
          </button>)}
        </div>
        {visible.length?<GiftShelf gifts={shown} data={data} onView={onView}/>:
          <p className="recipient-gifts-empty">{t("Nothing in this filter","В этом разделе пока пусто")}</p>}
        {visible.length>4&&<button type="button" className="recipient-show-more"
          aria-expanded={showAll} onClick={()=>setShowAll(x=>!x)}>
          {showAll?t("Show fewer","Свернуть список"):t(`Show all ${visible.length} gifts`,`Показать все ${visible.length} подарков`)}
          <ChevronDown size={17} aria-hidden="true"/>
        </button>}
      </>}
    </div>}
  </section>;
}

export function EventDetail() {
  const { id } = useParams();
  const { data, openEditor, openGiftPreview, setUi, budgetsEnabled } = useApp();
  const event = data.events.find(item => item.id === id);
  if (!event) return <><Title name="Occasion not found" back="/events"/><Empty>This occasion is unavailable.</Empty></>;

  const gifts = giftsFor(data, event.id);
  const budget = eventBudget(event);
  const spent = bought(gifts);
  const planned = total(gifts);
  const hasLimits=event.people.some(pid=>Object.hasOwn(event.budgets,pid));
  const allLimitsSet=event.people.length>0&&event.people.every(pid=>Object.hasOwn(event.budgets,pid));
  const limitsCount=event.people.filter(pid=>Object.hasOwn(event.budgets,pid)).length;
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
                <span>{t("Budget overview","Бюджет события")}</span>
              </div>
              <div className="event-budget-breakdown">
                <div><small>{t("Planned","Запланировано")}</small><strong>{currency(planned)}</strong></div>
                <div><small>{t("Bought","Куплено")}</small><strong>{currency(spent)}</strong></div>
                <div><small>{allLimitsSet?t("Total limits","Сумма лимитов"):t("Limits set","Заданы лимиты") + ` (${limitsCount}/${event.people.length})`}</small><strong>{hasLimits?currency(budget):t("Not set","Не задана")}</strong></div>
              </div>
              {allLimitsSet&&<div className="event-budget-track" role="progressbar" aria-label="Budget planned"
                aria-valuemin={0} aria-valuemax={Math.max(budget, 1)}
                aria-valuenow={Math.min(planned,Math.max(budget,1))}>
                <span style={{width:`${budget ? Math.min(100,planned/budget*100) : planned ? 100 : 0}%`}}/>
              </div>}
              {allLimitsSet&&planned > budget && <p className="event-budget-warning">{currency(planned-budget)} {t("planned above total limits","запланировано сверх суммы лимитов")}</p>}
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
          <GiftShelf gifts={unassigned} data={data} onView={gift=>openGiftPreview(gift.id)}/>
        </section>
      )}

    </div>
  );
}

export function PersonDetail() {
  const { id } = useParams();
  const { data, openEditor, openGiftPreview } = useApp();
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
                  onClick={() => openGiftPreview(`idea:${idea.id}`)}/>
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
