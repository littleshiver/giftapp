import { t } from "../utils/format";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Check, ExternalLink, Gift, Heart, Pencil, ShoppingBasket, UserRound } from "lucide-react";
import { useApp } from "../state/AppState";
import { currency, fullDate } from "../utils/format";
import { Photo } from "./UI";
import { Button, Sheet } from "./Primitives";

function GiftOverview({ id, onEdit, onDone }: {
  id: string; onEdit: () => void; onDone?: () => void;
}) {
  const { data, commit, tour, updateTour, notify } = useApp();
  const gift = data.gifts.find(item => item.id === id);
  if (!gift) return <p className="gift-preview-empty">This gift is no longer available.</p>;
  const event = data.events.find(e => e.id === gift.eventId);
  const person = data.people.find(p => p.id === gift.personId);
  const isTourGift = tour?.step === "gift-status" && tour.giftId === gift.id;
  const markBought = () => {
    if (commit({
      ...data,
      gifts: data.gifts.map(g => g.id === gift.id ? { ...g, status: "bought" as const } : g),
    })) {
      notify("Marked as bought ✓", "success");
      if (isTourGift) { updateTour({ step: "complete" }); onDone?.(); }
    }
  };
  const keepToBuy = () => {
    if (isTourGift) updateTour({ step: "complete" });
    onDone?.();
  };
  const safeLink = (() => {
    try {
      const url = new URL(gift.link || "");
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  })();

  return (
    <div className="gift-preview-content">
      <div className="gift-preview-photo">
        {gift.image ? <Photo src={gift.image} name={gift.name}/> : <Gift size={47} strokeWidth={1.4} aria-hidden="true"/>}
      </div>
      <div className="gift-preview-heading">
        <h2>{gift.name}</h2>
        <span className={`gift-preview-status ${gift.status === "bought" ? "bought" : "to-buy"}`}>
          {gift.status === "bought" ? <Check size={15}/> : <ShoppingBasket size={15}/>}
          {gift.status === "bought" ? "Bought" : "To buy"}
        </span>
      </div>
      <div className="gift-preview-facts">
        <div><UserRound size={17}/><span>{t("For","Для кого")}</span>
          {person ? <Link to={`/people/${person.id}`}>{person.name}</Link> : <strong>Recipient not assigned</strong>}
        </div>
        <div><CalendarDays size={17}/><span>{t("Occasion","Событие")}</span>
          {event ? <Link to={`/events/${event.id}`}>{event.name} · {fullDate(event.date)}</Link> : <strong>Occasion missing</strong>}
        </div>
        <div><Heart size={17}/><span>{t("Price","Цена")}</span><strong>{currency(gift.price)}</strong></div>
      </div>
      {gift.note && <section className="gift-preview-notes"><h3>{t("Details","Подробности")}</h3><p>{gift.note}</p></section>}
      {safeLink && <a className="gift-preview-product-link" href={safeLink} target="_blank" rel="noopener noreferrer">
        Product link <ExternalLink size={16}/>
      </a>}
      {isTourGift && (
        <p className="gift-preview-tour-message">This is the actual gift. When you buy it, mark it Bought. Otherwise you can leave it on your list for later.</p>
      )}
      <div className="gift-preview-actions">
        {gift.status !== "bought" && (
          <Button type="button" className="button-full gift-preview-buy" onClick={markBought}>
            <Check size={18}/> Mark as bought
          </Button>
        )}
        {isTourGift && gift.status !== "bought" && (
          <button type="button" className="gift-preview-later" onClick={keepToBuy}>
            I'll buy it later — finish tour
          </button>
        )}
        <button type="button" className="button-secondary button-full gift-preview-edit" onClick={onEdit}>
          <Pencil size={16}/> Edit gift
        </button>
      </div>
    </div>
  );
}

/** Reusable read-only gift view, available without opening the editor. */
export function GiftPreviewSheet() {
  const { giftPreviewId, closeGiftPreview, openEditor } = useApp();
  if (!giftPreviewId) return null;
  return (
    <Sheet title={t("Gift details","Информация о подарке")} onClose={closeGiftPreview}>
      <GiftOverview id={giftPreviewId} onDone={closeGiftPreview} onEdit={() => {
        const id = giftPreviewId;
        closeGiftPreview();
        openEditor({ type: "gift", id });
      }}/>
      <Link className="gift-preview-full-link" to={`/gifts/${giftPreviewId}`} onClick={closeGiftPreview}>
        Open full gift page
      </Link>
    </Sheet>
  );
}

/** Deep-linkable page uses the exact same detail view as the preview sheet. */
export function GiftDetailPage() {
  const { id = "" } = useParams();
  const { data, openEditor } = useApp();
  const navigate = useNavigate();
  const gift = data.gifts.find(g => g.id === id);
  return (
    <div className="gift-preview-page">
      <div className="gift-preview-page-bar">
        <button type="button" onClick={() => navigate(gift ? `/events/${gift.eventId}` : "/events")}>‹ Back to occasion</button>
        <strong>{t("Gift details","Информация о подарке")}</strong>
      </div>
      <GiftOverview id={id} onEdit={() => openEditor({ type: "gift", id })}/>
    </div>
  );
}
