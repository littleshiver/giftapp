import { Link, NavLink } from "react-router-dom";
import {
  House,
  CalendarDays,
  UsersRound,
  Sparkles,
  Settings,
  ChevronRight,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Event, Gift, Person } from "../domain/models";
import { useApp } from "../state/AppState";
import { currency, fmtDate, parseDate } from "../utils/format";
import { giftsFor } from "../domain/selectors";
export function Navigation() {
  return (
    <div className="bottom">
      <nav className="nav" aria-label="Primary">
        {[
          ["/", "Home", House],
          ["/events", "Events", CalendarDays],
          ["/people", "People", UsersRound],
          ["/ideas", "Ideas", Sparkles],
        ].map(([to, label, Icon]) => (
          <NavLink
            key={String(to)}
            to={String(to)}
            end={to === "/"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon size={21} />
            {String(label)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function Profile() {
  return (
    <Link className="avatar" to="/settings" aria-label="Settings">
      <Settings size={22} />
    </Link>
  );
}
export function Title({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="top">
      <div>
        <div className="smallcaps">GIVVY / YOUR GIFT SPACE</div>
        <h1 className="page-title">{name}</h1>
        <div className="sub">{subtitle}</div>
      </div>
      <Profile />
    </div>
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
    <div className="sectionhead">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
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
      className="linkbtn"
      onClick={() => openEditor({ type: "gift", eventId, personId })}
    >
      <Plus size={13} /> Add gift
    </button>
  );
}
export function EventRow({ event: e }: { event: Event }) {
  const { data } = useApp();
  return (
    <Link className="eventrow" to={`/events/${e.id}`}>
      <div className="datebox">
        <b>{parseDate(e.date).getDate()}</b>
        <span>
          {parseDate(e.date).toLocaleDateString("en-US", { month: "short" })}
        </span>
      </div>
      <div className="detail">
        <b>
          {e.name} {e.demo && <span className="tag">Demo</span>}
        </b>
        <p>
          {e.people.length} recipients · {giftsFor(data, e.id).length} gifts ·{" "}
          {currency(Object.values(e.budgets).reduce((n, v) => n + v, 0))} budget
        </p>
      </div>
      <ChevronRight size={17} />
    </Link>
  );
}
export function PersonRow({ person: p }: { person: Person }) {
  const { data } = useApp();
  return (
    <Link className="friend" to={`/people/${p.id}`}>
      <div className="face">{p.name[0]}</div>
      <div className="fbody">
        <b>{p.name}</b>
        <p>
          {p.birthday ? fmtDate(p.birthday) : "Birthday not set"} ·{" "}
          {giftsFor(data, undefined, p.id).length} ideas
        </p>
      </div>
      <ChevronRight size={17} />
    </Link>
  );
}
export function GiftRow({ gift: g }: { gift: Gift }) {
  const { data, openEditor } = useApp();
  return (
    <button
      className="gift"
      onClick={() => openEditor({ type: "gift", id: g.id })}
    >
      <div className="giftpic">
        {g.image ? <img src={g.image} alt="" /> : "🎁"}
      </div>
      <div className="giftinfo">
        <b>{g.name}</b>
        <p>
          {data.people.find((p) => p.id === g.personId)?.name || "No person"} ·{" "}
          {data.events.find((e) => e.id === g.eventId)?.name || "No event"} ·{" "}
          {g.status}
        </p>
      </div>
      <span className="giftprice">{currency(g.price)}</span>
      <ChevronRight size={15} />
    </button>
  );
}
export function GiftList({ gifts }: { gifts: Gift[] }) {
  return (
    <div className="card">
      {gifts.length ? (
        gifts.map((g) => <GiftRow gift={g} key={g.id} />)
      ) : (
        <Empty>No gifts yet. Save your first idea!</Empty>
      )}
    </div>
  );
}
