import {useEffect} from "react";
import {Link,useNavigate,useParams} from "react-router-dom";
import {CalendarDays,Check,ExternalLink,Gift,Lightbulb,Pencil,ShoppingBasket,UserRound} from "lucide-react";
import {useApp,type PreviewContext} from "../state/AppState";
import type {Gift as GiftData,Idea} from "../domain/models";
import {currency,fmtDate,t} from "../utils/format";
import {Photo} from "./UI";
import {EditorSheet} from "./EditorSheet";
import {Sheet} from "./Primitives";

/** A single product-first detail sheet for saved ideas and planned gifts.
 * Source data is never modified just because the sheet opens.
 */
function GiftOverview({id,context,onEdit,onPlan,onDone}:{
  id:string;context:PreviewContext|null;
  onEdit:()=>void;onPlan:()=>void;onDone?:()=>void;
}){
  const {data,commit,tour,updateTour,notify}=useApp();
  const isIdea=id.startsWith("idea:");
  const itemId=isIdea?id.slice(5):id;
  const gift:GiftData|undefined=isIdea?undefined:data.gifts.find(g=>g.id===itemId);
  const idea:Idea|undefined=isIdea?(data.ideas.find(i=>i.id===itemId)||context?.prefill):undefined;
  const item=gift||idea;
  if(!item)return <p className="gift-preview-empty">{t("This gift is no longer available.","Этот подарок больше недоступен.")}</p>;
  const occasion=gift?data.events.find(e=>e.id===gift.eventId):undefined;
  const person=data.people.find(p=>p.id===(context?.personId||item.personId));
  const isTourGift=!!gift&&tour?.step==="gift-status"&&tour.giftId===gift.id;
  const setStatus=(status:GiftData["status"])=>{
    if(!gift||gift.status===status)return;
    if(commit({...data,gifts:data.gifts.map(g=>g.id===gift.id?{...g,status}:g)})){
      notify(status==="bought"?t("Marked as bought ✓","Отметили как купленный ✓"):t("Moved back to To buy","Вернули в список покупок"),"success");
      if(isTourGift&&status==="bought"){updateTour({step:"complete"});onDone?.();}
    }
  };
  const safeLink=(()=>{try{const u=new URL(item.link||"");return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}})();
  const canPlan=!!idea && data.events.length>0 && data.people.length>0;
  return <article className="gift-preview-content gift-product-card">
    <div className="gift-preview-photo gift-product-media">
      {item.image?<Photo src={item.image} name={item.name}/>:isIdea?<Lightbulb size={43} strokeWidth={1.55} aria-hidden="true"/>:<Gift size={43} strokeWidth={1.55} aria-hidden="true"/>}
      {isIdea&&<span className="gift-idea-tag"><Lightbulb size={14} aria-hidden="true"/>{t("Saved idea","Идея")}</span>}
    </div>
    <div className="gift-product-body">
      <header className="gift-preview-heading gift-product-heading">
        <h2>{item.name}</h2>
        <strong className="gift-product-price">{currency(item.price)}</strong>
      </header>
      {gift&&<div className="gift-preview-top-status gift-purchase-toggle" role="group" aria-label={t("Purchase status","Статус покупки")}>
        <button type="button" aria-pressed={gift.status==="to_buy"}
          className={gift.status==="to_buy"?"is-selected":""}
          aria-label={`Mark ${gift.name} as To buy`}
          onClick={()=>setStatus("to_buy")}>
          <ShoppingBasket size={17} strokeWidth={2.3}/>{t("To buy","Купить")}
        </button>
        <button type="button" aria-pressed={gift.status==="bought"}
          className={gift.status==="bought"?"is-selected":""}
          aria-label={`Mark ${gift.name} as Bought`}
          onClick={()=>setStatus("bought")}>
          <Check size={18} strokeWidth={2.5}/>{t("Bought","Куплено")}
        </button>
      </div>}
      {(person||occasion)&&<div className="gift-preview-facts gift-product-facts">
        {person&&<div><UserRound size={16}/><span>{t("For","Для кого")}</span>
          <Link onClick={onDone} to={`/people/${person.id}`}>{person.name}</Link></div>}
        {occasion&&<div><CalendarDays size={16}/><span>{t("Occasion","Событие")}</span>
          <Link onClick={onDone} to={`/events/${occasion.id}`}>{occasion.name} · {fmtDate(occasion.date)}</Link></div>}
      </div>}
      {item.note&&<section className="gift-preview-notes gift-product-notes" aria-label={t("Gift notes","Заметки о подарке")}>
        <p>{item.note}</p>
      </section>}
      {isTourGift&&<p className="gift-preview-tour-message">{t("Mark it Bought after purchasing, or finish with To buy.","Отметьте покупку или пока оставьте в списке.")}</p>}
      <div className="gift-preview-actions gift-product-actions">
        {safeLink&&<a className="gift-preview-product-link gift-product-open-link" href={safeLink} target="_blank" rel="noopener noreferrer">
          {t("Open product","Открыть товар")} <ExternalLink size={16} strokeWidth={2.1}/>
        </a>}
        {canPlan&&<button type="button" className="gift-preview-plan" onClick={onPlan}>
          <Gift size={17}/>{context?.eventId?t("Choose for this occasion","Выбрать для события"):t("Plan this gift","Запланировать подарок")}
        </button>}
        {isTourGift&&gift?.status==="to_buy"&&<button type="button" className="gift-preview-later" onClick={()=>{
          updateTour({step:"complete"});onDone?.();
        }}>{t("I'll buy it later — finish tour","Куплю позже — закончить обучение")}</button>}
        {(gift||data.ideas.some(i=>i.id===itemId))&&<button type="button" className="gift-preview-edit" onClick={onEdit}>
          <Pencil size={16} strokeWidth={2.1}/>{isIdea?t("Edit idea","Редактировать идею"):t("Edit gift","Редактировать подарок")}
        </button>}
      </div>
    </div>
  </article>;
}

export function GiftPreviewSheet(){
  const {giftPreviewId,giftPreviewContext,closeGiftPreview,openEditor,data}=useApp();
  const navigate=useNavigate();
  if(!giftPreviewId)return null;
  const isIdea=giftPreviewId.startsWith("idea:");
  const id=isIdea?giftPreviewId.slice(5):giftPreviewId;
  const idea=isIdea?(data.ideas.find(i=>i.id===id)||giftPreviewContext?.prefill):undefined;
  const close=()=>closeGiftPreview();
  return <Sheet title={isIdea?t("Gift idea","Идея подарка"):t("Gift details","Подарок")} onClose={close}>
    <GiftOverview id={giftPreviewId} context={giftPreviewContext} onDone={close}
      onEdit={()=>{
        close();
        if(isIdea)openEditor({type:"idea",id});
        else navigate(`/gifts/${id}/edit`);
      }}
      onPlan={()=>{
        if(!idea)return;
        const context=giftPreviewContext;
        close();
        openEditor({type:"gift",eventId:context?.eventId,personId:context?.personId||idea.personId,prefill:idea});
      }}/>
  </Sheet>;
}

/** Existing deep links resolve to the same sheet as every gift-card tap. */
export function GiftDetailPage(){
  const {id=""}=useParams();
  const {data}=useApp();
  const navigate=useNavigate();
  const gift=data.gifts.find(g=>g.id===id);
  const eventId=gift?.eventId;
  useEffect(()=>{
    if(!id||!eventId)return;
    navigate(`/events/${eventId}?gift=${encodeURIComponent(id)}`,{replace:true});
  },[id,eventId,navigate]);
  if(!gift)return <p className="gift-preview-empty">{t("Gift not found","Подарок не найден")} <Link to="/events">{t("Back to events","К событиям")}</Link></p>;
  return <div role="status" className="gift-preview-loading">{t("Opening gift…","Открываем подарок…")}</div>;
}

/** The existing editor route remains reachable only through the detail sheet. */
export function GiftEditPage(){
  const {id=""}=useParams();
  const {data}=useApp();
  if(!data.gifts.some(g=>g.id===id))
    return <div className="gift-preview-page"><p className="gift-preview-empty">{t("This gift is unavailable.","Этот подарок недоступен.")}</p><Link to="/events">{t("Back to occasions","К событиям")}</Link></div>;
  return <EditorSheet key={id} standalone editId={id}/>;
}
