import { Link, NavLink, useLocation } from "react-router-dom";
import {
  House,
  CalendarDays,
  UsersRound,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Gift as GiftIcon,
  Cake,
  Check,
  ShoppingBasket,
  Pencil,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Event, Gift, Idea, Person } from "../domain/models";
import { useApp } from "../state/AppState";
import demoPhotoSheet from "../assets/demo/catalog-hifi.avif";

/** A single 5x2 sprite of the ten user-supplied gift photos.
 * Loaded only in the design fixture; personal photos use original image data.
 */

import { currency, fmtDate } from "../utils/format";
import { eventBudget } from "../domain/selectors";
import { birthdayMonthDay, nextBirthdayDate } from "../domain/birthdays";
import { today, parseDate } from "../utils/format";
import demoPersonSheet from "../assets/demo/people-portraits.webp";
export { Empty } from "./Primitives";
export function Navigation() {
  return (
    <div className="nav-wrap">
      <nav className="bottom-nav" aria-label="Primary">
        {[
          { to: "/ideas", name: "Ideas", Icon: Lightbulb },
          { to: "/people", name: "People", Icon: UsersRound },
          { to: "/", name: "Home", Icon: House },
          { to: "/events", name: "Events", Icon: CalendarDays },
          { to: "/settings", name: "Settings", Icon: Settings },
        ].map(({ to, name, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `nav-item ${isActive ? "is-active" : ""}`
            }
          >
            <Icon size={20} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function CreateMenu() {
  const { openEditor, ui, setUi, data, notify } = useApp(),
    [open, setOpen] = useState(false),
    location = useLocation(),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  return (
    <div
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          root.current?.querySelector<HTMLButtonElement>(".fab")?.focus();
        }
      }}
    >
      {open && (
        <div className="fab-menu" id="create-menu" aria-label="Create options">
          {[
            { type: "idea", label: "Add gift idea", Icon: Lightbulb },
            { type: "gift", label: "Add gift to occasion", Icon: GiftIcon },
            { type: "event", label: "Add occasion", Icon: CalendarDays },
            { type: "person", label: "Add person", Icon: UsersRound },
          ].map(({ type, label, Icon }) => (
            <button
              key={type}
              onClick={() => {
                setOpen(false);
                const onEventDetail = location.pathname.startsWith("/events/");
                const eventId = onEventDetail
                  ? location.pathname.split("/")[2]
                  : location.pathname === "/"
                    ? ui.selectedEvent
                    : undefined;
                const personId = location.pathname.startsWith("/people/")
                  ? location.pathname.split("/")[2]
                  : undefined;
                // For an existing occasion, FAB Add gift opens the same
                // per-recipient saved-idea picker previously shown by inline
                // Add gift buttons. Other routes still use the global editor.
                if (type === "gift" && onEventDetail && eventId) {
                  const event = data.events.find((value) => value.id === eventId);
                  if (event && !event.people.length) {
                    notify("Add a recipient to this occasion first.");
                    openEditor({ type: "event", id: eventId });
                  } else if (event) {
                    setUi({ giftPickerEventId: eventId });
                  }
                  return;
                }
                openEditor({
                  type: type as "idea" | "gift" | "event" | "person",
                  eventId,
                  personId: type === "idea" ? personId : undefined,
                });
              }}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        className="fab"
        aria-expanded={open}
        aria-controls="create-menu"
        aria-label={open ? "Close create menu" : "Create"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={26} /> : <Plus size={26} />}
      </button>
    </div>
  );
}
/** Single back-navigation component for all routed detail pages. */
export function BackLink({
  to,
  className = "",
  label,
}: {
  to: string;
  className?: string;
  label?: string;
}) {
  const destination = to === "/people" ? "People" : to === "/events" ? "Events" : "previous page";
  return (
    <Link to={to} className={`back-link back-navigation ${className}`}
      aria-label={label || `Back to ${destination}`}>
      <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}

export function Title({
  name,
  subtitle,
  back,
}: {
  name: string;
  subtitle?: string;
  back?: string;
}) {
  return (
    <header className={`page-heading ${back ? "detail-page-heading" : "root-page-heading"}`}>
      {back && <BackLink to={back} />}
      <h1 className="title-xl">{name}</h1>
      {subtitle && <p className="subheading">{subtitle}</p>}
    </header>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-top">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
const gradients = [
  "linear-gradient(130deg,#e2eff7,#f4e9ef)",
  "linear-gradient(145deg,#e8eedf,#f9edd8)",
  "linear-gradient(135deg,#f7e5ea,#ebe4f5)",
  "linear-gradient(140deg,#eee5f5,#dfeaf7)",
  "linear-gradient(120deg,#ffefd7,#f4e8e9)",
];
export const gradientFor = (name: string) =>
  gradients[name.length % gradients.length];
export function Photo({
  src,
  name = "",
  birthday = false,
}: {
  src?: string;
  name?: string;
  birthday?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (src?.startsWith("demo-person:")) {
    const index = Number(src.slice("demo-person:".length));
    if (Number.isInteger(index) && index >= 0 && index < 4) {
      return (
        <span role="img" aria-label={name || "Person portrait"} className="demo-person-sprite"
          style={{
            backgroundImage: `url("${demoPersonSheet}")`,
            backgroundSize: "200% 200%",
            backgroundPosition: `${index % 2 ? 100 : 0}% ${index >= 2 ? 100 : 0}%`,
          }}
        />
      );
    }
  }
  const demoIndex = src?.startsWith("demo-photo:")
    ? Number(src.slice("demo-photo:".length))
    : -1;
  if (Number.isInteger(demoIndex) && demoIndex >= 0 && demoIndex < 10) {
    return (
      <span
        role="img"
        aria-label={name || "Gift photo"}
        className="demo-product-sprite"
        style={{
          backgroundImage: `url("${demoPhotoSheet}")`,
          backgroundSize: "500% 200%",
          backgroundPosition: `${(demoIndex % 5) * 25}% ${demoIndex >= 5 ? 100 : 0}%`,
        }}
      />
    );
  }
  return src && !failed ? (
    <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
  ) : birthday ? (
    <Cake size={27} />
  ) : (
    <GiftIcon size={29} className="ph-icon" />
  );
}
/**
 * Givvy's single gift-card design. Gift ideas share its photography and
 * typography but never display a purchase status. Overlay actions are sibling
 * buttons, never nested inside the main edit/open control.
 */
export function GiftStatus({
  status,
  name,
  onToggle,
}: {
  status: Gift["status"];
  name: string;
  onToggle?: () => void;
}) {
  const purchased = status === "bought";
  const Icon = purchased ? Check : ShoppingBasket;
  const description = purchased ? "Bought" : "To buy";
  const className = `gift-status-icon ${purchased ? "is-bought" : "is-to-buy"}`;
  const content = <Icon size={18} strokeWidth={2.5} aria-hidden="true" />;
  return onToggle ? (
    <button type="button" className={className}
      aria-label={`Mark ${name} as ${purchased ? "To buy" : "Bought"}`}
      aria-pressed={purchased}
      title={`${description} · tap to change`}
      onClick={onToggle}>
      {content}
    </button>
  ) : (
    <span className={className} role="img" aria-label={`${name}: ${description}`} title={description}>
      {content}
    </span>
  );
}
/** Static shorthand for component previews; live gift cards use GiftStatus. */
export function StatusTag({ status }: { status: Gift["status"] }) {
  return <GiftStatus status={status} name="Gift" />;
}

export function Product({
  item,
  person = false,
  home = false,
  onClick,
  onToggle,
  showEdit = true,
  actionLabel,
  captionText,
  statusReadOnly = false,
}: {
  item: Gift | Idea;
  person?: boolean;
  home?: boolean;
  onClick?: () => void;
  onToggle?: () => void;
  showEdit?: boolean;
  actionLabel?: string;
  captionText?: string;
  statusReadOnly?: boolean;
}) {
  const { data, commit } = useApp();
  const gift = "status" in item ? item as Gift : null;
  const defaultToggle = () => {
    if (!gift) return;
    commit({
      ...data,
      gifts: data.gifts.map((value) => value.id === gift.id
        ? { ...value, status: value.status === "bought" ? "to_buy" as const : "bought" as const }
        : value),
    });
  };
  const caption = captionText ?? (person
    ? `For ${data.people.find((p) => p.id === item.personId)?.name || "Someone"}`
    : currency(item.price));
  return (
    <article className={`product-card gift-card ${home ? "home-product" : ""} ${gift ? "is-gift" : "is-idea"}`}>
      {onClick ? (
        <button
          type="button"
          className="product-open"
          aria-label={actionLabel || `${home ? "View gift" : "Edit"} ${item.name}`}
          onClick={onClick}
        >
          <span className="product-visual" style={{ background: gradientFor(item.name) }}>
            <Photo src={item.image} name={item.name} />
            {home && <span className="home-gift-placeholder-name" aria-hidden="true">{item.name}</span>}
          </span>
          {!home && <span className="gift-card-copy">
            <strong className="product-title">{item.name}</strong>
            <span className="product-caption">{caption}</span>
          </span>}
        </button>
      ) : (
        <div className="product-open">
          <span className="product-visual" style={{ background: gradientFor(item.name) }}>
            <Photo src={item.image} name={item.name} />
            {home && <span className="home-gift-placeholder-name" aria-hidden="true">{item.name}</span>}
          </span>
          {!home && <span className="gift-card-copy">
            <strong className="product-title">{item.name}</strong>
            <span className="product-caption">{caption}</span>
          </span>}
        </div>
      )}
      {gift && <GiftStatus status={gift.status} name={gift.name}
        onToggle={statusReadOnly ? undefined : (onToggle || defaultToggle)} />}
      {onClick && showEdit && !home && (
        <button type="button" className="gift-card-edit"
          aria-label={`Edit ${gift ? "gift" : "idea"} ${item.name}`}
          title="Edit"
          onClick={onClick}>
          <Pencil size={16} aria-hidden="true"/>
        </button>
      )}
    </article>
  );
}

export function BudgetBar({
  bought,
  committed,
  budget,
}: {
  bought: number;
  committed: number;
  budget: number;
}) {
  const scale = Math.max(budget, committed, 1);
  return (
    <div
      className="progress"
      role="img"
      aria-label={`${currency(bought)} bought, ${currency(Math.max(0, committed - bought))} to buy, ${currency(Math.max(0, budget - committed))} available`}
    >
      <span className="spent" style={{ width: `${(bought / scale) * 100}%` }} />
      <span
        className={committed > budget ? "reserved over" : "reserved"}
        style={{ width: `${(Math.max(0, committed - bought) / scale) * 100}%` }}
      />
    </div>
  );
}
export function EventRow({ event: e }: { event: Event }) {
  return (
    <Link className="event-list-item" to={`/events/${e.id}`}>
      <span className="item-photo">
        <Photo src={e.image} birthday={e.kind === "birthday"} />
      </span>
      <span className="item-body">
        <strong>{e.name}</strong>
        <small>
          {fmtDate(e.date)} · {e.people.length}{" "}
          {e.people.length === 1 ? "person" : "people"} ·{" "}
          {currency(eventBudget(e))}
        </small>
      </span>
      <ChevronRight size={19} className="item-arrow" />
    </Link>
  );
}
/** One person portrait/fallback across directory, profile and events. */
export function PersonAvatar({
  person,
  className = "",
}: {
  person?: Person;
  className?: string;
}) {
  const palette = ["var(--blue)", "var(--mint)", "var(--rose)", "var(--butter)"];
  const key = person?.id || person?.name || "";
  const tone = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return (
    <span className={`person-avatar ${className}`} style={{ background: palette[tone] }} aria-hidden="true">
      {person?.photo?.startsWith("demo-person:") ? (
        <span className="demo-person-sprite"
          style={{
            backgroundImage: `url("${demoPersonSheet}")`,
            backgroundSize: "200% 200%",
            backgroundPosition: `${Number(person.photo.slice(12)) % 2 ? 100 : 0}% ${Number(person.photo.slice(12)) >= 2 ? 100 : 0}%`,
          }}
        />
      ) : person?.photo ? (
        <img src={person.photo} alt="" loading="lazy"/>
      ) : (
        <span>{person?.name?.[0]?.toUpperCase() || "?"}</span>
      )}
    </span>
  );
}

/**
 * Compact, birthday-first portrait tile for a small circle of people.
 * An approaching birthday is the only supplementary signal; occasion and
 * shopping data belongs to Events, not the People gallery.
 */
export function PersonRow({person: p}: {person: Person}) {
  const monthDay = birthdayMonthDay(p.birthday);
  const birthday = monthDay ? fmtDate(`2000-${monthDay}`) : "";
  const from = today();
  const nextBirthday = monthDay ? nextBirthdayDate(p.birthday, from) : "";
  const days = nextBirthday
    ? Math.round((parseDate(nextBirthday).getTime() - parseDate(from).getTime()) / 86400000)
    : null;
  const comingSoon = days !== null && days >= 0 && days <= 30;
  const countdown = days === 0 ? "Today" : `${days}d`;
  return (
    <Link className="person-gallery-card" to={`/people/${p.id}`}>
      <span className="person-gallery-image">
        <PersonAvatar person={p} className="person-gallery-portrait" />
        {comingSoon && (
          <span className="person-birthday-countdown"
            aria-label={days === 0 ? "Birthday today" : `Birthday in ${days} days`}
            title={days === 0 ? "Birthday today" : `Birthday in ${days} days`}>
            <Cake size={12} aria-hidden="true"/>
            <span>{countdown}</span>
          </span>
        )}
      </span>
      <span className="person-gallery-info">
        <strong>{p.name}</strong>
        <span className="person-gallery-birthday">
          <Cake size={13} aria-hidden="true"/>
          <span>{birthday || "Date not set"}</span>
        </span>
      </span>
    </Link>
  );
}
export function IdeaRow({ idea: i }: { idea: Idea }) {
  const { data, openEditor } = useApp();
  return (
    <button
      className="idea-list-item"
      onClick={() => openEditor({ type: "idea", id: i.id })}
    >
      <span className="item-photo">
        <Photo src={i.image} />
      </span>
      <span className="item-body">
        <strong>{i.name}</strong>
        <small>
          {data.people.find((p) => p.id === i.personId)?.name || "Anyone"} ·{" "}
          {currency(i.price)} · Saved idea
        </small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
export function AddGift({
  eventId,
  personId,
}: {
  eventId?: string;
  personId?: string;
}) {
  const { openEditor } = useApp();
  return (
    <button
      className="section-link"
      onClick={() => openEditor({ type: "gift", eventId, personId })}
    >
      <Plus size={16} />
      Add gift
    </button>
  );
}
