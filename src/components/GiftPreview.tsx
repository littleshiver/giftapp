import {useEffect} from "react";
import {Link,useNavigate,useParams} from "react-router-dom";
import {CalendarDays,Check,ExternalLink,Gift,Pencil,UserRound} from "lucide-react";
import {useApp} from "../state/AppState";
import {currency,fmtDate,t} from "../utils/format";
import {Photo,GiftStatus} from "./UI";
import {EditorSheet} from "./EditorSheet";
import {Sheet} from "./Primitives";

/** Product-first gift sheet. Purchase state is editable here, not by accidental
 * taps on the miniature cards underneath.
 */
function GiftOverview({id,onEdit,onDone}:{
  id:string;onEdit:()=>void;onDone?:()=>void;
}) {
  const {data,commit,tour,updateTour,notify}=useApp();
  const gift=data.gifts.find(item=>item.id===id);
  if(!gift)return <p className="gift-preview-empty">{t("This gift is no longer available.","Этот подарок больше недоступен.")}</p>;
  const occasion=data.events.find(e=>e.id===gift.eventId);
  const person=data.people.find(p=>p.id===gift.personId);
  const isTourGift=tour?.step==="gift-status"&&tour.giftId===gift.id;
  const toggleBought=()=>{
    if(commit({...data,gifts:data.gifts.map(g=>g.id===gift.id
      ? {...g,status:g.status==="bought"?"to_buy" as const:"bought" as const}:g)})){
      notify(gift.status==="bought"?t("Moved back to To buy","Вернули в список покупок"):t("Marked as bought ✓","Отметили как купленный ✓"),"success");
      if(isTourGift&&gift.status!=="bought"){updateTour({step:"complete"});onDone?.();}
    }
  };
  const keepToBuy=()=>{if(isTourGift)updateTour({step:"complete"});onDone?.();};
  const safeLink=(()=>{
    try{const url=new URL(gift.link||"");return ["https:","http:"].includes(url.protocol)?url.href:"";}
    catch{return "";}
  })();
  return <article className="gift-preview-content gift-product-card">
    <div className="gift-preview-photo gift-product-media">
      {gift.image?<Photo src={gift.image} name={gift.name}/>:<Gift size={46} strokeWidth={1.5} aria-hidden="true"/>}
      <div className="gift-preview-top-status">
        <GiftStatus status={gift.status} name={gift.name} onToggle={toggleBought}/>
        <span>{gift.status==="bought"?t("Bought","Куплено"):t("To buy","Купить")}</span>
      </div>
    </div>
    <div className="gift-product-body">
      <header className="gift-preview-heading gift-product-heading">
        <h2>{gift.name}</h2>
        <strong className="gift-product-price">{currency(gift.price)}</strong>
      </header>
      {(person||occasion)&&<div className="gift-preview-facts gift-product-facts">
        {person&&<div><UserRound size={16}/><span>{t("For","Для кого")}</span><Link onClick={onDone} to={`/people/${person.id}`}>{person.name}</Link></div>}
        {occasion&&<div><CalendarDays size={16}/><span>{t("Occasion","Событие")}</span><Link onClick={onDone} to={`/events/${occasion.id}`}>{occasion.name} · {fmtDate(occasion.date)}</Link></div>}
      </div>}
      {gift.note&&<section className="gift-preview-notes gift-product-notes" aria-label={t("Gift notes","Заметки о подарке")}>
        <p>{gift.note}</p>
      </section>}
      {isTourGift&&<p className="gift-preview-tour-message">{t("Mark it Bought after purchasing, or finish with To buy.","Отметьте «Куплено» после покупки или пока оставьте в списке.")}</p>}
      <div className="gift-preview-actions gift-product-actions">
        {safeLink&&<a className="gift-preview-product-link gift-product-open-link" href={safeLink} target="_blank" rel="noopener noreferrer">
          {t("Open product","Открыть товар")} <ExternalLink size={16} strokeWidth={2.1}/>
        </a>}
        {isTourGift&&gift.status!=="bought"&&<button type="button" className="gift-preview-buy" onClick={toggleBought}>
          <Check size={18}/>{t("Mark as bought","Отметить купленным")}
        </button>}
        {isTourGift&&gift.status!=="bought"&&<button type="button" className="gift-preview-later" onClick={keepToBuy}>
          {t("I'll buy it later — finish tour","Куплю позже — закончить обучение")}
        </button>}
        <button type="button" className="gift-preview-edit" onClick={onEdit}>
          <Pencil size={16} strokeWidth={2.1}/>{t("Edit gift","Редактировать подарок")}
        </button>
      </div>
    </div>
  </article>;
}

export function GiftPreviewSheet() {
  const {giftPreviewId,closeGiftPreview}=useApp();
  const navigate=useNavigate();
  if(!giftPreviewId)return null;
  return <Sheet title={t("Gift details","Подарок")} onClose={closeGiftPreview}>
    <GiftOverview id={giftPreviewId} onDone={closeGiftPreview} onEdit={()=>{
      const id=giftPreviewId;
      closeGiftPreview();
      navigate(`/gifts/${id}/edit`);
    }}/>
  </Sheet>;
}

/** Existing deep links resolve to the same sheet as every gift-card tap. */
export function GiftDetailPage() {
  const {id=""}=useParams();
  const {data,openGiftPreview}=useApp();
  const navigate=useNavigate();
  const gift=data.gifts.find(g=>g.id===id);
  const eventId=gift?.eventId;
  useEffect(()=>{
    if(!id||!eventId)return;
    navigate(`/events/${eventId}`,{replace:true});
    openGiftPreview(id);
  },[id,eventId]);
  if(!gift)return <p className="gift-preview-empty">{t("Gift not found","Подарок не найден")} <Link to="/events">{t("Back to events","К событиям")}</Link></p>;
  return <div role="status" className="gift-preview-loading">{t("Opening gift…","Открываем подарок…")}</div>;
}

/** Editing remains a real page, but is reached via the product sheet. */
export function GiftEditPage() {
  const {id=""}=useParams();
  const {data}=useApp();
  if(!data.gifts.some(g=>g.id===id))
    return <div className="gift-preview-page"><p className="gift-preview-empty">{t("This gift is unavailable.","Этот подарок недоступен.")}</p><Link to="/events">{t("Back to occasions","К событиям")}</Link></div>;
  return <EditorSheet key={id} standalone editId={id}/>;
}
