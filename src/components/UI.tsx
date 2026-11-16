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
  Clock,
  Check,
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
  const { openEditor, ui } = useApp(),
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
                const eventId = location.pathname.startsWith("/events/")
                  ? location.pathname.split("/")[2]
                  : location.pathname === "/"
                    ? ui.selectedEvent
                    : undefined;
                openEditor({
                  type: type as "idea" | "gift" | "event" | "person",
                  eventId,
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
    <header className="page-heading">
      <div>
        <div className="overline">
          {back ? (
            <Link className="ghostbutton back-link" to={back}>
              <ChevronLeft size={15} />
              Back
            </Link>
          ) : (
            "GIVVY"
          )}
        </div>
        <h1 className="title-xl">{name}</h1>
        {subtitle && <p className="subheading">{subtitle}</p>}
      </div>
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
export function StatusTag({ status }: { status: Gift["status"] }) {
  return (
    <span className={`status-tag ${status === "bought" ? "bought" : "to-buy"}`}>
      {status === "bought" ? <Check size={12} /> : <Clock size={12} />}{" "}
      {status === "bought" ? "Bought" : "To buy"}
    </span>
  );
}
export function Product({
  item,
  person = false,
  home = false,
  onClick,
}: {
  item: Gift | Idea;
  person?: boolean;
  home?: boolean;
  onClick?: () => void;
}) {
  const { data } = useApp();
  const content = (
    <>
      <span
        className="product-visual"
        style={{ background: gradientFor(item.name) }}
      >
        <Photo src={item.image} name={item.name} />
        {"status" in item &&
          (home
            ? (item.status === "bought" && (
                <span className="bought-corner" role="img" aria-label="Purchased">
                  <Check size={26} strokeWidth={3.4} />
                </span>
              ))
            : <StatusTag status={(item as Gift).status} />)}
      </span>
      {!home && (
        <>
          <span className="product-title">{item.name}</span>
          <span className="product-caption">
            {person
              ? `For ${data.people.find((p) => p.id === item.personId)?.name || "Someone"}`
              : currency(item.price)}
          </span>
        </>
      )}
    </>
  );
  return (
    <div className={`product-card ${home ? "home-product" : ""}`}>
      {onClick ? (
        <button
          type="button"
          className="product-open"
          aria-label={`${home ? "Open gift" : "Edit"} ${item.name}`}
          onClick={onClick}
        >
          {content}
        </button>
      ) : (
        <div className="product-open">{content}</div>
      )}
    </div>
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
export function PersonRow({
  person: p,
  index = 0,
}: {
  person: Person;
  index?: number;
}) {
  const { data } = useApp();
  return (
    <Link className="person-list-item" to={`/people/${p.id}`}>
      <span
        className="item-photo item-avatar"
        style={{
          background: ["var(--blue)", "var(--mint)", "var(--rose)"][index % 3],
        }}
      >
        {p.name[0]?.toUpperCase()}
      </span>
      <span className="item-body">
        <strong>{p.name}</strong>
        <small>
          {p.birthday
            ? "Birthday · " + fmtDate(p.birthday)
            : "Birthday not set"}{" "}
          · {data.ideas.filter((i) => i.personId === p.id).length} saved ideas
        </small>
      </span>
      <ChevronRight size={19} />
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
